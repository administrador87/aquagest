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
import type { Invoice, InvoiceMeterDetail, MeterReading } from '@/types/models'

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
 * Gera uma fatura a partir de uma ou mais leituras por faturar do mesmo cliente, usando a tarifa
 * ativa. Com várias leituras (ex: troca de contador), os m³ somam-se e os escalões aplicam-se ao total. A operação é atómica: cria a fatura, marca as leituras
 * como faturadas, regista o movimento financeiro (débito) e atualiza o saldo do cliente numa
 * única escrita em lote.
 */
export async function gerarFaturaParaLeituras(
  leituraIds: string[],
  autor: AuthContext,
  diasVencimento: number,
  prefixoFatura: string,
): Promise<string> {
  const idsUnicos = [...new Set(leituraIds)]
  if (idsUnicos.length === 0) throw new Error('Selecione pelo menos uma leitura.')

  const leituras: MeterReading[] = []
  for (const id of idsUnicos) {
    const leitura = await meterReadingsService.obter(id)
    if (!leitura) throw new Error('Leitura não encontrada.')
    if (leitura.faturada) throw new Error('Uma das leituras já foi faturada.')
    if (!leitura.clienteId) throw new Error('Esta leitura é do contador da fonte e não pode ser faturada.')
    leituras.push(leitura)
  }

  const clienteId = leituras[0].clienteId!
  if (leituras.some((l) => l.clienteId !== clienteId)) {
    throw new Error('Só é possível juntar leituras do mesmo cliente na mesma fatura.')
  }

  const cliente = await customersService.obter(clienteId)
  if (!cliente) throw new Error('Cliente não encontrado.')

  const tarifa = await obterTarifaAtiva()
  if (!tarifa) throw new Error('Não existe nenhuma tarifa ativa. Configure uma tarifa antes de faturar.')

  const periodos = await Promise.all(leituras.map((l) => obterPeriodoParaLeitura(l)))
  const periodo = {
    inicio: Math.min(...periodos.map((p) => p.inicio)),
    fim: Math.max(...periodos.map((p) => p.fim)),
  }

  const principal = leituras[0]
  const leituraUnica = leituras.length === 1
  const consumoTotal = round2(leituras.reduce((soma, l) => soma + l.consumo, 0))

  // Várias leituras do mesmo cliente (ex: troca de contador a meio do período): os m³ somam-se e
  // os escalões da tarifa aplicam-se uma só vez ao total, como se fosse um único contador.
  const { linhas, subtotal, impostoValor, total } = calcularFatura(consumoTotal, tarifa)

  let contadores: InvoiceMeterDetail[] | undefined
  if (!leituraUnica) {
    const numeros = await Promise.all(
      leituras.map(async (l) => (await metersService.obter(l.contadorId))?.numero ?? l.contadorId),
    )
    contadores = leituras.map((l, i) => ({
      contadorId: l.contadorId,
      numeroContador: numeros[i],
      leituraAnterior: l.leituraAnterior,
      leituraAtual: l.leituraAtual,
      consumo: l.consumo,
    }))
  }

  const numero = await gerarNumeroSequencial('invoice', prefixoFatura)
  const agora = Date.now()
  const novoSaldo = round2(cliente.saldoAtual + total)

  const invoiceRef = doc(invoicesService.colRef)
  const ftRef = doc(financialTransactionsService.colRef)

  const invoiceData: Omit<Invoice, 'id'> = {
    numero,
    clienteId,
    periodoInicio: periodo.inicio,
    periodoFim: periodo.fim,
    leituraId: principal.id,
    leituraIds: leituraUnica ? undefined : leituras.map((l) => l.id),
    contadores,
    leituraAnterior: principal.leituraAnterior,
    leituraAtual: principal.leituraAtual,
    consumo: consumoTotal,
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
  for (const leitura of leituras) {
    batch.update(doc(db, 'meterReadings', leitura.id), { faturada: true, atualizadoEm: agora })
  }
  batch.set(
    ftRef,
    removerUndefined({
      clienteId,
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
  batch.update(doc(db, 'customers', clienteId), { saldoAtual: novoSaldo, atualizadoEm: agora })

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

/** Fatura uma única leitura (caso mais comum, e faturação em massa). */
export function gerarFaturaParaLeitura(
  leituraId: string,
  autor: AuthContext,
  diasVencimento: number,
  prefixoFatura: string,
): Promise<string> {
  return gerarFaturaParaLeituras([leituraId], autor, diasVencimento, prefixoFatura)
}

/** Lista as leituras ainda não faturadas (usadas para faturação individual ou em massa). */
export async function listarLeiturasPorFaturar(clienteId?: string): Promise<MeterReading[]> {
  const constraints = clienteId
    ? [where('clienteId', '==', clienteId), where('faturada', '==', false)]
    : [where('faturada', '==', false)]
  const leituras = await meterReadingsService.listar(...constraints)
  // O contador da fonte (sem cliente associado) nunca é faturado — exclui as suas leituras da
  // lista de candidatas, para não tentar gerar uma fatura sem cliente.
  return leituras.filter((r) => r.clienteId)
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
  const leituraIds = dados.leituraIds ?? (dados.leituraId ? [dados.leituraId] : [])
  for (const leituraId of leituraIds) {
    batch.update(doc(db, 'meterReadings', leituraId), { faturada: false, atualizadoEm: agora })
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
