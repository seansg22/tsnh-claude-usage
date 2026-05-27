import React, { useEffect, useRef, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { StatCard } from '../../components/metrics/StatCard'
import { DailyCostChart } from '../../components/charts/DailyCostChart'
import { ModelPieChart } from '../../components/charts/ModelPieChart'
import { ProjectTable } from '../../components/tables/ProjectTable'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { MonthFilter } from '../../components/ui/MonthFilter'
import { formatCost, formatTokens } from '@shared/pricing/calculator'

/** Compute the current billing period boundaries and days remaining. */
function getBillingPeriod(cycleDay: number, now = new Date()) {
  const day = now.getDate()
  const periodStart =
    day >= cycleDay
      ? new Date(now.getFullYear(), now.getMonth(), cycleDay)
      : new Date(now.getFullYear(), now.getMonth() - 1, cycleDay)
  const resetDate = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, cycleDay)
  const msLeft = resetDate.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  return { periodStart, resetDate, daysLeft }
}

export function OverviewPage() {
  const {
    summary,
    isLoading,
    error,
    scanProgress,
    fetchSummary,
    clearError,
    availableMonths,
    selectedMonth,
    setSelectedMonth,
  } = useAnalyticsStore()
  const { baseDir, billingCycleDay, monthlyBudget, pricingDiscount } = useSettingsStore()
  const navigate = useNavigate()
  const hasAutoSelected = useRef(false)
  // Stays true from mount until the initial current-month filter fetch completes,
  // keeping the loading overlay up across both the all-time and filtered fetches so
  // the user never sees a flash of stale all-time data with the current-month filter.
  const [isInitializing, setIsInitializing] = useState(!!baseDir)

  // Initial full fetch — populates availableMonths
  useEffect(() => {
    hasAutoSelected.current = false
    setIsInitializing(!!baseDir)
    if (baseDir) fetchSummary(baseDir)
    else setIsInitializing(false)
  }, [baseDir])

  // Auto-select current month once availableMonths is first populated
  useEffect(() => {
    if (availableMonths.length > 0 && !hasAutoSelected.current && baseDir) {
      hasAutoSelected.current = true
      const currentMonth = format(new Date(), 'yyyy-MM')
      if (availableMonths.includes(currentMonth)) {
        setSelectedMonth(currentMonth, baseDir).then(() => setIsInitializing(false))
      } else {
        setIsInitializing(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMonths])

  // Fallback: first fetch done but no monthly data available — stop initializing
  useEffect(() => {
    if (!isLoading && summary !== null && availableMonths.length === 0 && !hasAutoSelected.current) {
      setIsInitializing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, summary])

  const { periodStart, resetDate, daysLeft } = useMemo(
    () => getBillingPeriod(billingCycleDay),
    [billingCycleDay],
  )

  const periodCost = useMemo(() => {
    if (!summary) return 0
    const startStr = format(periodStart, 'yyyy-MM-dd')
    return summary.dailyCosts
      .filter((d) => d.date >= startStr)
      .reduce((sum, d) => sum + d.cost, 0)
  }, [summary, periodStart])

  const discountedCost = useMemo(() => {
    if (pricingDiscount <= 0) return null
    return periodCost * (1 - pricingDiscount / 100)
  }, [periodCost, pricingDiscount])

  if (isLoading || isInitializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingOverlay progress={scanProgress} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner message={error} onDismiss={clearError} />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-claude-muted">
        Select a directory to get started.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Month Filter */}
      {availableMonths.length > 1 && (
        <div className="flex items-center justify-end">
          <MonthFilter
            months={availableMonths}
            selected={selectedMonth}
            onChange={(month) => setSelectedMonth(month, baseDir)}
          />
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {pricingDiscount > 0 ? (
          <StatCard
            label="Total Cost"
            value={formatCost(summary.totalCost * (1 - pricingDiscount / 100))}
            accentGreen
            sub={
              <span className="flex items-center gap-1.5">
                <span className="line-through">{formatCost(summary.totalCost)}</span>
                <span className="text-green-500/70">-{pricingDiscount}%</span>
              </span>
            }
          />
        ) : (
          <StatCard
            label="Total Cost"
            value={formatCost(summary.totalCost)}
            accent
          />
        )}
        <StatCard
          label="Total Tokens"
          value={formatTokens(summary.totalTokens)}
        />
        <StatCard
          label="Projects"
          value={summary.projectCount}
        />
        <StatCard
          label="Sessions"
          value={summary.sessionCount}
        />
      </div>

      {/* Billing Period Banner — only relevant for current month or all-time view */}
      {(selectedMonth === null || selectedMonth === format(new Date(), 'yyyy-MM')) && (() => {
        const effectiveCost = discountedCost ?? periodCost
        const pct = monthlyBudget != null ? Math.min(100, (effectiveCost / monthlyBudget) * 100) : null
        const barColor =
          pct == null ? ''
          : pct >= 90 ? 'bg-red-500'
          : pct >= 75 ? 'bg-yellow-400'
          : 'bg-green-500'

        return (
          <div className="rounded-xl border border-claude-border bg-claude-surface px-4 py-3 space-y-3">
            {/* Top row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {/* Period cost */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">
                    This Period
                  </p>
                  {discountedCost != null ? (
                    <>
                      <p className="mt-0.5 text-2xl font-bold text-green-400">
                        {formatCost(discountedCost)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <span className="text-xs line-through text-claude-muted">{formatCost(periodCost)}</span>
                        <span className="text-xs font-medium text-green-500/70">-{pricingDiscount}%</span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-0.5 text-xl font-bold text-claude-orange">
                      {formatCost(periodCost)}
                    </p>
                  )}
                </div>
                <div className="h-8 w-px bg-claude-border" />
                {/* Reset countdown */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">
                    Quota Resets
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-claude-text">
                    {format(resetDate, 'MMM d')}
                    <span className="ml-2 font-normal text-claude-muted">
                      in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <div className="h-8 w-px bg-claude-border" />
                {/* Monthly budget */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">
                    Monthly Budget
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-claude-text">
                    {monthlyBudget != null ? `$${monthlyBudget.toLocaleString()}` : '—'}
                  </p>
                </div>
                <div className="h-8 w-px bg-claude-border" />
                {/* Pricing Discount */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">
                    Discount
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-green-400">
                    {pricingDiscount > 0 ? `${pricingDiscount}%` : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Settings link */}
                <button
                  onClick={() => navigate('/dashboard/settings')}
                  className="flex items-center gap-1 text-xs text-claude-muted hover:text-claude-text transition-colors"
                  title="Open Settings"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {pct != null && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-claude-border">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-claude-muted">
                    {formatCost(effectiveCost)} of ${monthlyBudget!.toLocaleString()} used
                    {discountedCost != null && (
                      <span className="ml-1 text-claude-muted/60">(after discount)</span>
                    )}
                  </p>
                  <span
                    className={`text-xs font-semibold ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400'}`}
                  >
                    {pct.toFixed(1)}% of budget
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Daily cost chart */}
      <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-claude-text">Daily Cost</h2>
        <DailyCostChart data={summary.dailyCosts} height={200} />
      </section>

      {/* Model breakdown + Top projects */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-claude-text">Cost by Model</h2>
          <ModelPieChart data={summary.costByModel} height={160} />
        </section>

        <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-claude-text">Top Projects</h2>
          <ProjectTable projects={summary.topProjects} compact />
        </section>
      </div>

    </div>
  )
}
