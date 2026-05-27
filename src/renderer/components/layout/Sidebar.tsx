import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAnalyticsStore } from '../../stores/analyticsStore'

interface NavItemProps {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

function NavItem({ to, label, icon, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-claude-orange/15 text-claude-orange'
            : 'text-claude-muted hover:bg-claude-surface hover:text-claude-text',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { baseDir, setBaseDir } = useSettingsStore()
  const { invalidate } = useAnalyticsStore()
  const navigate = useNavigate()

  const handleChangeDir = async () => {
    const dir = await window.claudeAnalytics.selectDirectory()
    if (dir) {
      setBaseDir(dir)
      invalidate()
      navigate('/dashboard')
    }
  }

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-claude-border bg-claude-surface">
      {/* Logo / app name */}
      <div className="app-drag flex items-center gap-2.5 px-4 py-4 pt-14">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-claude-orange text-white text-xs font-bold">
          CU
        </div>
        <span className="text-sm font-semibold text-claude-text">TSNH Claude Usage</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        <NavItem
          to="/dashboard"
          end
          label="Overview"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
        <NavItem
          to="/dashboard/projects"
          label="Projects"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
      </nav>

      {/* Footer: data directory */}
      <div className="border-t border-claude-border p-3">
        <p className="mb-1 text-xs font-medium text-claude-muted">Data directory</p>
        <p className="mb-2 truncate text-xs text-claude-text" title={baseDir}>
          {baseDir || '—'}
        </p>
        <button
          onClick={handleChangeDir}
          className="w-full rounded-lg border border-claude-border px-2 py-1.5 text-xs text-claude-muted hover:border-claude-orange/30 hover:text-claude-text transition-colors"
        >
          Change directory
        </button>
      </div>
    </aside>
  )
}
