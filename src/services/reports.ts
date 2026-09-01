import { where } from 'firebase/firestore'
import { customersService } from '@/services/customers'
import { connectionsService } from '@/services/connections'
import { meterReadingsService } from '@/services/meterReadings'
import { metersService } from '@/services/meters'
import { invoicesService } from '@/services/invoices'
import { paymentsService } from '@/services/payments'
import { receiptsService } from '@/services/receipts'
import { financialTransactionsService } from '@/services/financialTransactions'
import { obterContasAReceber } from '@/services/debts'
import { estadoEfetivoFatura, ESTADO_FATURA_LABEL } from '@/utils/invoiceStatus'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency, formatNumber } from '@/utils/currency'
import { tipoContador } from '@/utils/meterKind'
import { round2 } from '@/utils/calculations'
import type { DateRange } from '@/utils/dateRange'
import type { Customer, FinancialTransaction } from '@/types/models'

export type ReportId =
  | 'faturacao_periodo'
  | 'pagamentos_periodo'
  | 'dividas'
  | 'consumo_cliente'
  | 'consumo_zona'
  | 'consumo_mensal'
  | 'clientes_ativos'
  | 'novas_ligacoes'
  | 'leituras_realizadas'
  | 'leituras_pendentes'
  | 'faturas_vencidas'
  | 'recibos_emitidos'
  | 'extrato_conta_corrente'
  | 'reconciliacao_perdas'

export interface ReportResult {
  titulo: string
  colunas: string[]
  linhas: (string | number)[][]
  /** Só presente para o relatório "Extrato de Conta Corrente" — dados estruturados usados pela
   * exportação em PDF dedicada (formato de extracto de conta contabilístico). */
  extratoContaCorrente?: ExtratoContaCorrente
}

export interface MovimentoExtrato {
  data: number
  descricao: string
  debito: number
  credito: number
  saldo: number
  tipoDoc: string
  numeroDoc: string
}

export interface ExtratoContaCorrente {
  cliente: Customer
  periodoInicio: number
  periodoFim: number
  debitoAnterior: number
  creditoAnterior: number
  saldoAnterior: number
  movimentos: MovimentoExtrato[]
  totalDebitoPeriodo: number
  totalCreditoPeriodo: number
  saldoFinal: number
}

/** Sufixo D (Devedor — o cliente deve) / C (Credor — o cliente tem crédito), tal como num
 * extracto de conta corrente contabilístico tradicional. */
export function sufixoDC(valor: number): string {
  if (valor > 0.005) return 'D'
  if (valor < -0.005) return 'C'
  return ''
}

/** Monta o extrato de conta corrente de um cliente para um período: saldo/débito/crédito
 * acumulados antes do período (linha "Saldo anterior"), os movimentos dentro do período (faturas
 * = débito, pagamentos = crédito) e os totais do período — a partir do livro-razão em
 * `financialTransactions`, a mesma fonte usada na aba "Financeiro" do cliente. */
