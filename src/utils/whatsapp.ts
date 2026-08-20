/** Limpa um número de telefone e garante o código do país no formato exigido pelo WhatsApp
 * (apenas dígitos, sem "+", "00" ou espaços). Se o número já parecer incluir o código do país
 * (mais dígitos do que um número local), é deixado como está. */
export function formatarNumeroWhatsapp(telefone: string, codigoPais: string): string {
  const digitos = telefone.replace(/\D/g, '').replace(/^0+/, '')
  const codigoLimpo = codigoPais.replace(/\D/g, '')
  if (digitos.startsWith(codigoLimpo)) return digitos
  return `${codigoLimpo}${digitos}`
}

export function gerarLinkWhatsapp(telefone: string, mensagem: string, codigoPais: string): string {
  const numero = formatarNumeroWhatsapp(telefone, codigoPais)
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export function abrirWhatsapp(telefone: string, mensagem: string, codigoPais: string) {
  window.open(gerarLinkWhatsapp(telefone, mensagem, codigoPais), '_blank', 'noopener')
}
