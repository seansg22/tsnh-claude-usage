import { useSettingsStore } from '../stores/settingsStore'
import { useCurrencyStore } from '../stores/currencyStore'
import { formatCost } from '@shared/pricing/calculator'

/** Maps ISO currency codes to their display symbol. Falls back to "<CODE> " for unknown currencies. */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  SGD: 'S$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  HKD: 'HK$',
  NZD: 'NZ$',
  CHF: 'CHF ',
  KRW: '₩',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
  CNY: '¥',
  TWD: 'NT$',
  MYR: 'RM',
  THB: '฿',
  VND: '₫',
  PHP: '₱',
  IDR: 'Rp',
}

/**
 * Returns helpers for converting and displaying costs.
 *
 * The app computes all costs in USD via token pricing. When the user sets a
 * non-USD billing currency (e.g. SGD), they indicate that the computed values
 * should be treated as that local currency — so we divide by the exchange rate
 * (1 USD = X currency) to get the true USD equivalent for display.
 *
 * USD → no conversion (rate = 1).
 *
 * Uses Zustand selectors so the hook only triggers re-renders when `currency`
 * or `rates` actually change, not on every unrelated settings update.
 */
export function useCurrencyConverter() {
  // Precise selectors → re-renders only when these specific values change
  const currency = useSettingsStore((state) => state.currency)
  const rates = useCurrencyStore((state) => state.rates)

  const rate = currency === 'USD' ? 1 : (rates[currency] ?? 1)
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `

  const convertCost = (rawCost: number): number => (rate > 0 ? rawCost / rate : rawCost)

  const formatDisplayCost = (rawCost: number): string => formatCost(convertCost(rawCost), currencySymbol)

  return { convertCost, formatDisplayCost, rate, currency, currencySymbol }
}
