import React from 'react'
import type { ScanProgress } from '@shared/types/domain'

interface LoadingOverlayProps {
  progress: ScanProgress | null
  message?: string
}

export function LoadingOverlay({ progress, message }: LoadingOverlayProps) {
  const percentage =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : null

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Spinner */}
      <svg
        className="h-8 w-8 animate-spin text-claude-orange"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {/* Message */}
      <div className="text-center">
        <p className="text-sm text-claude-text">
          {message ?? (progress?.phase === 'scanning' ? 'Scanning files…' : 'Parsing sessions…')}
        </p>
        {progress?.currentFile && (
          <p className="mt-1 text-xs text-claude-muted truncate max-w-xs">
            {progress.currentFile}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {percentage !== null && (
        <div className="w-48">
          <div className="mb-1 flex justify-between text-xs text-claude-muted">
            <span>
              {progress!.current}/{progress!.total} files
            </span>
            <span>{percentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-claude-border">
            <div
              className="h-full rounded-full bg-claude-orange transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline loading spinner (small).
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin text-claude-orange ${className ?? ''}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
