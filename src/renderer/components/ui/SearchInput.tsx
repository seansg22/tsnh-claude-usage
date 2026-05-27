import React, { useEffect, useState } from 'react'
import { clsx } from 'clsx'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  debounceMs = 200,
}: SearchInputProps) {
  const [local, setLocal] = useState(value)

  // Sync external value changes
  useEffect(() => {
    setLocal(value)
  }, [value])

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [local, debounceMs])

  return (
    <div className={clsx('relative', className)}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-claude-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full rounded-lg border border-claude-border bg-claude-bg pl-9 pr-8 py-2',
          'text-sm text-claude-text placeholder-claude-muted',
          'focus:outline-none focus:border-claude-orange/50 focus:ring-1 focus:ring-claude-orange/20',
          'transition-colors',
        )}
      />
      {local && (
        <button
          onClick={() => {
            setLocal('')
            onChange('')
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-claude-muted hover:text-claude-text transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
