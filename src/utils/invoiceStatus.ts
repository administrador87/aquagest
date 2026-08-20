import type { Invoice, InvoiceStatus } from '@/types/models'

/** Estado efetivo de uma fatura para efeitos de apresentação/estatísticas: uma fatura
 * emitida/pendente/parcialmente paga cuja data de vencimento já passou é tratada como
 * "vencida" sem ser necessário atualizar o documento (evita depender de um job agendado). */
export function estadoEfetivoFatura(fatura: Pick<Invoice, 'estado' | 'dataVencimento'>): InvoiceStatus {
  const emAberto: InvoiceStatus[] = ['emitida', 'pendente', 'parcialmente_paga']
  if (emAberto.includes(fatura.estado) && fatura.dataVencimento < Date.now()) {
    return 'vencida'
  }
  return fatura.estado
}

export const ESTADO_FATURA_LABEL: Record<InvoiceStatus, string> = {
  rascunho: 'Rascunho',
  emitida: 'Emitida',
  paga: 'Paga',
  parcialmente_paga: 'Parcialmente Paga',
  pendente: 'Pendente',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

export const ESTADO_FATURA_TONE: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  rascunho: 'muted',
  emitida: 'default',
  paga: 'success',
  parcialmente_paga: 'warning',
  pendente: 'warning',
  vencida: 'destructive',
  cancelada: 'muted',
}
