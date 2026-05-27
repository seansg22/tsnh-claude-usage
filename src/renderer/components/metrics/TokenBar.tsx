import React from 'react'
import type { TokenUsage } from '@shared/types/domain'
import { formatTokens } from '@shared/pricing/calculator'

interface TokenBarProps {
  usage: TokenUsage
  showLabels?: boolean
}

const SEGMENT_COLORS = {
  input: 'bg-blue-500',
  output: 'bg-green-500',
  cacheCreate: 'bg-orange-500',
  cacheRead: 'bg-yellow-500',
}

export function TokenBar({ usage, showLabels = true }: TokenBarProps) {
  const total = usage.totalTokens
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-claude-border" />
  }

  const segments = [
    { key: 'input', label: 'Input', tokens: usage.inputTokens, color: SEGMENT_COLORS.input },
    { key: 'output', label: 'Output', tokens: usage.outputTokens, color: SEGMENT_COLORS.output },
    {
      key: 'cacheCreate',
      label: 'Cache+',
      tokens: usage.cacheCreationTokens,
      color: SEGMENT_COLORS.cacheCreate,
    },
    {
      key: 'cacheRead',
      label: 'Cache↑',
      tokens: usage.cacheReadTokens,
      color: SEGMENT_COLORS.cacheRead,
    },
  ].filter((s) => s.tokens > 0)

  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={seg.color}
            style={{ width: `${(seg.tokens / total) * 100}%` }}
            title={`${seg.label}: ${formatTokens(seg.tokens)}`}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {segments.map((seg) => (
            <span key={seg.key} className="flex items-center gap-1 text-xs text-claude-muted">
              <span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
              {seg.label}: {formatTokens(seg.tokens)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
