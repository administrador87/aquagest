import { useSettingsStore } from '@/stores/settings'

export function formatCurrency(value: number): string {
  const settings = useSettingsStore()
  const symbol = settings.moedaSimbolo || 'MT'
  const formatted = new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)
  return `${formatted} ${symbol}`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0)
}
