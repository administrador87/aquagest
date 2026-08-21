import type { InvoiceLine, Tariff, TariffBand } from '@/types/models'

/**
 * Calcula o consumo a partir de duas leituras de contador.
 * Lança erro se a leitura atual for menor que a anterior (proteção contra erro de digitação);
 * chamadas de correção autorizada devem capturar o erro e definir `corrigida: true` explicitamente.
 */
export function calcularConsumo(leituraAnterior: number, leituraAtual: number): number {
  const consumo = leituraAtual - leituraAnterior
  if (consumo < 0) {
    throw new Error(
      'A leitura atual não pode ser menor que a leitura anterior. Se o contador foi trocado ou há um erro anterior, utilize a correção de leitura.',
    )
  }
  return consumo
}

/** Calcula o valor do consumo aplicando os escalões (tarifa por blocos) da tarifa. */
export function calcularValorConsumoPorEscaloes(consumoM3: number, escaloes: TariffBand[]): number {
  let restante = consumoM3
  let total = 0
  const escaloesOrdenados = [...escaloes].sort((a, b) => a.deM3 - b.deM3)

  for (const escalao of escaloesOrdenados) {
    if (restante <= 0) break
    const limiteEscalao =
      escalao.ateM3 === null ? Infinity : escalao.ateM3 - escalao.deM3 + 1
    const m3NesteEscalao = Math.min(restante, limiteEscalao)
    total += m3NesteEscalao * escalao.precoM3
    restante -= m3NesteEscalao
  }

  // Os escalões configurados não cobrem a totalidade do consumo (ex: falta um escalão final
  // "sem limite superior"). Nunca se deve emitir uma fatura a cobrar menos do que o consumo real.
  if (restante > 0.001) {
    throw new Error(
      `A tarifa ativa não cobre a totalidade do consumo: faltam ${round2(restante)} m³ por tarifar. Verifique se o último escalão em Tarifas tem o campo "Até" vazio (sem limite superior).`,
    )
  }

  return round2(total)
}

export interface CalculoFaturaResultado {
  linhas: InvoiceLine[]
  subtotal: number
  impostoValor: number
  total: number
}

/** Monta as linhas e totais de uma fatura a partir do consumo e do snapshot da tarifa aplicada. */
export function calcularFatura(
  consumoM3: number,
  tarifa: Pick<Tariff, 'escaloes' | 'taxaFixa' | 'taxaManutencao' | 'outrasTaxas' | 'impostoPercentagem'>,
): CalculoFaturaResultado {
  const linhas: InvoiceLine[] = []

  const valorConsumo = calcularValorConsumoPorEscaloes(consumoM3, tarifa.escaloes)
  linhas.push({
    descricao: `Consumo de água (${consumoM3} m³)`,
    quantidade: consumoM3,
    valorUnitario: consumoM3 > 0 ? round2(valorConsumo / consumoM3) : 0,
    total: valorConsumo,
  })

  if (tarifa.taxaFixa > 0) {
    linhas.push({ descricao: 'Taxa fixa', quantidade: 1, valorUnitario: tarifa.taxaFixa, total: tarifa.taxaFixa })
  }
  if (tarifa.taxaManutencao > 0) {
    linhas.push({
      descricao: 'Taxa de manutenção',
      quantidade: 1,
      valorUnitario: tarifa.taxaManutencao,
      total: tarifa.taxaManutencao,
    })
  }
  for (const taxa of tarifa.outrasTaxas ?? []) {
    linhas.push({ descricao: taxa.nome, quantidade: 1, valorUnitario: taxa.valor, total: taxa.valor })
  }

  const subtotal = round2(linhas.reduce((soma, linha) => soma + linha.total, 0))
  const impostoValor = round2(subtotal * ((tarifa.impostoPercentagem ?? 0) / 100))
  const total = round2(subtotal + impostoValor)

  return { linhas, subtotal, impostoValor, total }
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
