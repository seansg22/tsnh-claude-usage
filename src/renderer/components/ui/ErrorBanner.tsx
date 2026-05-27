import React, { useState } from 'react'

interface ErrorBannerProps {
  message: string
  details?: string[]
  onDismiss?: () => void
}

export function ErrorBanner({ message, details, onDismiss }: ErrorBannerProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-red-300">{message}</span>
        </div>
        <div className="flex items-center gap-2">
          {details && details.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              {expanded ? 'Hide' : `Details (${details.length})`}
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="text-red-400 hover:text-red-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {expanded && details && (
        <ul className="mt-2 space-y-0.5 pl-6 text-xs text-red-400">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
