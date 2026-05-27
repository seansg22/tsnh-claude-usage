import React from 'react'
import { clsx } from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: number
  icon?: React.ReactNode
  className?: string
  accent?: boolean
}

export function StatCard({ label, value, sub, trend, icon, className, accent }: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-claude-border bg-claude-surface p-4',
        accent && 'border-claude-orange/30',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-claude-muted">{label}</p>
        {icon && <span className="text-claude-muted">{icon}</span>}
      </div>
      <p className={clsx('mt-2 text-2xl font-bold', accent ? 'text-claude-orange' : 'text-claude-text')}>
        {value}
      </p>
      {(sub || trend !== undefined) && (
        <div className="mt-1 flex items-center gap-2">
          {sub && <p className="text-xs text-claude-muted">{sub}</p>}
          {trend !== undefined && (
            <span
              className={clsx(
                'text-xs font-medium',
                trend > 0 ? 'text-red-400' : trend < 0 ? 'text-green-400' : 'text-claude-muted',
              )}
            >
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}
