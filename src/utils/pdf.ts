import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode'
import { formatCurrency, formatNumber } from '@/utils/currency'
import { formatDate } from '@/utils/dateRange'
import { ESTADO_FATURA_LABEL, estadoEfetivoFatura } from '@/utils/invoiceStatus'
import type { AppSettings, Customer, Invoice, Receipt } from '@/types/models'

type Empresa = Omit<AppSettings, 'id'>

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Numerário',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

// ---------------------------------------------------------------------------
// Número por extenso (pt-MZ)
// ---------------------------------------------------------------------------

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ_A_DEZANOVE = [
  'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
]

function extensoAteNovecentosNoventaENove(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const centena = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (centena > 0) partes.push(CENTENAS[centena])
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto])
    else if (resto < 20) partes.push(DEZ_A_DEZANOVE[resto - 10])
    else {
      const dezena = Math.floor(resto / 10)
      const unidade = resto % 10
      partes.push(DEZENAS[dezena] + (unidade > 0 ? ' e ' + UNIDADES[unidade] : ''))
    }
  }
  return partes.join(' e ')
}

/** Converte um valor monetário em texto por extenso, em português, para Meticais. */
function valorPorExtenso(valor: number): string {
  const inteiro = Math.floor(Math.abs(valor))
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100)

  const milhoes = Math.floor(inteiro / 1_000_000)
  const milhares = Math.floor((inteiro % 1_000_000) / 1000)
  const centenas = inteiro % 1000

  const partes: string[] = []
  if (milhoes > 0) partes.push(`${extensoAteNovecentosNoventaENove(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`)
  if (milhares > 0) partes.push(milhares === 1 ? 'mil' : `${extensoAteNovecentosNoventaENove(milhares)} mil`)
  if (centenas > 0) partes.push(extensoAteNovecentosNoventaENove(centenas))

  let texto = inteiro === 0 ? 'zero' : partes.join(' e ')
  texto = texto.charAt(0).toUpperCase() + texto.slice(1)
  const moeda = inteiro === 1 ? 'Metical' : 'Meticais'
  let resultado = `${texto} ${moeda}`
  if (centavos > 0) {
    resultado += ` e ${extensoAteNovecentosNoventaENove(centavos)} ${centavos === 1 ? 'cêntimo' : 'cêntimos'}`
  }
  return resultado
}

// ---------------------------------------------------------------------------
// Ícones (SVG embutido, minimalista, cor herdada via `currentColor`)
// ---------------------------------------------------------------------------

function icone(nome: string, tamanho = 14): string {
  const s = `width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
  const CAMINHOS: Record<string, string> = {
    gota: '<path d="M12 2c4 5 7 8.6 7 12.3A7 7 0 1 1 5 14.3C5 10.6 8 7 12 2Z"/>',
    medidor: '<path d="M4 14a8 8 0 1 1 16 0"/><path d="M12 14l4-4"/><circle cx="12" cy="14" r="1"/>',
    calendario: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4M16 2.5v4"/>',
    utilizador: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6"/>',
    cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/>',
    telefone: '<path d="M4.5 4.5c0 8.3 6.7 15 15 15l1-3.4-4.2-1.4-1.6 1.6a12 12 0 0 1-6-6l1.6-1.6L8.9 4.5H4.5Z"/>',
    email: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    check: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.5 2.6 2.6L16 9.5"/>',
    dinheiro: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 8v0M18 16v0"/>',
    banco: '<path d="M3 10 12 4l9 6"/><rect x="4" y="10" width="16" height="9" rx="0.5"/><path d="M2 21h20M7 13v4M12 13v4M17 13v4"/>',
    pontos: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
    carteira: '<rect x="2.5" y="6.5" width="19" height="12" rx="2"/><path d="M2.5 10.5h19"/><circle cx="17" cy="14" r="1.2"/>',
    aviso: '<path d="M12 3 22 20H2Z"/><path d="M12 9.5v5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>',
  }
  return `<svg ${s}>${CAMINHOS[nome] ?? ''}</svg>`
}

/** Logótipo genérico "casa + torneira + gota" desenhado em SVG — usado quando a empresa não
 * tem ficheiro de logótipo próprio configurado. */
function logotipoSvg(tamanho = 64): string {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="31" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    <path d="M18 34 L32 21 L46 34 V47 A2 2 0 0 1 44 49 H20 A2 2 0 0 1 18 47 Z" fill="none" stroke="#0b3d6b" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="27" y="37" width="10" height="10" rx="1" fill="#0b3d6b"/>
    <path d="M40 27 v-4 h4 a2 2 0 0 1 2 2 v2" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>
    <path d="M46 27c2.6 3 3.6 5 3.6 6.8a3.6 3.6 0 1 1-7.2 0c0-1.8 1-3.8 3.6-6.8Z" fill="#0ea5e9"/>
    <path d="M15 44c3-6 6-10 6-13.5A6 6 0 1 0 9 30.5C9 34 12 38 15 44Z" fill="#16a34a" opacity="0.85"/>
  </svg>`
}

