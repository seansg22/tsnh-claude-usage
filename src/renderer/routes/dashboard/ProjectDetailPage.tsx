import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../stores/projectStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { StatCard } from '../../components/metrics/StatCard'
import { DailyCostChart } from '../../components/charts/DailyCostChart'
import { ModelPieChart } from '../../components/charts/ModelPieChart'
import { SessionTable } from '../../components/tables/SessionTable'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { SearchInput } from '../../components/ui/SearchInput'
import { formatCost, formatTokens } from '@shared/pricing/calculator'
import { formatDistanceToNow } from 'date-fns'

export function ProjectDetailPage() {
  const { projectDirName = '' } = useParams<{ projectDirName: string }>()
  const navigate = useNavigate()
  const { baseDir } = useSettingsStore()
  const { fetchProjectDetail, getProjectDetail, isLoading, getError, invalidate } = useProjectStore()
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-claude-border text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors"
            title="Go back"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-claude-text">{detail.projectName}</h1>
            <p className="mt-0.5 text-xs text-claude-muted font-mono">{detail.projectPath}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="rounded-lg border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:text-claude-text transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Cost" value={formatCost(detail.estimatedCost)} accent />
        <StatCard label="Sessions" value={detail.sessionCount} />
        <StatCard
          label="Last Active"
          value={formatDistanceToNow(new Date(detail.lastActive), { addSuffix: true })}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-claude-text">Daily Cost</h2>
          <DailyCostChart data={detail.dailyCosts} height={180} />
        </section>
        <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-claude-text">Cost by Model</h2>
          <ModelPieChart data={detail.costByModel} height={150} />
        </section>
      </div>

      {/* Sessions */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-claude-text">
            Sessions ({detail.sessions.length})
          </h2>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search sessions…"
            className="w-64"
          />
        </div>
        <SessionTable
          sessions={detail.sessions}
          projectDirName={projectDirName}
          searchQuery={search}
        />
      </section>
    </div>
  )
}