export async function gerarExtratoContaCorrente(clienteId: string, periodo: DateRange): Promise<ExtratoContaCorrente | null> {
  const [cliente, transacoes, faturas, recibos] = await Promise.all([
    customersService.obter(clienteId),
    financialTransactionsService.listar(where('clienteId', '==', clienteId)),
    invoicesService.listar(),
    receiptsService.listar(),
  ])
  if (!cliente) return null

  // Faturas apagadas (só possível já canceladas — ver invoicesStore.apagar) deixam de existir na
  // coleção `invoices`, mas a descrição do movimento já guardou o número na altura ("Fatura
  // FACT.-2026-000001"), por isso serve de reserva para não mostrar o ID interno do Firestore.
  const numeroFatura = (t: FinancialTransaction) =>
    faturas.find((f) => f.id === t.origemId)?.numero ?? t.descricao.replace(/^Fatura\s+/, '')
  const numeroRecibo = (pagamentoId: string) => recibos.find((r) => r.pagamentoId === pagamentoId)?.numero ?? '—'
  const TIPO_DOC_LABEL: Record<string, string> = { fatura: 'Factura', pagamento: 'Recibo', ajuste: 'Ajuste' }

  const ordenadas = [...transacoes].sort((a, b) => a.data - b.data)
  const antes = ordenadas.filter((t) => t.data < periodo.inicio)
  const noPeriodo = ordenadas.filter((t) => t.data >= periodo.inicio && t.data <= periodo.fim)

  const debitoAnterior = antes.filter((t) => t.tipo === 'debito').reduce((soma, t) => soma + t.valor, 0)
  const creditoAnterior = antes.filter((t) => t.tipo === 'credito').reduce((soma, t) => soma + t.valor, 0)
  const saldoAnterior = antes.length ? antes[antes.length - 1].saldoAposMovimento : 0

  const movimentos: MovimentoExtrato[] = noPeriodo.map((t) => ({
    data: t.data,
    descricao: t.descricao,
    debito: t.tipo === 'debito' ? t.valor : 0,
    credito: t.tipo === 'credito' ? t.valor : 0,
    saldo: t.saldoAposMovimento,
    tipoDoc: TIPO_DOC_LABEL[t.origem] ?? t.origem,
    numeroDoc: t.origem === 'fatura' ? numeroFatura(t) : t.origem === 'pagamento' ? numeroRecibo(t.origemId) : '—',
  }))

  const totalDebitoPeriodo = movimentos.reduce((soma, m) => soma + m.debito, 0)
  const totalCreditoPeriodo = movimentos.reduce((soma, m) => soma + m.credito, 0)
  const saldoFinal = movimentos.length ? movimentos[movimentos.length - 1].saldo : saldoAnterior

  return { cliente, periodoInicio: periodo.inicio, periodoFim: periodo.fim, debitoAnterior, creditoAnterior, saldoAnterior, movimentos, totalDebitoPeriodo, totalCreditoPeriodo, saldoFinal }
}

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

