import React, { useEffect, useState, useCallback } from 'react'
import type { MenuBarData } from '@shared/types/domain'
import { formatCost, formatTokens } from '@shared/pricing/calculator'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatDistanceToNow, format } from 'date-fns'
import { Spinner } from '../../components/ui/LoadingOverlay'

const AUTO_REFRESH_MS = 2_000

export function MenuBarPage() {
  const { baseDir, billingCycleDay, monthlyBudget, pricingDiscount } = useSettingsStore()
  const [data, setData] = useState<MenuBarData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchData = useCallback(async (manual = false) => {
    if (!baseDir) return
    if (manual) setIsManualLoading(true)
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.claudeAnalytics.getMenuBarData(baseDir, billingCycleDay)
      setData(result)
      setLastFetched(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
      if (manual) setIsManualLoading(false)
    }
  }, [baseDir])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    const timer = setInterval(fetchData, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchData])

  const handleOpenDashboard = () => {
    window.claudeAnalytics.openDashboard()
  }

  return (
    <div className="flex h-screen flex-col bg-[#1A1A1A] text-white select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-claude-orange text-white text-[9px] font-bold">
            CU
          </div>
          <span className="text-sm font-semibold">TSNH Claude Usage</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenDashboard}
            title="Open Dashboard"
            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
          <button
            onClick={() => fetchData(true)}
            title="Refresh"
            disabled={isManualLoading}
            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
          >
            {isManualLoading ? (
              <Spinner className="h-4 w-4 text-white" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {!baseDir ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-white/60">No data directory configured.</p>
          <button
            onClick={handleOpenDashboard}
            className="rounded-lg bg-claude-orange px-4 py-2 text-sm font-medium"
          >
            Open Dashboard to Setup
          </button>
        </div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      ) : !data ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-5 w-5 text-white" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* This Period */}
          {(() => {
            const discountedPeriodCost = pricingDiscount > 0
              ? data.currentPeriodCost * (1 - pricingDiscount / 100)
              : null
            const effectiveCost = discountedPeriodCost ?? data.currentPeriodCost
            const pct = monthlyBudget != null
              ? Math.min(100, (effectiveCost / monthlyBudget) * 100)
              : null
            const barColor =
              pct == null ? 'bg-claude-orange'
              : pct >= 90 ? 'bg-red-500'
              : pct >= 75 ? 'bg-yellow-400'
              : 'bg-green-500'
            const resetDate = new Date(data.periodResetDate)

            return (
              <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                  This Period
                </p>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {discountedPeriodCost != null ? (
                      <>
                        <span className="text-2xl font-bold text-green-400">
                          {formatCost(discountedPeriodCost)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs line-through text-white/30">
                            {formatCost(data.currentPeriodCost)}
                          </span>
                          <span className="text-[10px] font-medium text-green-500/70">-{pricingDiscount}%</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-claude-orange">
                        {formatCost(data.currentPeriodCost)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/50 mt-1">
                    Resets {format(resetDate, 'MMM d')} · {data.periodDaysLeft}d left
                  </span>
                </div>
                {pct != null ? (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-white/40">
                      {formatCost(effectiveCost)} of ${monthlyBudget!.toLocaleString()} · {pct.toFixed(1)}%
                      {discountedPeriodCost != null && <span className="ml-1 text-white/30">(after discount)</span>}
                    </p>
                  </div>
                ) : (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-claude-orange/60" style={{ width: '100%' }} />
                  </div>
                )}
              </div>
            )
          })()}

          {/* Today */}
          <div className="rounded-xl bg-white/5 p-3 border border-white/10">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">Today</p>
            <div className="flex items-start justify-between">
              <div>
                {pricingDiscount > 0 ? (
                  <>
                    <span className="text-2xl font-bold text-green-400">
                      {formatCost(data.todayCost * (1 - pricingDiscount / 100))}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs line-through text-white/30">{formatCost(data.todayCost)}</span>
                      <span className="text-[10px] font-medium text-green-500/70">-{pricingDiscount}%</span>
                    </div>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-claude-orange">
                    {formatCost(data.todayCost)}
                  </span>
                )}
              </div>
              <span className="text-sm text-white/60 mt-1">
                {formatTokens(data.todayTokens)} tokens
              </span>
            </div>
          </div>

          {/* Today by Projects */}
          {data.todayByProject.length > 0 && (
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                Today by Project
              </p>
              <div className="space-y-2">
                {data.todayByProject.map((proj) => {
                  const effectiveCost = pricingDiscount > 0
                    ? proj.cost * (1 - pricingDiscount / 100)
                    : proj.cost
                  const pct = data.todayCost > 0
                    ? (proj.cost / data.todayCost) * 100
                    : 0
                  return (
                    <div key={proj.projectName}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-white/80 truncate max-w-[150px]">
                          {proj.projectName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          {pricingDiscount > 0 ? (
                            <>
                              <span className="text-xs font-medium text-green-400">
                                {formatCost(effectiveCost)}
                              </span>
                              <span className="text-[10px] line-through text-white/30">
                                {formatCost(proj.cost)}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-white">
                              {formatCost(proj.cost)}
                            </span>
                          )}
                          <span className="text-[10px] text-white/30 w-8 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-claude-orange/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {lastFetched && (
        <div className="border-t border-white/10 px-4 py-1.5 text-center">
          <p className="text-[10px] text-white/30">
            Updated {formatDistanceToNow(lastFetched, { addSuffix: true })}
          </p>
        </div>
      )}
    </div>
  )
}
