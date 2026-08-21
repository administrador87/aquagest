import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatNumber } from '@/utils/currency'
import { formatDate } from '@/utils/dateRange'
import { ESTADO_FATURA_LABEL, estadoEfetivoFatura } from '@/utils/invoiceStatus'
import type { AppSettings, Customer, Invoice, Receipt } from '@/types/models'

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Numerário',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

const MARGEM = 14
const LARGURA_PAGINA = 210
const LARGURA_CONTEUDO = LARGURA_PAGINA - MARGEM * 2

const COR_MARCA: [number, number, number] = [3, 105, 161]
const COR_BORDA: [number, number, number] = [203, 213, 225]
const COR_TEXTO_SUAVE: [number, number, number] = [100, 116, 139]

/** Desenha um pequeno "logótipo" (gota de água estilizada) quando a empresa não tem um ficheiro
 * de logótipo próprio configurado — mantém o documento com identidade visual mesmo assim. */
function desenharLogo(docPdf: jsPDF, x: number, y: number, tamanho: number) {
  docPdf.setFillColor(...COR_MARCA)
  docPdf.roundedRect(x, y, tamanho, tamanho, 2, 2, 'F')
  docPdf.setFillColor(255, 255, 255)
  docPdf.circle(x + tamanho / 2, y + tamanho * 0.6, tamanho * 0.22, 'F')
  docPdf.triangle(
    x + tamanho / 2,
    y + tamanho * 0.18,
    x + tamanho * 0.32,
    y + tamanho * 0.6,
    x + tamanho * 0.68,
    y + tamanho * 0.6,
    'F',
  )
}

/** Cabeçalho comum: logótipo + nome da empresa + contactos à esquerda, badge do tipo de
 * documento + número/datas à direita. Devolve o Y onde o conteúdo seguinte deve começar. */
function cabecalho(
  docPdf: jsPDF,
  empresa: Omit<AppSettings, 'id'>,
  tipoDocumento: string,
  numero: string,
  linhasDireita: { label: string; valor: string }[],
): number {
  desenharLogo(docPdf, MARGEM, 10, 16)

  docPdf.setTextColor(...COR_MARCA)
  docPdf.setFontSize(15)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(empresa.nomeEmpresa || 'Empresa de Águas', MARGEM + 20, 17)

  docPdf.setTextColor(...COR_TEXTO_SUAVE)
  docPdf.setFontSize(8)
  docPdf.setFont('helvetica', 'normal')
  const contactos = [
    empresa.nuit ? `NUIT: ${empresa.nuit}` : null,
    empresa.endereco,
    empresa.telefone,
    empresa.email,
  ].filter(Boolean)
  docPdf.text(contactos.join('  ·  '), MARGEM + 20, 22, { maxWidth: 110 })

  const badgeX = 140
  const badgeLargura = LARGURA_PAGINA - MARGEM - badgeX
  docPdf.setFillColor(...COR_MARCA)
  docPdf.rect(badgeX, 10, badgeLargura, 10, 'F')
  docPdf.setTextColor(255, 255, 255)
  docPdf.setFontSize(13)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(tipoDocumento.toUpperCase(), badgeX + badgeLargura / 2, 17, { align: 'center' })

  const todasLinhas = [{ label: 'Número:', valor: numero }, ...linhasDireita]
  docPdf.setDrawColor(...COR_BORDA)
  docPdf.setLineWidth(0.2)
  docPdf.rect(badgeX, 22, badgeLargura, todasLinhas.length * 5 + 4)
  docPdf.setFontSize(8)
  let yDireita = 27
  for (const linha of todasLinhas) {
    docPdf.setFont('helvetica', 'normal')
    docPdf.setTextColor(...COR_TEXTO_SUAVE)
    docPdf.text(linha.label, badgeX + 2, yDireita)
    docPdf.setFont('helvetica', 'bold')
    docPdf.setTextColor(30, 41, 59)
    docPdf.text(linha.valor, LARGURA_PAGINA - MARGEM - 2, yDireita, { align: 'right' })
    yDireita += 5
  }

  const yLinhaDivisoria = Math.max(42, 22 + todasLinhas.length * 5 + 4 + 2)
  docPdf.setDrawColor(...COR_MARCA)
  docPdf.setLineWidth(0.6)
  docPdf.line(MARGEM, yLinhaDivisoria, LARGURA_PAGINA - MARGEM, yLinhaDivisoria)

  return yLinhaDivisoria + 6
}

interface CampoCaixa {
  label: string
  valor: string
}

/** Desenha uma caixa com título destacado e uma lista de campos "label: valor" — o padrão
 * repetido nas secções "Dados do Cliente", "Detalhes do Consumo", "Situação da Conta", etc. */
