import React, { useMemo, useState } from 'react'
import { format, startOfDay, isAfter } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { formatCost } from '@shared/pricing/calculator'
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter'

const THRESHOLDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

function getBillingPeriodStart(cycleDay: number, now = new Date()): Date {
  const day = now.getDate()
  return day >= cycleDay
    ? new Date(now.getFullYear(), now.getMonth(), cycleDay)
    : new Date(now.getFullYear(), now.getMonth() - 1, cycleDay)
}

export function NotificationsPage() {
  const {
    monthlyBudget,
    dailyBudget,
    setDailyBudget,
    dailyBudgetNotifications,
    setDailyBudgetNotifications,
    billingCycleDay,
    usageBudgetNotifications,
    setUsageBudgetNotifications,
    notifiedThresholds,
    notifiedDailyBudget,
  } = useSettingsStore()
  const { summary } = useAnalyticsStore()
  const { convertCost } = useCurrencyConverter()
  const navigate = useNavigate()

  const [dailyBudgetInput, setDailyBudgetInput] = useState(dailyBudget != null ? String(dailyBudget) : '')

  const commitDailyBudget = () => {
    const val = parseFloat(dailyBudgetInput)
    setDailyBudget(!isNaN(val) && val > 0 ? val : null)
  }

  const periodStart = useMemo(() => getBillingPeriodStart(billingCycleDay), [billingCycleDay])
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const rawPeriodCost = useMemo(() => {
    if (!summary) return 0
    const startStr = format(periodStart, 'yyyy-MM-dd')
    return summary.dailyCosts
      .filter((d) => d.date >= startStr)
      .reduce((sum, d) => sum + d.cost, 0)
  }, [summary, periodStart])

  const rawTodayCost = useMemo(() => {
    if (!summary) return 0
    const todayStart = startOfDay(new Date())
    return summary.allSessions
      .filter((s) => isAfter(new Date(s.lastActive), todayStart))
      .reduce((sum, s) => sum + s.estimatedCost, 0)
  }, [summary])

  // Converted to USD equivalent for budget comparisons and display
  const effectivePeriodCost = convertCost(rawPeriodCost)
  const todayCost = convertCost(rawTodayCost)
  const pct = monthlyBudget != null ? Math.min(100, (effectivePeriodCost / monthlyBudget) * 100) : null

  const periodKey = format(periodStart, 'yyyy-MM-dd')
  const firedThresholds = notifiedThresholds?.periodKey === periodKey ? notifiedThresholds.thresholds : []
  const dailyFiredToday = notifiedDailyBudget === todayKey

  return (
    <div className="flex-1 overflow-y-auto p-5">
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-claude-text">Notifications</h1>
        <p className="mt-1 text-sm text-claude-muted">
          Get alerted when your Claude API spending crosses key milestones.
        </p>
      </div>

      {/* ── Section 1: Period Budget ── */}
      <section className="rounded-xl border border-claude-border bg-claude-surface px-5 py-4 space-y-4">
        {/* Section header + toggle */}
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-claude-text">Period budget</p>
            <p className="mt-0.5 text-xs text-claude-muted">
              Notify at 10%, 20%, …, 100% of your monthly budget. Each threshold fires once per billing cycle.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={usageBudgetNotifications}
            onClick={() => setUsageBudgetNotifications(!usageBudgetNotifications)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange/50 focus:ring-offset-2 focus:ring-offset-claude-surface ${
              usageBudgetNotifications ? 'bg-claude-orange' : 'bg-claude-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                usageBudgetNotifications ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* No budget warning */}
        {!monthlyBudget ? (
          <div className="flex items-center gap-2 rounded-lg bg-claude-orange/10 px-3 py-2.5">
            <svg className="h-4 w-4 flex-shrink-0 text-claude-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-claude-orange">
              No monthly budget set.{' '}
              <button onClick={() => navigate('/dashboard/settings')} className="underline hover:no-underline">
                Set one in Settings
              </button>{' '}
              to enable these alerts.
            </p>
          </div>
        ) : (
          <>
            {/* Threshold grid */}
            <div className="grid grid-cols-5 gap-2">
              {THRESHOLDS.map((t) => {
                const fired = firedThresholds.includes(t)
                const reached = pct != null && pct >= t
                const color = t >= 90 ? 'red' : t >= 75 ? 'yellow' : t >= 50 ? 'orange' : 'green'
                const styles = {
                  red:    { active: 'border-red-500/60 bg-red-500/10 text-red-400',           dot: 'bg-red-400' },
                  yellow: { active: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400',  dot: 'bg-yellow-400' },
                  orange: { active: 'border-claude-orange/60 bg-claude-orange/10 text-claude-orange', dot: 'bg-claude-orange' },
                  green:  { active: 'border-green-500/60 bg-green-500/10 text-green-400',     dot: 'bg-green-400' },
                }[color]

                return (
                  <div
                    key={t}
                    className={`flex flex-col items-center justify-center rounded-lg border px-2 py-3 text-center transition-colors ${
                      reached ? styles.active : 'border-claude-border text-claude-muted'
                    }`}
                  >
                    <span className="text-lg font-bold leading-none">{t}%</span>
                    {fired ? (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                        <span className="text-[10px] font-medium">Sent</span>
                      </div>
                    ) : reached ? (
                      <span className="mt-1.5 text-[10px] font-medium opacity-70">Reached</span>
                    ) : (
                      <span className="mt-1.5 text-[10px] opacity-40">Pending</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Period cost footer */}
            <div className="flex items-center justify-between border-t border-claude-border pt-3 text-xs text-claude-muted">
              <span>{formatCost(effectivePeriodCost)} of ${monthlyBudget.toLocaleString()} used this period</span>
              {pct != null && (
                <span className={`font-semibold ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {pct.toFixed(1)}%
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Daily Budget ── */}
      <section className="rounded-xl border border-claude-border bg-claude-surface px-5 py-4 space-y-4">
        {/* Section header: toggle + input */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-claude-text">Daily budget</p>
            <p className="mt-0.5 text-xs text-claude-muted">
              Fires once when today's spending exceeds the limit. Resets at midnight.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`flex items-center gap-1 rounded-lg border bg-claude-bg px-3 py-1.5 transition-opacity ${
              dailyBudgetNotifications
                ? 'border-claude-border focus-within:ring-1 focus-within:ring-claude-orange/50'
                : 'border-claude-border opacity-40'
            }`}>
              <span className="text-sm text-claude-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={dailyBudgetInput}
                placeholder="None"
                disabled={!dailyBudgetNotifications}
                onChange={(e) => setDailyBudgetInput(e.target.value)}
                onBlur={commitDailyBudget}
                onKeyDown={(e) => e.key === 'Enter' && commitDailyBudget()}
                className="w-20 bg-transparent text-sm text-claude-text focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
            <button
              role="switch"
              aria-checked={dailyBudgetNotifications}
              onClick={() => setDailyBudgetNotifications(!dailyBudgetNotifications)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-claude-orange/50 focus:ring-offset-2 focus:ring-offset-claude-surface ${
                dailyBudgetNotifications ? 'bg-claude-orange' : 'bg-claude-border'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  dailyBudgetNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Progress bar — only when a limit is set */}
        {dailyBudget != null && (
          <div className="space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-claude-border">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  todayCost >= dailyBudget ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (todayCost / dailyBudget) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-claude-border pt-3 text-xs text-claude-muted">
              <span>{formatCost(todayCost)} of ${dailyBudget.toLocaleString()} today</span>
              <span className={`font-semibold flex items-center gap-1 ${
                dailyFiredToday ? 'text-red-400' : todayCost >= dailyBudget ? 'text-red-400' : 'text-green-400'
              }`}>
                {dailyFiredToday ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />Notified today</>
                ) : todayCost >= dailyBudget ? 'Exceeded' : 'Within limit'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 3: Test Notification ── */}
      <section className="rounded-xl border border-claude-border bg-claude-surface px-5 py-4">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-claude-text">Test notification</p>
            <p className="mt-0.5 text-xs text-claude-muted">
              Fire a sample alert to confirm macOS notification permissions are granted.
            </p>
          </div>
          <button
            onClick={() => window.claudeAnalytics.sendBudgetNotification(50)}
            className="flex-shrink-0 rounded-lg border border-claude-border px-4 py-1.5 text-sm text-claude-muted hover:border-claude-orange/40 hover:text-claude-text transition-colors"
          >
            Send preview
          </button>
        </div>
      </section>
    </div>
    </div>
  )
}
