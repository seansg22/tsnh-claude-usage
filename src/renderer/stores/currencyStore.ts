import { create } from 'zustand'

/**
 * Approximate fallback rates (1 USD = X currency) used when the live fetch fails.
 * Updated periodically by fetchRates() from api.frankfurter.app.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  SGD: 1.35,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  JPY: 150.0,
  MYR: 4.71,
  THB: 36.5,
  IDR: 16300,
  PHP: 57.5,
}

interface CurrencyState {
  /** Exchange rates relative to USD. e.g. { SGD: 1.35, EUR: 0.92 }.
   *  USD itself is always 1. Falls back to FALLBACK_RATES if API is unavailable. */
  rates: Record<string, number>
  rateLoading: boolean
  rateError: string | null
  fetchRates: () => Promise<void>
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  rates: FALLBACK_RATES,
  rateLoading: false,
  rateError: null,

  fetchRates: async () => {
    set({ rateLoading: true, rateError: null })
    try {
      // Use IPC so the main process (Node.js https) makes the request —
      // avoids renderer-side CORS/fetch restrictions in Electron.
      const liveRates = await window.claudeAnalytics.fetchExchangeRates()
      // Merge live rates on top of fallbacks so all supported currencies always have a value
      set({ rates: { ...FALLBACK_RATES, USD: 1, ...liveRates }, rateLoading: false })
    } catch (err) {
      // Keep fallback rates on failure — don't wipe existing data
      set({
        rateLoading: false,
        rateError: err instanceof Error ? err.message : 'Failed to fetch exchange rates',
      })
    }
  },
}))