function desenharCaixa(
  docPdf: jsPDF,
  x: number,
  y: number,
  largura: number,
  titulo: string,
  campos: CampoCaixa[],
): number {
  const alturaTitulo = 7
  const alturaLinha = 5.5
  const altura = alturaTitulo + campos.length * alturaLinha + 3

  docPdf.setFillColor(...COR_MARCA)
  docPdf.rect(x, y, largura, alturaTitulo, 'F')
  docPdf.setTextColor(255, 255, 255)
  docPdf.setFontSize(8.5)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(titulo.toUpperCase(), x + largura / 2, y + 4.8, { align: 'center' })

  docPdf.setDrawColor(...COR_BORDA)
  docPdf.setLineWidth(0.2)
  docPdf.rect(x, y + alturaTitulo, largura, altura - alturaTitulo)

  let yCampo = y + alturaTitulo + 5
  for (const campo of campos) {
    docPdf.setFontSize(8)
    docPdf.setFont('helvetica', 'normal')
    docPdf.setTextColor(...COR_TEXTO_SUAVE)
    docPdf.text(campo.label, x + 3, yCampo)
    docPdf.setFont('helvetica', 'bold')
    docPdf.setTextColor(30, 41, 59)
    docPdf.text(campo.valor, x + largura - 3, yCampo, { align: 'right', maxWidth: largura - 3 - (docPdf.getTextWidth(campo.label) + 3) })
    yCampo += alturaLinha
  }

  return y + altura
}

/** Faixa horizontal com "pílulas" para as formas de pagamento aceites. */
function desenharFormasPagamento(docPdf: jsPDF, x: number, y: number, largura: number): number {
  docPdf.setFillColor(...COR_MARCA)
  docPdf.rect(x, y, largura, 7, 'F')
  docPdf.setTextColor(255, 255, 255)
  docPdf.setFontSize(8.5)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text('FORMAS DE PAGAMENTO ACEITES', x + largura / 2, y + 4.8, { align: 'center' })

  const metodos = Object.values(METODO_LABEL)
  docPdf.setDrawColor(...COR_BORDA)
  docPdf.rect(x, y + 7, largura, 10)
  docPdf.setFontSize(8)
  docPdf.setFont('helvetica', 'normal')
  docPdf.setTextColor(30, 41, 59)
  const espaco = largura / metodos.length
  metodos.forEach((metodo, i) => {
    docPdf.text(metodo, x + espaco * i + espaco / 2, y + 13, { align: 'center' })
  })

  return y + 17
}

function rodape(docPdf: jsPDF, empresa: Omit<AppSettings, 'id'>, y: number) {
  docPdf.setDrawColor(...COR_MARCA)
  docPdf.setLineWidth(0.6)
  docPdf.line(MARGEM, y, LARGURA_PAGINA - MARGEM, y)
  docPdf.setFontSize(9)
  docPdf.setFont('helvetica', 'bold')
  docPdf.setTextColor(...COR_MARCA)
  docPdf.text('Obrigado pela sua preferência!', MARGEM, y + 6)
  docPdf.setFontSize(7.5)
  docPdf.setFont('helvetica', 'normal')
  docPdf.setTextColor(...COR_TEXTO_SUAVE)
  docPdf.text(empresa.nomeEmpresa || '', MARGEM, y + 10)

  docPdf.setDrawColor(...COR_BORDA)
  docPdf.line(130, y + 10, LARGURA_PAGINA - MARGEM, y + 10)
  docPdf.setFontSize(7.5)
  docPdf.text('Emitido por / Assinatura e Carimbo', LARGURA_PAGINA - MARGEM, y + 14, { align: 'right' })
}

