import { where } from 'firebase/firestore'
import { customersService } from '@/services/customers'
import { connectionsService } from '@/services/connections'
import { meterReadingsService } from '@/services/meterReadings'
import { invoicesService } from '@/services/invoices'
import { paymentsService } from '@/services/payments'
import { receiptsService } from '@/services/receipts'
import { financialTransactionsService } from '@/services/financialTransactions'
import { obterContasAReceber } from '@/services/debts'
import { estadoEfetivoFatura, ESTADO_FATURA_LABEL } from '@/utils/invoiceStatus'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency, formatNumber } from '@/utils/currency'
import type { DateRange } from '@/utils/dateRange'
import type { FinancialTransaction } from '@/types/models'

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

export interface ReportResult {
  titulo: string
  colunas: string[]
  linhas: (string | number)[][]
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
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
      const clientes = await customersService.listar()
      const porCliente = new Map<string, number>()
      for (const r of leituras) porCliente.set(r.clienteId, (porCliente.get(r.clienteId) ?? 0) + r.consumo)
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
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
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
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
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
      const leituras = (await meterReadingsService.listar()).filter((r) => r.data >= periodo.inicio && r.data <= periodo.fim)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Leituras Realizadas',
        colunas: ['Data', 'Cliente', 'Consumo (m³)', 'Leitor'],
        linhas: leituras.map((r) => [formatDate(r.data), nome(r.clienteId), formatNumber(r.consumo, 2), r.leitorNome]),
      }
    }
    case 'leituras_pendentes': {
      const leituras = (await meterReadingsService.listar()).filter((r) => !r.faturada)
      const clientes = await customersService.listar()
      const nome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '—'
      return {
        titulo: 'Leituras Pendentes de Faturação',
        colunas: ['Data', 'Cliente', 'Consumo (m³)'],
        linhas: leituras.map((r) => [formatDate(r.data), nome(r.clienteId), formatNumber(r.consumo, 2)]),
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
      const [cliente, transacoes, faturas, recibos] = await Promise.all([
        customersService.obter(opcoes.clienteId),
        financialTransactionsService.listar(where('clienteId', '==', opcoes.clienteId)),
        invoicesService.listar(),
        receiptsService.listar(),
      ])
      // Faturas apagadas (só possível já canceladas — ver invoicesStore.apagar) deixam de existir
      // na coleção `invoices`, mas a descrição do movimento já guardou o número na altura ("Fatura
      // FACT.-2026-000001"), por isso serve de reserva para não mostrar o ID interno do Firestore.
      const numeroFatura = (t: FinancialTransaction) =>
        faturas.find((f) => f.id === t.origemId)?.numero ?? t.descricao.replace(/^Fatura\s+/, '')
      const numeroRecibo = (pagamentoId: string) => recibos.find((r) => r.pagamentoId === pagamentoId)?.numero ?? '—'
      const ORIGEM_LABEL: Record<string, string> = { fatura: 'Factura', pagamento: 'Pagamento', ajuste: 'Ajuste' }
      const ordenadas = [...transacoes].sort((a, b) => a.data - b.data)
      return {
        titulo: `Extrato de Conta Corrente — ${cliente?.nome ?? '—'} (${cliente?.codigo ?? ''})`,
        colunas: ['Data', 'Tipo', 'Documento', 'Descrição', 'Débito', 'Crédito', 'Saldo'],
        linhas: ordenadas.map((t) => [
          formatDate(t.data),
          ORIGEM_LABEL[t.origem] ?? t.origem,
          t.origem === 'fatura' ? numeroFatura(t) : t.origem === 'pagamento' ? numeroRecibo(t.origemId) : '—',
          t.descricao,
          t.tipo === 'debito' ? formatCurrency(t.valor) : '',
          t.tipo === 'credito' ? formatCurrency(t.valor) : '',
          formatCurrency(t.saldoAposMovimento),
        ]),
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
  { id: 'extrato_conta_corrente', label: 'Extrato de Conta Corrente', usaPeriodo: false, usaCliente: true },
]
