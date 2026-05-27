import React from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { Spinner } from '../ui/LoadingOverlay'
import { formatDistanceToNow } from 'date-fns'

function Breadcrumbs() {
  const location = useLocation()
  const navigate = useNavigate()
  const parts = location.pathname.replace('/dashboard', '').split('/').filter(Boolean)

  if (parts.length === 0) return <span className="text-sm text-claude-muted">Overview</span>

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <button onClick={() => navigate('/dashboard')} className="text-claude-muted hover:text-claude-text transition-colors">
        Overview
      </button>
      {parts.map((part, i) => {
        const decoded = decodeURIComponent(part)
        const isLast = i === parts.length - 1
        return (
          <React.Fragment key={i}>
            <span className="text-claude-border">/</span>
            {isLast ? (
              <span className="text-claude-text max-w-xs truncate" title={decoded}>
                {decoded}
              </span>
            ) : (
              <button
                onClick={() => navigate('/dashboard/' + parts.slice(0, i + 1).map(encodeURIComponent).join('/'))}
                className="text-claude-muted hover:text-claude-text transition-colors max-w-xs truncate"
              >
                {decoded}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export function DashboardLayout() {
  const { isLoading, lastFetched, fetchSummary } = useAnalyticsStore()
  const { baseDir } = useSettingsStore()

  const handleRefresh = () => {
    if (baseDir) fetchSummary(baseDir, true)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="app-drag flex h-12 flex-shrink-0 items-center justify-between border-b border-claude-border bg-claude-surface px-4">
          <div className="app-no-drag">
            <Breadcrumbs />
          </div>
          <div className="app-no-drag flex items-center gap-3">
            {lastFetched && (
              <span className="text-xs text-claude-muted">
                Updated {formatDistanceToNow(new Date(lastFetched), { addSuffix: true })}
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
        <main className="flex-1 overflow-y-auto bg-claude-bg p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
