import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  baseDir: string
  isConfigured: boolean
  billingCycleDay: number
  monthlyBudget: number | null
  /** Enterprise pricing discount percentage (0–100). 0 = no discount. */
  pricingDiscount: number
  /** Whether to send macOS notifications at budget usage thresholds (10%, 20%, …, 100%). */
  usageBudgetNotifications: boolean
  /** Tracks which thresholds have already been notified for the current billing period. */
  notifiedThresholds: { periodKey: string; thresholds: number[] } | null
  /** Daily spending limit in USD. Notification fires once when today's cost exceeds this. */
  dailyBudget: number | null
  /** Whether to send a notification when daily budget is exceeded. */
  dailyBudgetNotifications: boolean
  /** Tracks which date the daily budget notification was last sent (YYYY-MM-DD). */
  notifiedDailyBudget: string | null
  setBaseDir: (dir: string) => void
  setBillingCycleDay: (day: number) => void
  setMonthlyBudget: (budget: number | null) => void
  setDailyBudget: (budget: number | null) => void
  setDailyBudgetNotifications: (enabled: boolean) => void
  setPricingDiscount: (discount: number) => void
  setUsageBudgetNotifications: (enabled: boolean) => void
  markThresholdNotified: (periodKey: string, threshold: number) => void
  markDailyBudgetNotified: (date: string) => void
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
      usageBudgetNotifications: true,
      notifiedThresholds: null,
      dailyBudget: null,
      dailyBudgetNotifications: true,
      notifiedDailyBudget: null,

      setBaseDir: (dir: string) => {
        set({ baseDir: dir, isConfigured: !!dir.trim() })
      },

      setBillingCycleDay: (day: number) => {
        set({ billingCycleDay: Math.min(28, Math.max(1, day)) })
      },

      setMonthlyBudget: (budget: number | null) => {
        set({ monthlyBudget: budget !== null ? Math.max(0, budget) : null })
      },

      setDailyBudget: (budget: number | null) => {
        set({ dailyBudget: budget !== null ? Math.max(0, budget) : null, notifiedDailyBudget: null })
      },

      setDailyBudgetNotifications: (enabled: boolean) => {
        set({ dailyBudgetNotifications: enabled })
      },

      setPricingDiscount: (discount: number) => {
        set({ pricingDiscount: Math.min(100, Math.max(0, discount)) })
      },

      setUsageBudgetNotifications: (enabled: boolean) => {
        set({ usageBudgetNotifications: enabled })
      },

      markThresholdNotified: (periodKey: string, threshold: number) => {
        set((state) => {
          if (state.notifiedThresholds?.periodKey === periodKey) {
            // Same period — append threshold if not already present
            if (state.notifiedThresholds.thresholds.includes(threshold)) return state
            return {
              notifiedThresholds: {
                periodKey,
                thresholds: [...state.notifiedThresholds.thresholds, threshold],
              },
            }
          }
          // New period (or first time) — reset
          return { notifiedThresholds: { periodKey, thresholds: [threshold] } }
        })
      },

      markDailyBudgetNotified: (date: string) => {
        set({ notifiedDailyBudget: date })
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
        usageBudgetNotifications: state.usageBudgetNotifications,
        notifiedThresholds: state.notifiedThresholds,
        dailyBudget: state.dailyBudget,
        dailyBudgetNotifications: state.dailyBudgetNotifications,
        notifiedDailyBudget: state.notifiedDailyBudget,
      }),
    },
  ),
)