export function gerarPdfFatura(fatura: Invoice, cliente: Customer, empresa: Omit<AppSettings, 'id'>): jsPDF {
  const docPdf = new jsPDF()

  let y = cabecalho(docPdf, empresa, 'Factura', fatura.numero, [
    { label: 'Data de Emissão', valor: formatDate(fatura.dataEmissao) },
    { label: 'Data de Vencimento', valor: formatDate(fatura.dataVencimento) },
    { label: 'Estado', valor: ESTADO_FATURA_LABEL[estadoEfetivoFatura(fatura)] },
  ])

  const larguraCaixa = (LARGURA_CONTEUDO - 4) / 2
  const yDadosCliente = desenharCaixa(docPdf, MARGEM, y, larguraCaixa, 'Dados do Cliente', [
    { label: 'Nome:', valor: cliente.nome },
    { label: 'Código:', valor: cliente.codigo },
    { label: 'Endereço/Bairro:', valor: `${cliente.endereco}, ${cliente.bairro}` },
    { label: 'Contacto:', valor: cliente.telefone },
  ])

  const diasConsumo = Math.max(1, Math.round((fatura.periodoFim - fatura.periodoInicio) / (24 * 60 * 60 * 1000)))
  const yDetalhesConsumo = desenharCaixa(docPdf, MARGEM + larguraCaixa + 4, y, larguraCaixa, 'Detalhes do Consumo', [
    { label: 'Leitura Anterior:', valor: `${formatNumber(fatura.leituraAnterior)} m³` },
    { label: 'Leitura Atual:', valor: `${formatNumber(fatura.leituraAtual)} m³` },
    { label: 'Consumo:', valor: `${formatNumber(fatura.consumo)} m³` },
    { label: 'Dias de Consumo:', valor: `${diasConsumo} dias` },
  ])

  y = Math.max(yDadosCliente, yDetalhesConsumo) + 4

  autoTable(docPdf, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Descrição', 'Consumo/Qtd', 'Preço Unit. (MT)', 'Total (MT)']],
    body: fatura.linhas.map((l) => [l.descricao, formatNumber(l.quantidade), formatCurrency(l.valorUnitario), formatCurrency(l.total)]),
    theme: 'grid',
    headStyles: { fillColor: COR_MARCA, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    styles: { lineColor: COR_BORDA },
  })

  y = (docPdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

  const larguraResumo = (LARGURA_CONTEUDO - 8) / 3
  const yResumo = desenharCaixa(docPdf, MARGEM, y, larguraResumo, 'Resumo da Factura', [
    { label: 'Consumo do período:', valor: `${formatNumber(fatura.consumo)} m³` },
    { label: 'Subtotal:', valor: formatCurrency(fatura.subtotal) },
    { label: `Imposto (${fatura.tarifaSnapshot.impostoPercentagem}%):`, valor: formatCurrency(fatura.impostoValor) },
    { label: 'TOTAL A PAGAR:', valor: formatCurrency(fatura.total) },
  ])

  const saldoDivida = Math.max(0, fatura.total - fatura.totalPago)
  const xSituacao = MARGEM + larguraResumo + 4
  const ySituacao = desenharCaixa(docPdf, xSituacao, y, larguraResumo, 'Situação da Conta', [
    { label: 'Total desta factura:', valor: formatCurrency(fatura.total) },
    { label: 'Total pago:', valor: formatCurrency(fatura.totalPago) },
    { label: 'Saldo em dívida:', valor: formatCurrency(saldoDivida) },
    { label: 'Saldo global do cliente:', valor: formatCurrency(cliente.saldoAtual) },
  ])

  const xPagamento = xSituacao + larguraResumo + 4
  desenharCaixa(docPdf, xPagamento, y, larguraResumo, 'Data Limite', [
    { label: 'Pague até:', valor: formatDate(fatura.dataVencimento) },
    { label: 'Cliente nº:', valor: cliente.codigo },
  ])

  y = Math.max(yResumo, ySituacao) + 4
  y = desenharFormasPagamento(docPdf, MARGEM, y, LARGURA_CONTEUDO) + 2

  rodape(docPdf, empresa, Math.min(y, 265))

  return docPdf
}

export function gerarPdfRecibo(
  recibo: Receipt,
  cliente: Customer,
  empresa: Omit<AppSettings, 'id'>,
  faturas: Invoice[] = [],
): jsPDF {
  const docPdf = new jsPDF()

  let y = cabecalho(docPdf, empresa, 'Recibo', recibo.numero, [
    { label: 'Data', valor: formatDate(recibo.data) },
    { label: 'Forma de Pagamento', valor: METODO_LABEL[recibo.metodo] ?? recibo.metodo },
    { label: 'Operador', valor: recibo.operadorNome },
  ])

  const larguraCaixa = (LARGURA_CONTEUDO - 4) / 2
  const yCliente = desenharCaixa(docPdf, MARGEM, y, larguraCaixa, 'Dados do Cliente', [
    { label: 'Nome:', valor: cliente.nome },
    { label: 'Código:', valor: cliente.codigo },
    { label: 'Endereço/Bairro:', valor: `${cliente.endereco}, ${cliente.bairro}` },
  ])

  const yValores = desenharCaixa(docPdf, MARGEM + larguraCaixa + 4, y, larguraCaixa, 'Valores', [
    { label: 'Valor Recebido:', valor: formatCurrency(recibo.valorRecebido) },
    { label: 'Saldo Restante:', valor: formatCurrency(recibo.saldoRestante) },
  ])

  y = Math.max(yCliente, yValores) + 4

  const numerosFatura = recibo.faturaIds.map((id) => faturas.find((f) => f.id === id)?.numero ?? id)

  autoTable(docPdf, {
    startY: y,
    margin: { left: MARGEM, right: MARGEM },
    head: [['Fatura(s) associada(s) a este pagamento']],
    body: numerosFatura.length ? numerosFatura.map((numero) => [numero]) : [['—']],
    theme: 'grid',
    headStyles: { fillColor: COR_MARCA, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    styles: { lineColor: COR_BORDA },
  })

  y = (docPdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  y = desenharFormasPagamento(docPdf, MARGEM, y, LARGURA_CONTEUDO) + 4

  rodape(docPdf, empresa, Math.min(y, 265))

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
