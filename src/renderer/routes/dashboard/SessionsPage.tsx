import React, { useEffect, useMemo } from 'react'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePageFiltersStore } from '../../stores/pageFiltersStore'
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
  const {
    sessionsSearch: search,
    setSessionsSearch: setSearch,
    sessionsProjectFilter: projectFilter,
    setSessionsProjectFilter: setProjectFilter,
    sessionsPage: page,
    setSessionsPage: setPage,
    sessionsSortField,
    sessionsSortDir,
    setSessionsSort,
  } = usePageFiltersStore()

  useEffect(() => {
    if (baseDir) fetchSummary(baseDir)
  }, [baseDir])

  // Reset to page 0 whenever filters or sort order changes
  useEffect(() => {
    setPage(0)
  }, [search, projectFilter, selectedMonth, sessionsSortField, sessionsSortDir])

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

  // Apply all filters here — project + text search
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

  // Sort the full filtered list BEFORE slicing, so each page shows the globally correct
  // portion of the sorted data (not an independent per-page sort).
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sessionsSortField) {
        case 'lastActive':
          cmp = a.lastActive.localeCompare(b.lastActive)
          break
        case 'cost':
          cmp = a.estimatedCost - b.estimatedCost
          break
        case 'tokens':
          cmp = a.usage.totalTokens - b.usage.totalTokens
          break
        case 'messages':
          cmp = a.messageCount - b.messageCount
          break
      }
      return sessionsSortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sessionsSortField, sessionsSortDir])

  const totalPages = Math.ceil(sortedFiltered.length / PAGE_SIZE)
  // Clamp saved page to valid range in case data changed since last visit
  const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0
  const paginated = useMemo(
    () => sortedFiltered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [sortedFiltered, safePage],
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
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
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

      {/* Sessions table — key forces full remount on filter/page change so stale rows are cleared */}
      <SessionTable
        key={`${projectFilter}|${search}|${selectedMonth ?? 'all'}|${safePage}`}
        sessions={paginated}
        showProject
        emptyMessage={search || projectFilter ? 'No sessions match your filters.' : 'No sessions found.'}
        sortField={sessionsSortField}
        sortDir={sessionsSortDir}
        onSort={setSessionsSort}
        presorted
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-claude-muted">
            Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 0}
              className="rounded-lg border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:text-claude-text disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-claude-muted">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= totalPages - 1}
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
