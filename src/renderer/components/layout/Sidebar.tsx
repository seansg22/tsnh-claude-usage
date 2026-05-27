import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useCurrencyConverter } from '../../hooks/useCurrencyConverter'

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

function BudgetWidget() {
  const { billingCycleDay, monthlyBudget } = useSettingsStore()
  // Use unfilteredSummary so the sidebar always reflects the actual current period,
  // regardless of whatever month filter is active on the Overview page.
  const { unfilteredSummary } = useAnalyticsStore()
  const { convertCost, formatDisplayCost, currencySymbol } = useCurrencyConverter()

  const { periodStart, resetDate, daysLeft } = useMemo(
    () => getBillingPeriod(billingCycleDay),
    [billingCycleDay],
  )

  const rawTodayCost = useMemo(() => {
    if (!unfilteredSummary) return 0
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return unfilteredSummary.dailyCosts
      .filter((d) => d.date === todayStr)
      .reduce((sum, d) => sum + d.cost, 0)
  }, [unfilteredSummary])

  const rawPeriodCost = useMemo(() => {
    if (!unfilteredSummary) return 0
    const startStr = format(periodStart, 'yyyy-MM-dd')
    return unfilteredSummary.dailyCosts
      .filter((d) => d.date >= startStr)
      .reduce((sum, d) => sum + d.cost, 0)
  }, [unfilteredSummary, periodStart])

  const effectiveTodayCost = convertCost(rawTodayCost)
  const effectivePeriodCost = convertCost(rawPeriodCost)
  const pct = monthlyBudget != null ? Math.min(100, (effectivePeriodCost / monthlyBudget) * 100) : null
  const barColor =
    pct == null ? ''
    : pct >= 90 ? 'bg-red-500'
    : pct >= 75 ? 'bg-yellow-400'
    : 'bg-green-500'

  return (
    <div className="mx-2 mb-3 rounded-xl border border-claude-border bg-claude-bg px-3.5 py-3 space-y-3">
      {/* This Period */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">This Period</p>
        <p className="mt-1 text-2xl font-bold text-claude-orange leading-none">
          {formatDisplayCost(rawPeriodCost)}
        </p>
      </div>

      {/* Budget progress */}
      {pct != null && (
        <div className="space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-claude-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-claude-muted">
              of {currencySymbol}{monthlyBudget!.toLocaleString()}
            </span>
            <span
              className={`text-xs font-semibold ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-yellow-400' : 'text-green-400'}`}
            >
              {pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Reset date */}
      <p className="text-xs text-claude-muted">
        Resets {format(resetDate, 'MMM d')}
        <span className="ml-1 text-claude-muted/60">· {daysLeft}d left</span>
      </p>

      <div className="h-px bg-claude-border" />

      {/* Today */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">Today</p>
        <p className="mt-1 text-xl font-bold text-claude-text leading-none">
          {formatDisplayCost(rawTodayCost)}
        </p>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-claude-border bg-claude-surface">
      {/* Logo / app name */}
      <div className="app-drag flex items-center gap-2.5 px-4 py-4 pt-14">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-claude-orange text-white text-xs font-bold">
          CU
        </div>
        <span className="text-sm font-semibold text-claude-text">TSNH Claude Usage</span>
      </div>

      {/* Budget widget */}
      <BudgetWidget />

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
        <NavItem
          to="/dashboard/sessions"
          label="Sessions"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <NavItem
          to="/dashboard/notifications"
          label="Notifications"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
      </nav>

      {/* Settings */}
      <div className="border-t border-claude-border pt-2">
        <div className="px-2 pb-2">
          <NavItem
            to="/dashboard/settings"
            label="Settings"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>
      </div>
    </aside>
  )
}
