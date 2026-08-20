import { doc, where, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { invoicesService } from '@/services/invoices'
import { customersService } from '@/services/customers'
import { paymentsService } from '@/services/payments'
import { financialTransactionsService } from '@/services/financialTransactions'
import { gerarNumeroSequencial } from '@/services/numbering'
import { registarAuditoria } from '@/services/auditLog'
import { round2 } from '@/utils/calculations'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { Payment, PaymentMethod, Receipt } from '@/types/models'

interface AuthContext {
  uid: string
  nome: string
}

interface RegistarPagamentoParams {
  clienteId: string
  valor: number
  metodo: PaymentMethod
  referencia?: string
  observacoes?: string
}

/**
 * Regista um pagamento, aplicando-o às faturas em aberto do cliente por ordem de vencimento
 * (mais antiga primeiro), atualiza o saldo do cliente e emite automaticamente o recibo.
 * Tudo numa única escrita em lote atómica.
 */
export async function registarPagamentoCompleto(
  params: RegistarPagamentoParams,
  autor: AuthContext,
  prefixoRecibo: string,
): Promise<{ paymentId: string; receiptId: string }> {
  if (params.valor <= 0) throw new Error('O valor do pagamento deve ser maior que zero.')

  const cliente = await customersService.obter(params.clienteId)
  if (!cliente) throw new Error('Cliente não encontrado.')

  const faturasEmAberto = await invoicesService.listar(
    where('clienteId', '==', params.clienteId),
    where('estado', 'in', ['emitida', 'pendente', 'parcialmente_paga', 'vencida']),
  )
  faturasEmAberto.sort((a, b) => a.dataVencimento - b.dataVencimento)

  let restante = params.valor
  const faturaIds: string[] = []
  const atualizacoesFatura: { id: string; totalPago: number; estado: 'paga' | 'parcialmente_paga' }[] = []

  for (const fatura of faturasEmAberto) {
    if (restante <= 0) break
    const emDivida = round2(fatura.total - fatura.totalPago)
    if (emDivida <= 0) continue
    const aplicar = Math.min(emDivida, restante)
    const novoTotalPago = round2(fatura.totalPago + aplicar)
    atualizacoesFatura.push({
      id: fatura.id,
      totalPago: novoTotalPago,
      estado: novoTotalPago >= fatura.total ? 'paga' : 'parcialmente_paga',
    })
    faturaIds.push(fatura.id)
    restante = round2(restante - aplicar)
  }

  const agora = Date.now()
  const novoSaldo = round2(cliente.saldoAtual - params.valor)

  const numeroRecibo = await gerarNumeroSequencial('receipt', prefixoRecibo)

  const paymentRef = doc(paymentsService.colRef)
  const receiptRef = doc(db, 'receipts', paymentRef.id)
  const ftRef = doc(financialTransactionsService.colRef)

  const paymentData: Omit<Payment, 'id'> = removerUndefined({
    clienteId: params.clienteId,
    faturaIds,
    data: agora,
    valor: params.valor,
    metodo: params.metodo,
    referencia: params.referencia,
    operadorId: autor.uid,
    operadorNome: autor.nome,
    observacoes: params.observacoes,
    criadoEm: agora,
  })

  const receiptData: Omit<Receipt, 'id'> = {
    numero: numeroRecibo,
    clienteId: params.clienteId,
    pagamentoId: paymentRef.id,
    faturaIds,
    valorRecebido: params.valor,
    metodo: params.metodo,
    data: agora,
    operadorId: autor.uid,
    operadorNome: autor.nome,
    saldoRestante: novoSaldo,
    criadoEm: agora,
  }

  const batch = writeBatch(db)
  batch.set(paymentRef, paymentData)
  batch.set(receiptRef, removerUndefined(receiptData))
  for (const atualizacao of atualizacoesFatura) {
    batch.update(doc(db, 'invoices', atualizacao.id), {
      totalPago: atualizacao.totalPago,
      estado: atualizacao.estado,
      atualizadoEm: agora,
    })
  }
  batch.set(
    ftRef,
    removerUndefined({
      clienteId: params.clienteId,
      tipo: 'credito',
      origem: 'pagamento',
      origemId: paymentRef.id,
      descricao: `Pagamento ${params.metodo}`,
      valor: params.valor,
      saldoAposMovimento: novoSaldo,
      data: agora,
      criadoEm: agora,
    }),
  )
  batch.update(doc(db, 'customers', params.clienteId), { saldoAtual: novoSaldo, atualizadoEm: agora })

  await batch.commit()

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'criar',
    coleccao: 'payments',
    documentoId: paymentRef.id,
    valorNovo: paymentData,
  })

  return { paymentId: paymentRef.id, receiptId: receiptRef.id }
}