export async function gerarRelatorio(
  id: ReportId,
  periodo: DateRange,
  opcoes: { clienteId?: string } = {},
): Promise<ReportResult> {
  switch (id) {
    case 'faturacao_periodo': {
      const faturas = (await invoicesService.listar()).filter((f) => f.dataEmissao >= periodo.inicio && f.dataEmissao <= periodo.fim)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Faturação por Período',
        colunas: ['Número', 'Cliente', 'Emissão', 'Total', 'Estado'],
        linhas: faturas.map((f) => [f.numero, nome(f.clienteId), formatDate(f.dataEmissao), formatCurrency(f.total), ESTADO_FATURA_LABEL[estadoEfetivoFatura(f)]]),
      }
    }
    case 'pagamentos_periodo': {
      const pagamentos = (await paymentsService.listar()).filter((p) => p.data >= periodo.inicio && p.data <= periodo.fim)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Pagamentos por Período',
        colunas: ['Data', 'Cliente', 'Método', 'Valor'],
        linhas: pagamentos.map((p) => [formatDate(p.data), nome(p.clienteId), METODO_LABEL[p.metodo] ?? p.metodo, formatCurrency(p.valor)]),
      }
    }
    case 'dividas': {
      const dividas = await obterContasAReceber()
      return {
        titulo: 'Dívidas',
        colunas: ['Cliente', 'Zona', 'Faturas em Aberto', 'Dias em Atraso', 'Total em Dívida'],
        linhas: dividas.map((d) => [d.cliente.nome, d.cliente.zona, d.faturasEmAberto, d.diasAtraso, formatCurrency(d.totalDivida)]),
      }
    }
    case 'consumo_cliente': {
      // Exclui leituras do contador da fonte (sem clienteId) — ver relatório "Reconciliação de
      // Perdas de Água" para essas.
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim && r.clienteId)
      const clientes = await customersService.listar()
      const porCliente = new Map<string, number>()
      for (const r of leituras) porCliente.set(r.clienteId!, (porCliente.get(r.clienteId!) ?? 0) + r.consumo)
      return {
        titulo: 'Consumo por Cliente',
        colunas: ['Cliente', 'Código', 'Consumo (m³)'],
        linhas: [...porCliente.entries()]
          .map(([clienteId, consumo]) => {
            const c = clientes.find((c) => c.id === clienteId)
            return [c?.nome ?? '—', c?.codigo ?? '—', formatNumber(consumo, 2)] as (string | number)[]
          })
          .sort((a, b) => Number(b[2]) - Number(a[2])),
      }
    }
    case 'consumo_zona': {
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim && r.clienteId)
      const clientes = await customersService.listar()
      const porZona = new Map<string, number>()
      for (const r of leituras) {
        const zona = clientes.find((c) => c.id === r.clienteId)?.zona ?? 'Desconhecida'
        porZona.set(zona, (porZona.get(zona) ?? 0) + r.consumo)
      }
      return {
        titulo: 'Consumo por Zona',
        colunas: ['Zona', 'Consumo (m³)'],
        linhas: [...porZona.entries()].map(([zona, consumo]) => [zona, formatNumber(consumo, 2)]).sort((a, b) => Number(b[1]) - Number(a[1])),
      }
    }
    case 'consumo_mensal': {
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim && r.clienteId)
      const porMes = new Map<string, number>()
      for (const r of leituras) {
        const d = new Date(r.data)
        const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        porMes.set(chave, (porMes.get(chave) ?? 0) + r.consumo)
      }
      return {
        titulo: 'Consumo Mensal',
        colunas: ['Mês', 'Consumo (m³)'],
        linhas: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, consumo]) => [mes, formatNumber(consumo, 2)]),
      }
    }
    case 'clientes_ativos': {
      const clientes = (await customersService.listar()).filter((c) => c.estado === 'ativo')
      return {
        titulo: 'Clientes Ativos',
        colunas: ['Código', 'Nome', 'Zona', 'Bairro', 'Tipo'],
        linhas: clientes.map((c) => [c.codigo, c.nome, c.zona, c.bairro, c.tipo]),
      }
    }
    case 'novas_ligacoes': {
      const ligacoes = (await connectionsService.listar()).filter((l) => l.dataPedido >= periodo.inicio && l.dataPedido <= periodo.fim)
      return {
        titulo: 'Novas Ligações',
        colunas: ['Número', 'Solicitante', 'Zona', 'Data', 'Estado'],
        linhas: ligacoes.map((l) => [l.numeroPedido, l.nomeSolicitante, l.zona, formatDate(l.dataPedido), l.estado]),
      }
    }
    case 'leituras_realizadas': {
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim && r.clienteId)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Leituras Realizadas',
        colunas: ['Data', 'Cliente', 'Consumo (m³)', 'Leitor'],
        linhas: leituras.map((r) => [formatDate(r.data), nome(r.clienteId!), formatNumber(r.consumo, 2), r.leitorNome]),
      }
    }
    case 'leituras_pendentes': {
      // Leituras do contador da fonte nunca são faturadas — excluídas por não terem clienteId.
      const leituras = (await meterReadingsService.listar()).filter((r) => !r.faturada && r.clienteId)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Leituras Pendentes de Faturação',
        colunas: ['Data', 'Cliente', 'Consumo (m³)'],
        linhas: leituras.map((r) => [formatDate(r.data), nome(r.clienteId!), formatNumber(r.consumo, 2)]),
      }
    }
    case 'faturas_vencidas': {
      const faturas = (await invoicesService.listar()).filter((f) => estadoEfetivoFatura(f) === 'vencida')
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Faturas Vencidas',
        colunas: ['Número', 'Cliente', 'Vencimento', 'Total', 'Pago'],
        linhas: faturas.map((f) => [f.numero, nome(f.clienteId), formatDate(f.dataVencimento), formatCurrency(f.total), formatCurrency(f.totalPago)]),
      }
    }
    case 'recibos_emitidos': {
      const recibos = (await receiptsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Recibos Emitidos',
        colunas: ['Número', 'Cliente', 'Data', 'Valor'],
        linhas: recibos.map((r) => [r.numero, nome(r.clienteId), formatDate(r.data), formatCurrency(r.valorRecebido)]),
      }
    }
    case 'extrato_conta_corrente': {
      if (!opcoes.clienteId) {
        return { titulo: 'Extrato de Conta Corrente', colunas: [], linhas: [] }
      }
      const extrato = await gerarExtratoContaCorrente(opcoes.clienteId, periodo)
      if (!extrato) {
        return { titulo: 'Extrato de Conta Corrente', colunas: [], linhas: [] }
      }
      const saldo = (v: number) => `${formatNumber(Math.abs(v))}${sufixoDC(v)}`
      return {
        titulo: `Extracto de Conta ${extrato.cliente.codigo} (${formatDate(extrato.periodoInicio)} até ${formatDate(extrato.periodoFim)})`,
        colunas: ['Data', 'Descrição', 'Débito', 'Crédito', 'Saldo', 'Doc.', 'N.º Doc.'],
        linhas: [
          ['', 'Saldo anterior', formatNumber(extrato.debitoAnterior), formatNumber(extrato.creditoAnterior), saldo(extrato.saldoAnterior), '', ''],
          ...extrato.movimentos.map((m) => [
            formatDate(m.data),
            m.descricao,
            m.debito ? formatNumber(m.debito) : '',
            m.credito ? formatNumber(m.credito) : '',
            saldo(m.saldo),
            m.tipoDoc,
            m.numeroDoc,
          ]),
          ['', 'Total do Período', formatNumber(extrato.totalDebitoPeriodo), formatNumber(extrato.totalCreditoPeriodo), saldo(extrato.saldoFinal), '', ''],
        ],
        extratoContaCorrente: extrato,
      }
    }
    case 'reconciliacao_perdas': {
      const [leituras, contadores] = await Promise.all([meterReadingsService.listar(), metersService.listar()])
      const leiturasNoPeriodo = leituras.filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
      const idsFonte = new Set(contadores.filter((m) => tipoContador(m) === 'fonte').map((m) => m.id))

      const totalFonte = round2(leiturasNoPeriodo.filter((r) => idsFonte.has(r.contadorId)).reduce((soma, r) => soma + r.consumo, 0))
      const totalClientes = round2(leiturasNoPeriodo.filter((r) => r.clienteId).reduce((soma, r) => soma + r.consumo, 0))
      const perdas = round2(totalFonte - totalClientes)
      const percentagemPerdas = totalFonte > 0 ? round2((perdas / totalFonte) * 100) : 0

      const linhas: (string | number)[][] = [
        ['Total saído da fonte', `${formatNumber(totalFonte)} m³`],
        ['Total consumido pelos clientes', `${formatNumber(totalClientes)} m³`],
        ['Perdas de água (não faturada)', `${formatNumber(perdas)} m³`],
        ['Percentagem de perdas', `${formatNumber(percentagemPerdas)}%`],
      ]
      if (idsFonte.size === 0) {
        linhas.push(['Aviso', 'Não existe nenhum contador da fonte configurado — crie um em Contadores.'])
      } else if (totalFonte === 0) {
        linhas.push(['Aviso', 'Não há leituras do contador da fonte neste período.'])
      }

      return {
        titulo: `Reconciliação de Perdas de Água (${formatDate(periodo.inicio)} a ${formatDate(periodo.fim)})`,
        colunas: ['Indicador', 'Valor'],
        linhas,
      }
    }
  }
}

