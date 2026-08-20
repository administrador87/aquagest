export type PeriodPreset = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado'

export interface DateRange {
  inicio: number
  fim: number
}

export function getPeriodRange(preset: PeriodPreset, custom?: DateRange): DateRange {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime()

  switch (preset) {
    case 'hoje':
      return { inicio: startOfDay(now), fim: endOfDay(now) }
    case 'semana': {
      const diaSemana = now.getDay() === 0 ? 6 : now.getDay() - 1 // semana começa segunda-feira
      const inicioSemana = new Date(now)
      inicioSemana.setDate(now.getDate() - diaSemana)
      return { inicio: startOfDay(inicioSemana), fim: endOfDay(now) }
    }
    case 'mes':
      return {
        inicio: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        fim: endOfDay(now),
      }
    case 'ano':
      return {
        inicio: new Date(now.getFullYear(), 0, 1).getTime(),
        fim: endOfDay(now),
      }
    case 'personalizado':
      if (!custom) throw new Error('Período personalizado requer datas de início e fim.')
      return custom
  }
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(timestamp),
  )
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function monthKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string): string {
  const [ano, mes] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', { month: 'short', year: 'numeric' }).format(new Date(ano, mes - 1, 1))
}
