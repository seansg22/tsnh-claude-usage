import React from 'react'
import { format, parseISO } from 'date-fns'

interface MonthFilterProps {
  months: string[] // 'YYYY-MM' sorted newest-first
  selected: string | null // null = all time
  onChange: (month: string | null) => void
}

export function MonthFilter({ months, selected, onChange }: MonthFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-claude-muted">Period</span>
      <div className="relative">
        <select
          value={selected ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
          className="appearance-none rounded-lg border border-claude-border bg-claude-bg pl-3 pr-8 py-1.5 text-sm text-claude-text focus:outline-none focus:border-claude-orange/50 focus:ring-1 focus:ring-claude-orange/20 transition-colors cursor-pointer"
        >
          <option value="">All time</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {format(parseISO(`${m}-01`), 'MMMM yyyy')}
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
  )
}
