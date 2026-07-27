import { useSettingsStore } from '@/store/settings'

export function formatCurrency(amount: number): string {
  const { currency, currencyPosition, decimalPlaces } = useSettingsStore.getState()
  const formatted = amount.toFixed(decimalPlaces)
  return currencyPosition === 'before' ? `${currency}${formatted}` : `${formatted}${currency}`
}
