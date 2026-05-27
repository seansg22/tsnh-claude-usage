import React, { useEffect, useMemo, useState, useRef } from 'react'
import { format } from 'date-fns'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { StatCard } from '../../components/metrics/StatCard'
import { DailyCostChart } from '../../components/charts/DailyCostChart'
import { ModelPieChart } from '../../components/charts/ModelPieChart'
import { SessionTable } from '../../components/tables/SessionTable'
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
  const { baseDir, billingCycleDay, monthlyBudget, setMonthlyBudget } = useSettingsStore()

  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const budgetInputRef = useRef<HTMLInputElement>(null)

  const commitBudget = () => {
    const val = parseFloat(budgetInput)
    setMonthlyBudget(!isNaN(val) && val > 0 ? val : null)
    setIsEditingBudget(false)
  }

  const startEditingBudget = () => {
    setBudgetInput(monthlyBudget != null ? String(monthlyBudget) : '')
    setIsEditingBudget(true)
    setTimeout(() => budgetInputRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (baseDir) fetchSummary(baseDir)
  }, [baseDir])

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

  if (isLoading) {
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
        <StatCard
          label="Total Cost"
          value={formatCost(summary.totalCost)}
          accent
        />
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
        const pct = monthlyBudget != null ? Math.min(100, (periodCost / monthlyBudget) * 100) : null
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
                  <p className="mt-0.5 text-xl font-bold text-claude-orange">
                    {formatCost(periodCost)}
                  </p>
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
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {isEditingBudget ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-claude-muted">$</span>
                        <input
                          ref={budgetInputRef}
                          type="number"
                          min="0"
                          step="1"
                          value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          onBlur={commitBudget}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitBudget()
                            if (e.key === 'Escape') setIsEditingBudget(false)
                          }}
                          className="w-20 rounded-md border border-claude-border bg-claude-bg px-2 py-0.5 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-orange/50"
                          placeholder="0"
                        />
                      </div>
                    ) : monthlyBudget != null ? (
                      <>
                        <span className="text-sm font-semibold text-claude-text">
                          ${monthlyBudget.toLocaleString()}
                        </span>
                        <button
                          onClick={startEditingBudget}
                          className="text-claude-muted hover:text-claude-text transition-colors"
                          title="Edit budget"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setMonthlyBudget(null)}
                          className="text-claude-muted hover:text-red-400 transition-colors"
                          title="Remove budget"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEditingBudget}
                        className="text-xs text-claude-muted hover:text-claude-orange transition-colors underline underline-offset-2"
                      >
                        Set budget
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Percentage badge */}
              {pct != null && (
                <span
                  className={`text-sm font-bold ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400'}`}
                >
                  {pct.toFixed(1)}%
                </span>
              )}
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
                <p className="text-xs text-claude-muted">
                  {formatCost(periodCost)} of ${monthlyBudget!.toLocaleString()} used
                </p>
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

      {/* Recent sessions */}
      <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-claude-text">
          {selectedMonth
            ? `Sessions — ${format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}`
            : 'Recent Sessions'}
        </h2>
        <SessionTable sessions={summary.recentSessions} />
      </section>
    </div>
  )
}
