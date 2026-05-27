import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { Spinner } from '../ui/LoadingOverlay'
import { formatDistanceToNow } from 'date-fns'

/** Shorten a UUID-like segment to "xxxx…xxxx" to save header space. */
function shortenSegment(s: string) {
  // UUID pattern: 8-4-4-4-12
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return s.slice(0, 8) + '…'
  }
  return s
}

function Breadcrumbs() {
  const location = useLocation()
  const navigate = useNavigate()
  const parts = location.pathname.replace('/dashboard', '').split('/').filter(Boolean)

  if (parts.length === 0) return <span className="text-sm text-claude-muted">Overview</span>

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex-shrink-0 text-claude-muted hover:text-claude-text transition-colors"
      >
        Overview
      </button>
      {parts.map((part, i) => {
        const decoded = decodeURIComponent(part)
        const display = shortenSegment(decoded)
        const isLast = i === parts.length - 1
        return (
          <React.Fragment key={i}>
            <span className="flex-shrink-0 text-claude-border">/</span>
            {isLast ? (
              <span
                className="min-w-0 truncate text-claude-text"
                style={{ maxWidth: 'min(12rem, 30vw)' }}
                title={decoded}
              >
                {display}
              </span>
            ) : (
              <button
                onClick={() => navigate('/dashboard/' + parts.slice(0, i + 1).map(encodeURIComponent).join('/'))}
                className="min-w-0 truncate text-claude-muted hover:text-claude-text transition-colors"
                style={{ maxWidth: 'min(12rem, 20vw)' }}
                title={decoded}
              >
                {display}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export function DashboardLayout() {
  const { isLoading, lastFetched, fetchSummary, selectedMonth } = useAnalyticsStore()
  const { baseDir } = useSettingsStore()
  const location = useLocation()

  const hideSidebar = /^\/dashboard\/projects\/[^/]+(\/sessions\/[^/]+)?$/.test(location.pathname)

  const handleRefresh = () => {
    if (!baseDir) return
    const dateRange = selectedMonth
      ? { from: `${selectedMonth}-01`, to: `${selectedMonth}-31` }
      : undefined
    fetchSummary(baseDir, true, dateRange)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className={`app-drag flex h-12 flex-shrink-0 items-center justify-between border-b border-claude-border bg-claude-surface ${hideSidebar ? 'pl-20 pr-4' : 'px-4'}`}>
          <div className="app-no-drag min-w-0 flex-1 overflow-hidden">
            <Breadcrumbs />
          </div>
          <div className="app-no-drag flex flex-shrink-0 items-center gap-3">
            {lastFetched && (
              <span className="hidden text-xs text-claude-muted sm:block" title={`Updated ${formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}`}>
                {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-claude-border px-2.5 py-1 text-xs text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors disabled:opacity-50"
            >
              {isLoading ? <Spinner className="h-3 w-3" /> : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-claude-bg flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
