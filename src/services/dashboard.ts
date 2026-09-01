import { customersService } from '@/services/customers'
import { meterReadingsService } from '@/services/meterReadings'
import { invoicesService } from '@/services/invoices'
import { paymentsService } from '@/services/payments'
import { connectionsService } from '@/services/connections'
import { monthKey } from '@/utils/dateRange'
import type { DateRange } from '@/utils/dateRange'
import type { Customer, Payment } from '@/types/models'

export interface DashboardStats {
  totalClientes: number
  clientesAtivos: number
  novasLigacoes: number
  totalFaturado: number
  totalRecebido: number
  totalEmDivida: number
  faturasPendentes: number
  faturasVencidas: number
  consumoTotal: number
  consumoDoMes: number
  pagamentosRecentes: Payment[]
  clientesComMaisDivida: Customer[]
  evolucaoConsumoMensal: { mes: string; valor: number }[]
  evolucaoFaturacaoMensal: { mes: string; valor: number }[]
}

function ultimosNMeses(n: number): string[] {
  const chaves: string[] = []
  const agora = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    chaves.push(monthKey(d.getTime()))
  }
  return chaves
}

export async function obterEstatisticasDashboard(periodo: DateRange): Promise<DashboardStats> {
  const [clientes, leiturasTodas, faturas, pagamentos, ligacoes] = await Promise.all([
    customersService.listar(),
    meterReadingsService.listar(),
    invoicesService.listar(),
    paymentsService.listar(),
    connectionsService.listar(),
  ])
  // Exclui leituras do contador da fonte (sem cliente associado) — não são consumo faturável.
  const leituras = leiturasTodas.filter((r) => r.clienteId)

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime()

  const faturasNoPeriodo = faturas.filter((f) => f.dataEmissao >= periodo.inicio && f.dataEmissao <= periodo.fim)
  const pagamentosNoPeriodo = pagamentos.filter((p) => p.data >= periodo.inicio && p.data <= periodo.fim)
  const ligacoesNoPeriodo = ligacoes.filter((l) => l.dataPedido >= periodo.inicio && l.dataPedido <= periodo.fim)

  const meses = ultimosNMeses(6)
  const consumoPorMes = new Map(meses.map((m) => [m, 0]))
  for (const leitura of leituras) {
    const chave = monthKey(leitura.data)
    if (consumoPorMes.has(chave)) {
      consumoPorMes.set(chave, (consumoPorMes.get(chave) ?? 0) + leitura.consumo)
    }
  }

  const faturacaoPorMes = new Map(meses.map((m) => [m, 0]))
  for (const fatura of faturas) {
    const chave = monthKey(fatura.dataEmissao)
    if (faturacaoPorMes.has(chave)) {
      faturacaoPorMes.set(chave, (faturacaoPorMes.get(chave) ?? 0) + fatura.total)
    }
  }

  return {
    totalClientes: clientes.length,
    clientesAtivos: clientes.filter((c) => c.estado === 'ativo').length,
    novasLigacoes: ligacoesNoPeriodo.length,
    totalFaturado: faturasNoPeriodo.reduce((soma, f) => soma + f.total, 0),
    totalRecebido: pagamentosNoPeriodo.reduce((soma, p) => soma + p.valor, 0),
    totalEmDivida: clientes.reduce((soma, c) => soma + Math.max(0, c.saldoAtual), 0),
    faturasPendentes: faturas.filter((f) => f.estado === 'pendente' || f.estado === 'emitida').length,
    faturasVencidas: faturas.filter((f) => f.estado === 'vencida').length,
    consumoTotal: leituras.reduce((soma, r) => soma + r.consumo, 0),
    consumoDoMes: leituras.filter((r) => r.data >= inicioMes).reduce((soma, r) => soma + r.consumo, 0),
    pagamentosRecentes: [...pagamentos].sort((a, b) => b.data - a.data).slice(0, 5),
    clientesComMaisDivida: [...clientes]
      .filter((c) => c.saldoAtual > 0)
      .sort((a, b) => b.saldoAtual - a.saldoAtual)
      .slice(0, 5),
    evolucaoConsumoMensal: meses.map((m) => ({ mes: m, valor: consumoPorMes.get(m) ?? 0 })),
    evolucaoFaturacaoMensal: meses.map((m) => ({ mes: m, valor: faturacaoPorMes.get(m) ?? 0 })),
  }
}
