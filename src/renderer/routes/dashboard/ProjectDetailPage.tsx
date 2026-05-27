import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { DailyCostChart } from '../../components/charts/DailyCostChart'
import { ModelPieChart } from '../../components/charts/ModelPieChart'
import { SessionTable } from '../../components/tables/SessionTable'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { SearchInput } from '../../components/ui/SearchInput'
import { formatTokens } from '@shared/pricing/calculator'
import { formatDistanceToNow, format } from 'date-fns'
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter'

export function ProjectDetailPage() {
  const { projectDirName = '' } = useParams<{ projectDirName: string }>()
  const navigate = useNavigate()
  const { baseDir } = useSettingsStore()
  const { fetchProjectDetail, getProjectDetail, isLoading, getError, invalidate } = useProjectStore()
  const { convertCost, formatDisplayCost, rate } = useCurrencyConverter()
  const [search, setSearch] = useState('')

  const detail = getProjectDetail(projectDirName)
  const loading = isLoading(projectDirName)
  const error = getError(projectDirName)

  useEffect(() => {
    if (projectDirName && baseDir) {
      fetchProjectDetail(projectDirName, baseDir)
    }
  }, [projectDirName, baseDir])

  const handleRefresh = () => {
    invalidate(projectDirName)
    if (baseDir) fetchProjectDetail(projectDirName, baseDir)
  }

  // Convert daily cost data for chart display
  const convertedDailyCosts = useMemo(
    () => detail?.dailyCosts.map((d) => ({ ...d, cost: convertCost(d.cost) })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail?.dailyCosts, rate],
  )

  // Convert model cost data for chart display
  const convertedCostByModel = useMemo(
    () => detail?.costByModel.map((m) => ({ ...m, cost: convertCost(m.cost) })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail?.costByModel, rate],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingOverlay progress={null} message="Loading project…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner message={error} />
      </div>
    )
  }

  if (!detail) return null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header — pinned at top, outside scroll */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-claude-border flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-claude-border text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors"
          title="Go back"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-claude-text truncate">{detail.projectName}</h1>
          <p className="text-[10px] text-claude-muted font-mono truncate">{detail.projectPath}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex-shrink-0 rounded-md border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:text-claude-text transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Two-column body: each column scrolls independently */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* LEFT: stats panel — its own scrollbar */}
        <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-claude-border">
          <div className="space-y-3 p-4">

            {/* Key metrics */}
            <div className="rounded-lg border border-claude-border bg-claude-surface px-3 py-2 space-y-1.5">
              {[
                { label: 'Total Cost', value: formatDisplayCost(detail.estimatedCost), accent: true },
                { label: 'Sessions', value: detail.sessionCount },
                { label: 'Total Tokens', value: formatTokens(detail.usage.totalTokens) },
                { label: 'Input Tokens', value: formatTokens(detail.usage.inputTokens) },
                { label: 'Output Tokens', value: formatTokens(detail.usage.outputTokens) },
                { label: 'Cache Tokens', value: formatTokens(detail.usage.cacheCreationTokens + detail.usage.cacheReadTokens) },
              ].map(({ label, value, accent }) => (
                <div key={label} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-claude-muted flex-shrink-0">{label}</span>
                  <span className={`text-sm font-semibold tabular-nums truncate ${accent ? 'text-claude-orange' : 'text-claude-text'}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Metadata */}
            <section className="rounded-lg border border-claude-border bg-claude-surface px-3 py-2">
              <dl className="space-y-1 text-xs">
                {[
                  { label: 'First session', value: format(new Date(detail.firstSession), 'MMM d, yyyy') },
                  { label: 'Last active', value: formatDistanceToNow(new Date(detail.lastActive), { addSuffix: true }) },
                  { label: 'Messages', value: detail.totalMessages },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline justify-between gap-2">
                    <dt className="text-claude-muted flex-shrink-0">{label}</dt>
                    <dd className="font-medium text-claude-text text-right truncate">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Daily Cost chart */}
            <section className="rounded-lg border border-claude-border bg-claude-surface px-3 py-2">
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-claude-muted">Daily Cost</h2>
              <DailyCostChart data={convertedDailyCosts} height={130} />
            </section>

            {/* Cost by Model chart */}
            <section className="rounded-lg border border-claude-border bg-claude-surface px-3 py-2">
              <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-claude-muted">Cost by Model</h2>
              <ModelPieChart data={convertedCostByModel} height={130} />
            </section>

          </div>
        </div>

        {/* RIGHT: sessions list — its own scrollbar */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-claude-text flex-shrink-0">
                Sessions ({detail.sessions.length})
              </h2>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search sessions…"
                className="w-56"
              />
            </div>
            <SessionTable
              sessions={detail.sessions}
              projectDirName={projectDirName}
              searchQuery={search}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
