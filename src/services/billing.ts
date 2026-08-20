import { doc, getDoc, limit, orderBy, where, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { meterReadingsService } from '@/services/meterReadings'
import { customersService } from '@/services/customers'
import { metersService } from '@/services/meters'
import { obterTarifaAtiva } from '@/services/tariffs'
import { invoicesService } from '@/services/invoices'
import { financialTransactionsService } from '@/services/financialTransactions'
import { gerarNumeroSequencial } from '@/services/numbering'
import { registarAuditoria } from '@/services/auditLog'
import { calcularFatura, round2 } from '@/utils/calculations'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { Invoice, MeterReading } from '@/types/models'

interface AuthContext {
  uid: string
  nome: string
}

async function obterPeriodoParaLeitura(leitura: MeterReading): Promise<{ inicio: number; fim: number }> {
  const anteriores = await meterReadingsService.listar(
    where('contadorId', '==', leitura.contadorId),
    orderBy('data', 'desc'),
    limit(10),
  )
  const anterior = anteriores.find((r) => r.id !== leitura.id && r.data < leitura.data)
  if (anterior) return { inicio: anterior.data, fim: leitura.data }

  const contador = await metersService.obter(leitura.contadorId)
  return { inicio: contador?.dataInstalacao ?? leitura.data, fim: leitura.data }
}

/**
 * Gera uma fatura a partir de uma leitura por faturar, usando a tarifa ativa. A operação é
 * atómica: cria a fatura, marca a leitura como faturada, regista o movimento financeiro (débito)
 * e atualiza o saldo do cliente numa única escrita em lote.
 */
export async function gerarFaturaParaLeitura(
  leituraId: string,
  autor: AuthContext,
  diasVencimento: number,
  prefixoFatura: string,
): Promise<string> {
  const leitura = await meterReadingsService.obter(leituraId)
  if (!leitura) throw new Error('Leitura não encontrada.')
  if (leitura.faturada) throw new Error('Esta leitura já foi faturada.')

  const cliente = await customersService.obter(leitura.clienteId)
  if (!cliente) throw new Error('Cliente não encontrado.')

  const tarifa = await obterTarifaAtiva()
  if (!tarifa) throw new Error('Não existe nenhuma tarifa ativa. Configure uma tarifa antes de faturar.')

  const periodo = await obterPeriodoParaLeitura(leitura)
  const { linhas, subtotal, impostoValor, total } = calcularFatura(leitura.consumo, tarifa)

  const numero = await gerarNumeroSequencial('invoice', prefixoFatura)
  const agora = Date.now()
  const novoSaldo = round2(cliente.saldoAtual + total)

  const invoiceRef = doc(invoicesService.colRef)
  const ftRef = doc(financialTransactionsService.colRef)

  const invoiceData: Omit<Invoice, 'id'> = {
    numero,
    clienteId: leitura.clienteId,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    leituraId: leitura.id,
    leituraAnterior: leitura.leituraAnterior,
    leituraAtual: leitura.leituraAtual,
    consumo: leitura.consumo,
    tarifaId: tarifa.id,
    tarifaSnapshot: {
      escaloes: tarifa.escaloes,
      taxaFixa: tarifa.taxaFixa,
      taxaManutencao: tarifa.taxaManutencao,
      outrasTaxas: tarifa.outrasTaxas,
      impostoPercentagem: tarifa.impostoPercentagem,
    },
    linhas,
    subtotal,
    impostoValor,
    total,
    totalPago: 0,
    dataEmissao: agora,
    dataVencimento: agora + diasVencimento * 24 * 60 * 60 * 1000,
    estado: 'emitida',
    criadoPor: autor.uid,
    criadoEm: agora,
    atualizadoEm: agora,
  }

  const batch = writeBatch(db)
  batch.set(invoiceRef, removerUndefined(invoiceData))
  batch.update(doc(db, 'meterReadings', leitura.id), { faturada: true, atualizadoEm: agora })
  batch.set(
    ftRef,
    removerUndefined({
      clienteId: leitura.clienteId,
      tipo: 'debito',
      origem: 'fatura',
      origemId: invoiceRef.id,
      descricao: `Fatura ${numero}`,
      valor: total,
      saldoAposMovimento: novoSaldo,
      data: agora,
      criadoEm: agora,
    }),
  )
  batch.update(doc(db, 'customers', leitura.clienteId), { saldoAtual: novoSaldo, atualizadoEm: agora })

  await batch.commit()

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'criar',
    coleccao: 'invoices',
    documentoId: invoiceRef.id,
    valorNovo: invoiceData,
  })

  return invoiceRef.id
}

/** Lista as leituras ainda não faturadas (usadas para faturação individual ou em massa). */
export async function listarLeiturasPorFaturar(clienteId?: string): Promise<MeterReading[]> {
  const constraints = clienteId
    ? [where('clienteId', '==', clienteId), where('faturada', '==', false)]
    : [where('faturada', '==', false)]
  return meterReadingsService.listar(...constraints)
}

export async function gerarFaturasEmMassa(
  leituraIds: string[],
  autor: AuthContext,
  diasVencimento: number,
  prefixoFatura: string,
): Promise<{ sucesso: string[]; falhas: { leituraId: string; erro: string }[] }> {
  const sucesso: string[] = []
  const falhas: { leituraId: string; erro: string }[] = []

  for (const leituraId of leituraIds) {
    try {
      const invoiceId = await gerarFaturaParaLeitura(leituraId, autor, diasVencimento, prefixoFatura)
      sucesso.push(invoiceId)
    } catch (e) {
      falhas.push({ leituraId, erro: e instanceof Error ? e.message : 'Erro desconhecido.' })
    }
  }

  return { sucesso, falhas }
}

export async function cancelarFatura(faturaId: string, autor: AuthContext): Promise<void> {
  const fatura = await getDoc(doc(db, 'invoices', faturaId))
  if (!fatura.exists()) throw new Error('Fatura não encontrada.')
  const dados = fatura.data() as Invoice

  if (dados.totalPago > 0) {
    throw new Error('Não é possível cancelar uma fatura com pagamentos associados.')
  }

  const cliente = await customersService.obter(dados.clienteId)
  const novoSaldo = round2((cliente?.saldoAtual ?? 0) - dados.total)
  const agora = Date.now()

  const batch = writeBatch(db)
  batch.update(doc(db, 'invoices', faturaId), { estado: 'cancelada', atualizadoEm: agora })
  batch.update(doc(db, 'customers', dados.clienteId), { saldoAtual: novoSaldo, atualizadoEm: agora })
  if (dados.leituraId) {
    batch.update(doc(db, 'meterReadings', dados.leituraId), { faturada: false, atualizadoEm: agora })
  }
  await batch.commit()

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'atualizar',
    coleccao: 'invoices',
    documentoId: faturaId,
    valorAnterior: dados,
    valorNovo: { ...dados, estado: 'cancelada' },
  })
}
