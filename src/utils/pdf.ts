import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatNumber } from '@/utils/currency'
import { formatDate } from '@/utils/dateRange'
import { ESTADO_FATURA_LABEL, estadoEfetivoFatura } from '@/utils/invoiceStatus'
import type { AppSettings, Customer, Invoice, Receipt } from '@/types/models'

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência Bancária',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

function cabecalho(docPdf: jsPDF, empresa: Omit<AppSettings, 'id'>, titulo: string) {
  docPdf.setFontSize(16)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(empresa.nomeEmpresa || 'Empresa de Águas', 14, 18)
  docPdf.setFontSize(9)
  docPdf.setFont('helvetica', 'normal')
  const linhas = [empresa.endereco, empresa.telefone, empresa.email].filter(Boolean)
  docPdf.text(linhas.join(' · '), 14, 24)

  docPdf.setFontSize(14)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(titulo, 196, 18, { align: 'right' })
}

export function gerarPdfFatura(fatura: Invoice, cliente: Customer, empresa: Omit<AppSettings, 'id'>): jsPDF {
  const docPdf = new jsPDF()
  cabecalho(docPdf, empresa, `Fatura ${fatura.numero}`)

  docPdf.setFontSize(10)
  docPdf.setFont('helvetica', 'normal')
  docPdf.text(`Cliente: ${cliente.nome} (${cliente.codigo})`, 14, 36)
  docPdf.text(`Endereço: ${cliente.endereco}, ${cliente.bairro}`, 14, 42)
  docPdf.text(`Data de emissão: ${formatDate(fatura.dataEmissao)}`, 140, 36)
  docPdf.text(`Data de vencimento: ${formatDate(fatura.dataVencimento)}`, 140, 42)
  docPdf.text(`Estado: ${ESTADO_FATURA_LABEL[estadoEfetivoFatura(fatura)]}`, 140, 48)
  docPdf.text(
    `Período: ${formatDate(fatura.periodoInicio)} a ${formatDate(fatura.periodoFim)}  ·  Consumo: ${formatNumber(fatura.consumo)} m³`,
    14,
    50,
  )

  autoTable(docPdf, {
    startY: 58,
    head: [['Descrição', 'Quantidade', 'Valor Unitário', 'Total']],
    body: fatura.linhas.map((l) => [
      l.descricao,
      formatNumber(l.quantidade),
      formatCurrency(l.valorUnitario),
      formatCurrency(l.total),
    ]),
    foot: [
      ['', '', 'Subtotal', formatCurrency(fatura.subtotal)],
      ['', '', `Imposto (${fatura.tarifaSnapshot.impostoPercentagem}%)`, formatCurrency(fatura.impostoValor)],
      ['', '', 'Total', formatCurrency(fatura.total)],
      ['', '', 'Total Pago', formatCurrency(fatura.totalPago)],
      ['', '', 'Saldo em Dívida', formatCurrency(Math.max(0, fatura.total - fatura.totalPago))],
    ],
    theme: 'grid',
    headStyles: { fillColor: [3, 105, 161] },
  })

  return docPdf
}

export function gerarPdfRecibo(
  recibo: Receipt,
  cliente: Customer,
  empresa: Omit<AppSettings, 'id'>,
  faturas: Invoice[] = [],
): jsPDF {
  const docPdf = new jsPDF()
  cabecalho(docPdf, empresa, `Recibo ${recibo.numero}`)

  docPdf.setFontSize(10)
  docPdf.setFont('helvetica', 'normal')
  docPdf.text(`Cliente: ${cliente.nome} (${cliente.codigo})`, 14, 36)
  docPdf.text(`Data: ${formatDate(recibo.data)}`, 140, 36)
  docPdf.text(`Forma de pagamento: ${METODO_LABEL[recibo.metodo] ?? recibo.metodo}`, 14, 42)
  docPdf.text(`Operador: ${recibo.operadorNome}`, 140, 42)

  const numerosFatura = recibo.faturaIds.map((id) => faturas.find((f) => f.id === id)?.numero ?? id)

  autoTable(docPdf, {
    startY: 52,
    head: [['Fatura(s) associada(s)']],
    body: numerosFatura.length ? numerosFatura.map((numero) => [numero]) : [['—']],
    theme: 'grid',
    headStyles: { fillColor: [3, 105, 161] },
  })

  const finalY = (docPdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  docPdf.setFontSize(12)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(`Valor Recebido: ${formatCurrency(recibo.valorRecebido)}`, 14, finalY)
  docPdf.text(`Saldo Restante: ${formatCurrency(recibo.saldoRestante)}`, 14, finalY + 8)

  return docPdf
}

export function abrirPdfEmNovaAba(docPdf: jsPDF) {
  const blobUrl = docPdf.output('bloburl')
  // Um <a target="_blank"> clicado programaticamente é menos sujeito a bloqueio de pop-ups
  // pelo browser do que window.open(), especialmente em fluxos assíncronos (ex: após um await).
  const link = document.createElement('a')
  link.href = String(blobUrl)
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
