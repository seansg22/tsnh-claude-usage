import React, { useEffect, useState, useMemo } from 'react'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { SessionTable } from '../../components/tables/SessionTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { MonthFilter } from '../../components/ui/MonthFilter'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'

const PAGE_SIZE = 20

export function SessionsPage() {
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
  const { baseDir } = useSettingsStore()

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [page, setPage] = useState(0)

  // Default to "All time" when landing on this page
  useEffect(() => {
    if (baseDir) setSelectedMonth(null, baseDir)
  }, [])

  useEffect(() => {
    if (baseDir) fetchSummary(baseDir)
  }, [baseDir])

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0)
  }, [search, projectFilter, selectedMonth])

  const allSessions = useMemo(() => summary?.allSessions ?? [], [summary])

  // Deduplicated project names for the dropdown (use projectName as both key and filter value
  // so the label and the filter are always consistent with what the Project column shows)
  const projects = useMemo(() => {
    const seen = new Set<string>()
    for (const s of allSessions) {
      if (s.projectName) seen.add(s.projectName)
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b))
  }, [allSessions])

  // Apply all filters here — project + text search — so SessionTable only sorts/renders
  const filtered = useMemo(() => {
    let result = allSessions
    if (projectFilter) {
      result = result.filter((s) => s.projectName === projectFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.firstPrompt?.toLowerCase().includes(q) ||
          s.sessionId.toLowerCase().includes(q) ||
          s.primaryModel.toLowerCase().includes(q) ||
          s.title?.toLowerCase().includes(q),
      )
    }
    return result
  }, [allSessions, projectFilter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  )

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-claude-text">
          Sessions
          {summary && (
            <span className="ml-2 text-sm font-normal text-claude-muted">
              ({filtered.length})
            </span>
          )}
        </h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search sessions…"
          className="w-64"
        />

        {/* Project filter dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-claude-muted">Project</span>
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="appearance-none rounded-lg border border-claude-border bg-claude-bg pl-3 pr-8 py-1.5 text-sm text-claude-text focus:outline-none focus:border-claude-orange/50 focus:ring-1 focus:ring-claude-orange/20 transition-colors cursor-pointer"
            >
              <option value="">All Projects</option>
              {projects.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-claude-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Month filter */}
        {availableMonths.length > 1 && (
          <MonthFilter
            months={availableMonths}
            selected={selectedMonth}
            onChange={(month) => setSelectedMonth(month, baseDir!)}
          />
        )}
      </div>

      {/* Sessions table — key forces full remount on filter change so stale rows are cleared */}
      <SessionTable
        key={`${projectFilter}|${search}|${selectedMonth ?? 'all'}`}
        sessions={paginated}
        showProject
        emptyMessage={search || projectFilter ? 'No sessions match your filters.' : 'No sessions found.'}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-claude-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="rounded-lg border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:text-claude-text disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-claude-muted">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:text-claude-text disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
