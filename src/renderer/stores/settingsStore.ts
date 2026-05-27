import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  baseDir: string
  isConfigured: boolean
  billingCycleDay: number
  monthlyBudget: number | null
  /** Enterprise pricing discount percentage (0–100). 0 = no discount. */
  pricingDiscount: number
  setBaseDir: (dir: string) => void
  setBillingCycleDay: (day: number) => void
  setMonthlyBudget: (budget: number | null) => void
  setPricingDiscount: (discount: number) => void
  clearSettings: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      baseDir: '',
      isConfigured: false,
      billingCycleDay: 1,
      monthlyBudget: null,
      pricingDiscount: 0,

      setBaseDir: (dir: string) => {
        set({ baseDir: dir, isConfigured: !!dir.trim() })
      },

      setBillingCycleDay: (day: number) => {
        set({ billingCycleDay: Math.min(28, Math.max(1, day)) })
      },

      setMonthlyBudget: (budget: number | null) => {
        set({ monthlyBudget: budget !== null ? Math.max(0, budget) : null })
      },

      setPricingDiscount: (discount: number) => {
        set({ pricingDiscount: Math.min(100, Math.max(0, discount)) })
      },

      clearSettings: () => {
        set({ baseDir: '', isConfigured: false })
      },
    }),
    {
      name: 'claude-usage-settings',
      partialize: (state) => ({
        baseDir: state.baseDir,
        isConfigured: state.isConfigured,
        billingCycleDay: state.billingCycleDay,
        monthlyBudget: state.monthlyBudget,
        pricingDiscount: state.pricingDiscount,
      }),
    },
  ),
)