export const REPORTS: { id: ReportId; label: string; usaPeriodo: boolean; usaCliente?: boolean }[] = [
  { id: 'faturacao_periodo', label: 'Faturação por Período', usaPeriodo: true },
  { id: 'pagamentos_periodo', label: 'Pagamentos por Período', usaPeriodo: true },
  { id: 'dividas', label: 'Dívidas', usaPeriodo: false },
  { id: 'consumo_cliente', label: 'Consumo por Cliente', usaPeriodo: true },
  { id: 'consumo_zona', label: 'Consumo por Zona', usaPeriodo: true },
  { id: 'consumo_mensal', label: 'Consumo Mensal', usaPeriodo: true },
  { id: 'clientes_ativos', label: 'Clientes Ativos', usaPeriodo: false },
  { id: 'novas_ligacoes', label: 'Novas Ligações', usaPeriodo: true },
  { id: 'leituras_realizadas', label: 'Leituras Realizadas', usaPeriodo: true },
  { id: 'leituras_pendentes', label: 'Leituras Pendentes', usaPeriodo: false },
  { id: 'faturas_vencidas', label: 'Faturas Vencidas', usaPeriodo: false },
  { id: 'recibos_emitidos', label: 'Recibos Emitidos', usaPeriodo: true },
  { id: 'extrato_conta_corrente', label: 'Extrato de Conta Corrente', usaPeriodo: true, usaCliente: true },
  { id: 'reconciliacao_perdas', label: 'Reconciliação de Perdas de Água', usaPeriodo: true },
]