// ---------------------------------------------------------------------------
// Blocos HTML reutilizáveis
// ---------------------------------------------------------------------------

const ESTILOS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .doc { width: 800px; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #1e293b; background: #ffffff; padding: 28px 32px 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .header-left { display: flex; gap: 12px; }
  .brand-nome { font-size: 24px; font-weight: 800; color: #0b3d6b; letter-spacing: 0.3px; }
  .brand-sub { font-size: 10.5px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-top: 2px; }
  .brand-sub2 { font-size: 9px; font-weight: 600; color: #94a3b8; letter-spacing: 1.5px; margin-top: 1px; }
  .brand-tag { font-size: 10.5px; font-style: italic; color: #0ea5e9; margin-top: 4px; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; min-width: 300px; }
  .badge-tipo { background: #0b3d6b; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: 2px; padding: 10px 22px; border-radius: 4px; }
  .info-box { margin-top: 8px; border: 1px solid #cbd5e1; border-radius: 4px; width: 100%; padding: 8px 12px; }
  .info-row { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; font-size: 10.5px; }
  .info-label { color: #64748b; }
  .info-val { font-weight: 700; color: #1e293b; }
  .info-val-accent { color: #dc2626; }
  .contactos { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-top: 14px; padding: 8px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  .contacto-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #334155; }
  .contacto-item svg { color: #0ea5e9; flex-shrink: 0; }
  .boxes-row { display: flex; gap: 10px; margin-top: 16px; }
  .boxes-row2 { display: flex; gap: 10px; margin-top: 10px; }
  .boxes-row3 { display: flex; gap: 10px; margin-top: 10px; }
  .box { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
  .box-title { background: #0b3d6b; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-align: center; padding: 6px; }
  .box-title.verde { background: #16a34a; }
  .box-body { padding: 10px 12px; flex: 1; }
  .campo { display: flex; align-items: center; gap: 7px; font-size: 10.5px; padding: 4px 0; color: #334155; }
  .campo svg { color: #0ea5e9; flex-shrink: 0; }
  .campo b { color: #64748b; font-weight: 600; margin-right: 3px; }
  .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; }
  .stat-icon { color: #0ea5e9; display: flex; justify-content: center; margin-bottom: 3px; }
  .stat-label { font-size: 7.5px; font-weight: 700; color: #64748b; letter-spacing: 0.4px; }
  .stat-val { font-size: 17px; font-weight: 800; color: #0b3d6b; margin-top: 2px; }
  .stat-val small { font-size: 10px; font-weight: 600; color: #64748b; }
  .stat-sub { font-size: 8.5px; color: #94a3b8; margin-top: 1px; }
  table.itens { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 10.5px; }
  table.itens th { background: #0b3d6b; color: #fff; font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px; padding: 7px 10px; text-align: left; }
  table.itens th.num, table.itens td.num { text-align: right; }
  table.itens td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
  table.itens tr:nth-child(even) td { background: #f8fafc; }
  .linha-label { display: flex; justify-content: space-between; font-size: 10.5px; padding: 4px 0; color: #334155; }
  .linha-label.total { border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 7px; font-weight: 800; color: #0b3d6b; font-size: 12.5px; }
  .valor-grande { font-size: 20px; font-weight: 800; color: #16a34a; text-align: center; margin: 4px 0 2px; }
  .extenso { font-size: 9px; color: #64748b; text-align: center; font-style: italic; margin-bottom: 8px; }
  .selo-wrap { display: flex; justify-content: center; margin: 6px 0; }
  .selo { width: 66px; height: 66px; border-radius: 50%; border: 3px double #16a34a; color: #16a34a; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-14deg); font-weight: 800; }
  .selo span:first-child { font-size: 13px; letter-spacing: 1px; }
  .selo span:last-child { font-size: 6px; letter-spacing: 1.5px; margin-top: 1px; }
  .box-qr { align-items: center; text-align: center; }
  .box-qr .box-body { display: flex; flex-direction: column; align-items: center; }
  .qr-caption { font-size: 8.5px; color: #64748b; margin-bottom: 6px; }
  .qr-img { width: 84px; height: 84px; }
  .codigo-cliente { font-size: 8.5px; color: #64748b; margin-top: 6px; }
  .metodos { display: flex; justify-content: space-around; padding: 10px 6px; flex-wrap: wrap; gap: 8px; }
  .metodo { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 8.5px; color: #334155; }
  .metodo-icone { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
  table.historico { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  table.historico th { background: #0b3d6b; color: #fff; font-weight: 700; padding: 6px 8px; text-align: left; font-size: 8.5px; }
  table.historico td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  table.historico td.num, table.historico th.num { text-align: right; }
  .avisos { list-style: none; padding: 8px 10px; }
  .avisos li { display: flex; gap: 6px; font-size: 8.5px; color: #334155; padding: 3px 0; align-items: flex-start; }
  .avisos svg { color: #0ea5e9; flex-shrink: 0; margin-top: 1px; }
  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px solid #0b3d6b; gap: 12px; }
  .footer-left { display: flex; align-items: center; gap: 8px; }
  .footer-left svg { color: #0ea5e9; flex-shrink: 0; }
  .footer-titulo { font-size: 11.5px; font-weight: 800; color: #0b3d6b; }
  .footer-sub { font-size: 9px; color: #94a3b8; }
  .footer-assinatura { text-align: right; font-size: 8.5px; color: #64748b; }
  .footer-assinatura .linha { display: block; width: 150px; border-top: 1px solid #94a3b8; margin-bottom: 3px; }
`

function contactosHtml(empresa: Empresa): string {
  const itens = [
    empresa.nuit ? `${icone('cartao')} <span><b>NUIT:</b> ${empresa.nuit}</span>` : '',
    empresa.endereco ? `${icone('pin')} <span><b>Endereço:</b> ${empresa.endereco}</span>` : '',
    empresa.telefone ? `${icone('telefone')} <span><b>Telefone:</b> ${empresa.telefone}</span>` : '',
    empresa.email ? `${icone('email')} <span><b>E-mail:</b> ${empresa.email}</span>` : '',
  ].filter(Boolean)
  if (itens.length === 0) return ''
  return `<div class="contactos">${itens.map((i) => `<div class="contacto-item">${i}</div>`).join('')}</div>`
}

function cabecalhoHtml(empresa: Empresa, tipoDocumento: string, linhasInfo: { label: string; valor: string; destaque?: boolean }[]): string {
  return `
    <div class="header">
      <div class="header-left">
        ${logotipoSvg(58)}
        <div>
          <div class="brand-nome">${empresa.nomeEmpresa || 'Empresa de Águas'}</div>
          <div class="brand-sub">ABASTECIMENTO DE ÁGUA</div>
          <div class="brand-sub2">GESTÃO E DISTRIBUIÇÃO</div>
          <div class="brand-tag">Água hoje, vida sempre!</div>
        </div>
      </div>
      <div class="header-right">
        <div class="badge-tipo">${tipoDocumento.toUpperCase()}</div>
        <div class="info-box">
          ${linhasInfo
            .map(
              (l) =>
                `<div class="info-row"><span class="info-label">${l.label}:</span><span class="info-val ${l.destaque ? 'info-val-accent' : ''}">${l.valor}</span></div>`,
            )
            .join('')}
        </div>
      </div>
    </div>
    ${contactosHtml(empresa)}
  `
}

function caixaCamposHtml(titulo: string, campos: { icone: string; label: string; valor: string }[], corVerde = false): string {
  return `
    <div class="box">
      <div class="box-title ${corVerde ? 'verde' : ''}">${titulo}</div>
      <div class="box-body">
        ${campos.map((c) => `<div class="campo">${icone(c.icone)}<b>${c.label}:</b> ${c.valor}</div>`).join('')}
      </div>
    </div>
  `
}

function caixaConsumoHtml(titulo: string, leituraAnterior: number, leituraAtual: number, consumo: number, dataAnterior: number, dataAtual: number, dias: number): string {
  return `
    <div class="box">
      <div class="box-title">${titulo}</div>
      <div class="box-body grid4">
        <div>
          <div class="stat-icon">${icone('medidor', 18)}</div>
          <div class="stat-label">LEITURA ANTERIOR</div>
          <div class="stat-val">${formatNumber(leituraAnterior)}<small> m³</small></div>
          <div class="stat-sub">${formatDate(dataAnterior)}</div>
        </div>
        <div>
          <div class="stat-icon">${icone('medidor', 18)}</div>
          <div class="stat-label">LEITURA ACTUAL</div>
          <div class="stat-val">${formatNumber(leituraAtual)}<small> m³</small></div>
          <div class="stat-sub">${formatDate(dataAtual)}</div>
        </div>
        <div>
          <div class="stat-icon">${icone('gota', 18)}</div>
          <div class="stat-label">CONSUMO (m³)</div>
          <div class="stat-val">${formatNumber(consumo)}</div>
        </div>
        <div>
          <div class="stat-icon">${icone('calendario', 18)}</div>
          <div class="stat-label">DIAS DE CONSUMO</div>
          <div class="stat-val">${dias}</div>
          <div class="stat-sub">dias</div>
        </div>
      </div>
    </div>
  `
}

function tabelaItensHtml(linhas: { descricao: string; quantidade: number; valorUnitario: number; total: number }[]): string {
  return `
    <table class="itens">
      <thead>
        <tr><th>Descrição</th><th class="num">Consumo/Qtd</th><th class="num">Preço Unit. (MT)</th><th class="num">Total (MT)</th></tr>
      </thead>
      <tbody>
        ${linhas
          .map(
            (l) =>
              `<tr><td>${l.descricao}</td><td class="num">${formatNumber(l.quantidade)}</td><td class="num">${formatCurrency(l.valorUnitario)}</td><td class="num">${formatCurrency(l.total)}</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `
}

const CORES_METODO: Record<string, string> = {
  dinheiro: '#16a34a',
  mpesa: '#dc2626',
  emola: '#f59e0b',
  transferencia: '#0b3d6b',
  outro: '#64748b',
}
const ICONE_METODO: Record<string, string> = {
  dinheiro: 'dinheiro',
  mpesa: 'telefone',
  emola: 'telefone',
  transferencia: 'banco',
  outro: 'pontos',
}

function formasPagamentoHtml(): string {
  return `
    <div class="box">
      <div class="box-title">FORMAS DE PAGAMENTO ACEITES</div>
      <div class="metodos">
        ${Object.entries(METODO_LABEL)
          .map(
            ([chave, label]) =>
              `<div class="metodo"><div class="metodo-icone" style="background:${CORES_METODO[chave]}">${icone(ICONE_METODO[chave], 14)}</div>${label}</div>`,
          )
          .join('')}
      </div>
    </div>
  `
}

function dadosBancariosHtml(empresa: Empresa): string {
  return `
    <div class="box">
      <div class="box-title">DADOS BANCÁRIOS</div>
      <div class="box-body">
        <div class="campo">${icone('banco')}<b>Banco:</b> ${empresa.banco || '—'}</div>
        <div class="campo">${icone('cartao')}<b>Conta:</b> ${empresa.numeroConta || '—'}</div>
        <div class="campo">${icone('cartao')}<b>NIB:</b> ${empresa.nib || '—'}</div>
        <div class="campo">${icone('telefone')}<b>Comprovativo:</b> ${empresa.telefone || '—'}</div>
      </div>
    </div>
  `
}

function historicoHtml(historico: Invoice[]): string {
  if (historico.length === 0) return '<div class="box"><div class="box-title">HISTÓRICO DE CONSUMO</div><div class="box-body"><div class="campo">Sem faturas anteriores.</div></div></div>'
  return `
    <div class="box" style="flex: 1.4;">
      <div class="box-title">HISTÓRICO DE CONSUMO (ÚLTIMOS ${historico.length} MESES)</div>
      <table class="historico">
        <thead><tr><th>Período</th><th class="num">Leit. Anterior</th><th class="num">Leit. Actual</th><th class="num">Consumo (m³)</th><th class="num">Valor (MT)</th></tr></thead>
        <tbody>
          ${historico
            .map(
              (f) =>
                `<tr><td>${formatDate(f.periodoInicio)} a ${formatDate(f.periodoFim)}</td><td class="num">${formatNumber(f.leituraAnterior)}</td><td class="num">${formatNumber(f.leituraAtual)}</td><td class="num">${formatNumber(f.consumo)}</td><td class="num">${formatCurrency(f.total)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
}

function avisosHtml(): string {
  return `
    <div class="box">
      <div class="box-title">AVISOS IMPORTANTES</div>
      <ul class="avisos">
        <li>${icone('gota', 11)} Evite o corte no fornecimento. Pague até à data limite.</li>
        <li>${icone('gota', 11)} Em caso de dúvida, contacte-nos.</li>
        <li>${icone('gota', 11)} Use a água de forma consciente. Água é vida!</li>
      </ul>
    </div>
  `
}

function rodapeHtml(empresa: Empresa): string {
  return `
    <div class="footer">
      <div class="footer-left">
        ${icone('gota', 26)}
        <div>
          <div class="footer-titulo">Obrigado pela sua preferência!</div>
          <div class="footer-sub">Juntos, garantimos água para todos.</div>
        </div>
      </div>
      ${logotipoSvg(44)}
      <div class="footer-assinatura">
        <span class="linha"></span>
        Emitido por / Assinatura e Carimbo
        <div style="margin-top:2px; font-weight:600; color:#334155;">${empresa.nomeEmpresa || ''}</div>
      </div>
    </div>
  `
}

// ---------------------------------------------------------------------------
// Renderização HTML -> PDF (via html2canvas), para fidelidade visual total
// ---------------------------------------------------------------------------

async function renderizarHtmlParaPdf(htmlConteudo: string): Promise<jsPDF> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.innerHTML = `<div class="doc">${htmlConteudo}</div><style>${ESTILOS}</style>`
  document.body.appendChild(container)

  try {
    const alvo = container.querySelector('.doc') as HTMLElement
    const canvas = await html2canvas(alvo, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imagem = canvas.toDataURL('image/png')
    const larguraPdf = 210
    const alturaPdf = (canvas.height / canvas.width) * larguraPdf
    const docPdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [larguraPdf, alturaPdf] })
    docPdf.addImage(imagem, 'PNG', 0, 0, larguraPdf, alturaPdf)
    return docPdf
  } finally {
    document.body.removeChild(container)
  }
}

async function gerarQrDataUrl(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, { margin: 1, width: 200, color: { dark: '#0b3d6b', light: '#ffffff' } })
}

function historicoDoCliente(clienteId: string, faturas: Invoice[], limite = 3): Invoice[] {
  return faturas
    .filter((f) => f.clienteId === clienteId && f.estado !== 'cancelada')
    .sort((a, b) => a.periodoInicio - b.periodoInicio)
    .slice(-limite)
}

// ---------------------------------------------------------------------------
// Factura
// ---------------------------------------------------------------------------

export async function gerarPdfFatura(
  fatura: Invoice,
  cliente: Customer,
  empresa: Empresa,
  faturas: Invoice[] = [],
): Promise<jsPDF> {
  const diasConsumo = Math.max(1, Math.round((fatura.periodoFim - fatura.periodoInicio) / (24 * 60 * 60 * 1000)))
  const saldoDivida = Math.max(0, fatura.total - fatura.totalPago)
  const historico = historicoDoCliente(fatura.clienteId, faturas)

  const qr = await gerarQrDataUrl(
    `AQUAGEST|FACTURA|${fatura.numero}|CLIENTE:${cliente.codigo}|TOTAL:${fatura.total.toFixed(2)}`,
  )

  const html = `
    ${cabecalhoHtml(empresa, 'Factura', [
      { label: 'Nº da Factura', valor: fatura.numero, destaque: true },
      { label: 'Data de Emissão', valor: formatDate(fatura.dataEmissao) },
      { label: 'Período de Consumo', valor: `${formatDate(fatura.periodoInicio)} a ${formatDate(fatura.periodoFim)}` },
      { label: 'Estado', valor: ESTADO_FATURA_LABEL[estadoEfetivoFatura(fatura)] },
    ])}

    <div class="boxes-row">
      ${caixaCamposHtml('DADOS DO CLIENTE', [
        { icone: 'utilizador', label: 'Nome', valor: cliente.nome },
        { icone: 'cartao', label: 'Código do Cliente', valor: cliente.codigo },
        { icone: 'pin', label: 'Endereço/Bairro', valor: `${cliente.endereco}, ${cliente.bairro}` },
        { icone: 'telefone', label: 'Contacto', valor: cliente.telefone || '—' },
      ])}
      ${caixaConsumoHtml('DETALHES DO CONSUMO', fatura.leituraAnterior, fatura.leituraAtual, fatura.consumo, fatura.periodoInicio, fatura.periodoFim, diasConsumo)}
    </div>

    ${tabelaItensHtml(fatura.linhas)}

    <div class="boxes-row3">
      <div class="box">
        <div class="box-title">RESUMO DA FACTURA</div>
        <div class="box-body">
          <div class="linha-label"><span>Consumo do período:</span><span>${formatNumber(fatura.consumo)} m³</span></div>
          <div class="linha-label"><span>Subtotal:</span><span>${formatCurrency(fatura.subtotal)}</span></div>
          <div class="linha-label"><span>Imposto (${fatura.tarifaSnapshot.impostoPercentagem}%):</span><span>${formatCurrency(fatura.impostoValor)}</span></div>
          <div class="linha-label total"><span>TOTAL A PAGAR:</span><span>${formatCurrency(fatura.total)}</span></div>
        </div>
      </div>
      <div class="box">
        <div class="box-title">SITUAÇÃO DA CONTA</div>
        <div class="box-body">
          <div class="linha-label"><span>Total desta factura:</span><span>${formatCurrency(fatura.total)}</span></div>
          <div class="linha-label"><span>Total pago:</span><span>${formatCurrency(fatura.totalPago)}</span></div>
          <div class="linha-label"><span>Saldo em dívida:</span><span>${formatCurrency(saldoDivida)}</span></div>
          <div class="linha-label total"><span>Data limite:</span><span>${formatDate(fatura.dataVencimento)}</span></div>
        </div>
      </div>
      <div class="box box-qr">
        <div class="box-title">PAGUE COM FACILIDADE</div>
        <div class="box-body">
          <div class="qr-caption">Escaneie o QR Code para pagar via M-Pesa/e-Mola ou App do seu banco.</div>
          <img class="qr-img" src="${qr}" />
          <div class="codigo-cliente">Código do Cliente: ${cliente.codigo}</div>
        </div>
      </div>
    </div>

    <div class="boxes-row2">
      ${formasPagamentoHtml()}
      ${dadosBancariosHtml(empresa)}
    </div>

    <div class="boxes-row2">
      ${historicoHtml(historico)}
      ${avisosHtml()}
    </div>

    ${rodapeHtml(empresa)}
  `

  return renderizarHtmlParaPdf(html)
}

// ---------------------------------------------------------------------------
// Recibo
// ---------------------------------------------------------------------------

export async function gerarPdfRecibo(
  recibo: Receipt,
  cliente: Customer,
  empresa: Empresa,
  faturas: Invoice[] = [],
): Promise<jsPDF> {
  const numerosFatura = recibo.faturaIds.map((id) => faturas.find((f) => f.id === id)?.numero ?? id)
  const faturaPrincipal = faturas.find((f) => f.id === recibo.faturaIds[0])
  const saldoAnterior = recibo.saldoRestante + recibo.valorRecebido

  const qr = await gerarQrDataUrl(
    `AQUAGEST|RECIBO|${recibo.numero}|CLIENTE:${cliente.codigo}|VALOR:${recibo.valorRecebido.toFixed(2)}`,
  )

  const diasConsumo = faturaPrincipal
    ? Math.max(1, Math.round((faturaPrincipal.periodoFim - faturaPrincipal.periodoInicio) / (24 * 60 * 60 * 1000)))
    : 0

  const html = `
    ${cabecalhoHtml(empresa, 'Recibo', [
      { label: 'Nº do Recibo', valor: recibo.numero, destaque: true },
      { label: 'Nº da Factura', valor: numerosFatura.join(', ') || '—' },
      { label: 'Data do Pagamento', valor: formatDate(recibo.data) },
      { label: 'Forma de Pagamento', valor: METODO_LABEL[recibo.metodo] ?? recibo.metodo },
      { label: 'Operador', valor: recibo.operadorNome },
    ])}

    <div class="boxes-row">
      ${caixaCamposHtml('DADOS DO CLIENTE', [
        { icone: 'utilizador', label: 'Nome', valor: cliente.nome },
        { icone: 'cartao', label: 'Código do Cliente', valor: cliente.codigo },
        { icone: 'pin', label: 'Endereço/Bairro', valor: `${cliente.endereco}, ${cliente.bairro}` },
        { icone: 'telefone', label: 'Contacto', valor: cliente.telefone || '—' },
      ])}
      ${
        faturaPrincipal
          ? caixaConsumoHtml(
              'DETALHES DO CONSUMO (Factura)',
              faturaPrincipal.leituraAnterior,
              faturaPrincipal.leituraAtual,
              faturaPrincipal.consumo,
              faturaPrincipal.periodoInicio,
              faturaPrincipal.periodoFim,
              diasConsumo,
            )
          : caixaCamposHtml('FACTURA(S) ASSOCIADA(S)', numerosFatura.length ? numerosFatura.map((n) => ({ icone: 'cartao', label: 'Factura', valor: n })) : [{ icone: 'cartao', label: 'Factura', valor: '—' }])
      }
    </div>

    ${faturaPrincipal ? tabelaItensHtml(faturaPrincipal.linhas) : ''}

    <div class="boxes-row3">
      <div class="box">
        <div class="box-title">RESUMO DO PAGAMENTO</div>
        <div class="box-body">
          <div class="linha-label"><span>Saldo anterior:</span><span>${formatCurrency(saldoAnterior)}</span></div>
          <div class="linha-label"><span>Valor recebido:</span><span>${formatCurrency(recibo.valorRecebido)}</span></div>
          <div class="linha-label total"><span>Saldo restante:</span><span>${formatCurrency(recibo.saldoRestante)}</span></div>
        </div>
      </div>
      <div class="box">
        <div class="box-title verde">PAGAMENTO EFECTUADO</div>
        <div class="box-body">
          <div class="valor-grande">${formatCurrency(recibo.valorRecebido)}</div>
          <div class="extenso">(${valorPorExtenso(recibo.valorRecebido)})</div>
          <div class="selo-wrap"><div class="selo"><span>PAGO</span><span>AQUAGEST</span></div></div>
          <div class="linha-label"><span>Data do Pagamento:</span><span>${formatDate(recibo.data)}</span></div>
        </div>
      </div>
      <div class="box box-qr">
        <div class="box-title verde">PAGAMENTO REALIZADO</div>
        <div class="box-body">
          <div class="stat-icon" style="color:#16a34a;">${icone('check', 24)}</div>
          <div class="qr-caption">Escaneie o QR Code para verificar este recibo.</div>
          <img class="qr-img" src="${qr}" />
          <div class="codigo-cliente">Código do Cliente: ${cliente.codigo}</div>
        </div>
      </div>
    </div>

    <div class="boxes-row2">
      ${formasPagamentoHtml()}
      ${dadosBancariosHtml(empresa)}
    </div>

    ${faturaPrincipal ? `<div class="boxes-row2">${historicoHtml(historicoDoCliente(recibo.clienteId, faturas))}${avisosHtml()}</div>` : ''}

    ${rodapeHtml(empresa)}
  `

  return renderizarHtmlParaPdf(html)
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
