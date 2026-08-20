import { customersService } from '@/services/customers'
import { invoicesService } from '@/services/invoices'
import type { Customer } from '@/types/models'

export interface DividaCliente {
  cliente: Customer
  totalDivida: number
  faturasEmAberto: number
  diasAtraso: number
  dataVencimentoMaisAntiga: number | null
}

const EM_ABERTO = ['emitida', 'pendente', 'parcialmente_paga', 'vencida']

export async function obterContasAReceber(): Promise<DividaCliente[]> {
  const [clientes, faturas] = await Promise.all([customersService.listar(), invoicesService.listar()])

  const agora = Date.now()
  const resultado: DividaCliente[] = []

  for (const cliente of clientes) {
    if (cliente.saldoAtual <= 0) continue

    const faturasCliente = faturas.filter((f) => f.clienteId === cliente.id && EM_ABERTO.includes(f.estado))
    const maisAntiga = faturasCliente.reduce<number | null>((min, f) => (min === null || f.dataVencimento < min ? f.dataVencimento : min), null)

    resultado.push({
      cliente,
      totalDivida: cliente.saldoAtual,
      faturasEmAberto: faturasCliente.length,
      diasAtraso: maisAntiga ? Math.max(0, Math.floor((agora - maisAntiga) / (24 * 60 * 60 * 1000))) : 0,
      dataVencimentoMaisAntiga: maisAntiga,
    })
  }

  return resultado.sort((a, b) => b.totalDivida - a.totalDivida)
}

export function faixaEnvelhecimento(diasAtraso: number): '0-30' | '31-60' | '61-90' | '90+' {
  if (diasAtraso <= 30) return '0-30'
  if (diasAtraso <= 60) return '31-60'
  if (diasAtraso <= 90) return '61-90'
  return '90+'
}
