export function required(value: unknown): string | true {
  if (value === null || value === undefined || value === '') return 'Campo obrigatório.'
  return true
}

export function isPositiveNumber(value: number): string | true {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 'Deve ser um número positivo.'
  }
  return true
}

export function isValidEmail(value: string): string | true {
  if (!value) return true // email é opcional na maioria dos formulários
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(value) || 'Email inválido.'
}

export function isValidPhone(value: string): string | true {
  const re = /^[0-9+()\s-]{7,20}$/
  return re.test(value) || 'Número de telefone inválido.'
}

export function minLength(min: number) {
  return (value: string): string | true =>
    (value?.length ?? 0) >= min || `Deve ter pelo menos ${min} caracteres.`
}
