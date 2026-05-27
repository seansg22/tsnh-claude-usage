import React, { useEffect, useRef, useMemo, useState } from 'react'
import { format } from 'date-fns'
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
  const { baseDir, pricingDiscount } = useSettingsStore()
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
        <div className="flex items-center">
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
