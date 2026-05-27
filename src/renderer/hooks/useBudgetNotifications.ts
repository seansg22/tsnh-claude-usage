import { useEffect, useMemo } from 'react'
import { format, startOfDay, isAfter } from 'date-fns'
import { useSettingsStore } from '../stores/settingsStore'
import { useAnalyticsStore } from '../stores/analyticsStore'

const THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
const POLL_INTERVAL_MS = 60 * 1000 // 1 minute

function getBillingPeriodStart(cycleDay: number, now = new Date()): Date {
  const day = now.getDate()
  return day >= cycleDay
    ? new Date(now.getFullYear(), now.getMonth(), cycleDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, cycleDay)
}

/**
 * Background budget notification monitor. Call once at the App root.
 *
 * - Polls fetchSummary every 5 minutes so notifications fire even when
 *   the user hasn't opened the dashboard.
 * - Checks all THRESHOLDS on every summary update and fires an IPC
 *   notification for each uncrossed threshold, once per billing period.
 */
export function useBudgetNotifications() {
  const { baseDir, billingCycleDay, monthlyBudget, pricingDiscount,
          usageBudgetNotifications, notifiedThresholds, markThresholdNotified,
          dailyBudget, dailyBudgetNotifications, notifiedDailyBudget, markDailyBudgetNotified } =
    useSettingsStore()
  const { summary, fetchSummary } = useAnalyticsStore()

  // Periodic re-fetch so the check runs in the background
  useEffect(() => {
    if (!baseDir) return
    const id = setInterval(() => fetchSummary(baseDir), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [baseDir, fetchSummary])

  // Derive billing period start and today's date key
  const periodStart = useMemo(() => getBillingPeriodStart(billingCycleDay), [billingCycleDay])
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  // Monthly budget percentage
  const pct = useMemo(() => {
    if (!summary || monthlyBudget == null) return null
    const startStr = format(periodStart, 'yyyy-MM-dd')
    const periodCost = summary.dailyCosts
      .filter((d) => d.date >= startStr)
      .reduce((sum, d) => sum + d.cost, 0)
    const effectiveCost =
      pricingDiscount > 0 ? periodCost * (1 - pricingDiscount / 100) : periodCost
    return Math.min(100, (effectiveCost / monthlyBudget) * 100)
  }, [summary, periodStart, monthlyBudget, pricingDiscount])

  // Today's cost — session-level, matches buildMenuBarData logic
  const todayCost = useMemo(() => {
    if (!summary) return 0
    const todayStart = startOfDay(new Date())
    const raw = summary.allSessions
      .filter((s) => isAfter(new Date(s.lastActive), todayStart))
      .reduce((sum, s) => sum + s.estimatedCost, 0)
    return pricingDiscount > 0 ? raw * (1 - pricingDiscount / 100) : raw
  }, [summary, pricingDiscount])

  // Check monthly budget thresholds whenever pct updates
  useEffect(() => {
    if (pct == null || !usageBudgetNotifications) return

    const periodKey = format(periodStart, 'yyyy-MM-dd')

    for (const t of THRESHOLDS) {
      if (pct < t) break

      const alreadyFired =
        notifiedThresholds?.periodKey === periodKey &&
        notifiedThresholds.thresholds.includes(t)

      if (!alreadyFired) {
        markThresholdNotified(periodKey, t)
        window.claudeAnalytics.sendBudgetNotification(t)
      }
    }
  }, [pct, periodStart, usageBudgetNotifications, notifiedThresholds, markThresholdNotified])

  // Check daily budget whenever today's cost updates
  useEffect(() => {
    if (!dailyBudgetNotifications || dailyBudget == null) return
    if (todayCost < dailyBudget) return
    if (notifiedDailyBudget === todayKey) return

    markDailyBudgetNotified(todayKey)
    window.claudeAnalytics.sendDailyBudgetNotification(dailyBudget)
  }, [todayCost, todayKey, dailyBudget, dailyBudgetNotifications, notifiedDailyBudget, markDailyBudgetNotified])
}
