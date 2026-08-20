import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { abrirPdfEmNovaAba } from '@/utils/pdf'
import type { ReportResult } from '@/services/reports'

export function exportarRelatorioPdf(relatorio: ReportResult) {
  const docPdf = new jsPDF()
  docPdf.setFontSize(14)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text(relatorio.titulo, 14, 18)
  docPdf.setFontSize(9)
  docPdf.setFont('helvetica', 'normal')
  docPdf.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, 14, 24)

  autoTable(docPdf, {
    startY: 30,
    head: [relatorio.colunas],
    body: relatorio.linhas,
    theme: 'grid',
    headStyles: { fillColor: [3, 105, 161] },
    styles: { fontSize: 9 },
  })

  abrirPdfEmNovaAba(docPdf)
}

export function exportarRelatorioExcel(relatorio: ReportResult) {
  const dados = [relatorio.colunas, ...relatorio.linhas]
  const worksheet = XLSX.utils.aoa_to_sheet(dados)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, relatorio.titulo.slice(0, 31))
  XLSX.writeFile(workbook, `${relatorio.titulo.replace(/\s+/g, '_')}.xlsx`)
}
