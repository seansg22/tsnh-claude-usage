import React from 'react'
import type { TokenUsage } from '@shared/types/domain'
import { formatTokens } from '@shared/pricing/calculator'

interface ContextBreakdownProps {
  /** Session-level aggregated usage */
  usage: TokenUsage
  /** Context window size in tokens (from getContextWindowSize) */
  contextWindowSize: number
  /** Usage from the last assistant turn (for peak context window view) */
  lastTurnUsage?: TokenUsage
}

interface Row {
  key: string
  label: string
  tokens: number
  dotClass: string
  barClass: string
  dimmed?: boolean
}

function fmt(n: number): string {
  return formatTokens(n)
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${((n / total) * 100).toFixed(1)}%`
}

export function ContextBreakdown({ usage, contextWindowSize, lastTurnUsage }: ContextBreakdownProps) {
  const sessionTotal = usage.totalTokens

  const rows: Row[] = [
    {
      key: 'cacheRead',
      label: 'Cache read',
      tokens: usage.cacheReadTokens,
      dotClass: 'bg-yellow-400',
      barClass: 'bg-yellow-400',
    },
    {
      key: 'cacheWrite',
      label: 'Cache write',
      tokens: usage.cacheCreationTokens,
      dotClass: 'bg-orange-400',
      barClass: 'bg-orange-400',
    },
    {
      key: 'input',
      label: 'Input',
      tokens: usage.inputTokens,
      dotClass: 'bg-blue-400',
      barClass: 'bg-blue-400',
    },
    {
      key: 'output',
      label: 'Output',
      tokens: usage.outputTokens,
      dotClass: 'bg-green-400',
      barClass: 'bg-green-400',
    },
  ].filter((r) => r.tokens > 0)

  // Peak context window calculation (last turn)
  const peakEffectiveInput = lastTurnUsage
    ? lastTurnUsage.inputTokens + lastTurnUsage.cacheReadTokens + lastTurnUsage.cacheCreationTokens
    : null
  const peakPct = peakEffectiveInput != null ? (peakEffectiveInput / contextWindowSize) * 100 : null
  const peakFreeSpace = peakEffectiveInput != null ? contextWindowSize - peakEffectiveInput : null

  const maxBarTokens = sessionTotal || 1
  const BAR_MAX_W = 80 // px for the bar column

  return (
    <section className="rounded-lg border border-claude-border bg-claude-surface px-3 py-2.5 space-y-2">
      <h2 className="text-xs font-semibold text-claude-text">Token Breakdown</h2>

      {/* Category rows */}
      <div className="font-mono text-xs space-y-0.5">
        {/* Header */}
        <div className="grid gap-2 text-claude-muted pb-0.5 border-b border-claude-border"
          style={{ gridTemplateColumns: '10px 1fr auto 44px 40px' }}>
          <span />
          <span>Category</span>
          <span />
          <span className="text-right">Tokens</span>
          <span className="text-right">%</span>
        </div>

        {rows.map((row) => {
          const barW = Math.round((row.tokens / maxBarTokens) * BAR_MAX_W)
          return (
            <div
              key={row.key}
              className="grid gap-2 items-center"
              style={{ gridTemplateColumns: '10px 1fr auto 44px 40px' }}
            >
              {/* Dot */}
              <span className={`inline-block h-2 w-2 rounded-full ${row.dotClass}`} />
              {/* Label */}
              <span className="text-claude-text">{row.label}</span>
              {/* Bar */}
              <span className="flex items-center">
                <span
                  className={`h-1.5 rounded-sm ${row.barClass} opacity-80`}
                  style={{ width: `${barW}px`, minWidth: row.tokens > 0 ? '2px' : '0' }}
                />
              </span>
              {/* Tokens */}
              <span className="text-right text-claude-text tabular-nums">{fmt(row.tokens)}</span>
              {/* Percent */}
              <span className="text-right text-claude-muted tabular-nums">
                {pct(row.tokens, sessionTotal)}
              </span>
            </div>
          )
        })}

        {/* Total row */}
        <div
          className="grid gap-2 items-center pt-0.5 mt-0.5 border-t border-claude-border"
          style={{ gridTemplateColumns: '10px 1fr auto 44px 40px' }}
        >
          <span />
          <span className="text-claude-muted">Total</span>
          <span />
          <span className="text-right font-semibold text-claude-text tabular-nums">
            {fmt(sessionTotal)}
          </span>
          <span />
        </div>
      </div>

      {/* Peak context window usage */}
      {peakEffectiveInput != null && peakPct != null && peakFreeSpace != null && (
        <div className="space-y-1 pt-1.5 border-t border-claude-border">
          <div className="flex items-start justify-between text-xs">
            <span className="text-claude-muted font-mono">Peak context window (last turn)</span>
            <span className="font-mono text-claude-text tabular-nums">
              {fmt(peakEffectiveInput)}&nbsp;/&nbsp;{fmt(contextWindowSize)}&nbsp;
              <span className="text-claude-muted">({peakPct.toFixed(1)}%)</span>
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full overflow-hidden bg-claude-border flex">
            {/* Used: input portion */}
            <div
              className="bg-blue-500 h-full"
              style={{ width: `${(lastTurnUsage!.inputTokens / contextWindowSize) * 100}%` }}
              title={`Input: ${fmt(lastTurnUsage!.inputTokens)}`}
            />
            {/* Used: cache read portion */}
            <div
              className="bg-yellow-400 h-full"
              style={{ width: `${(lastTurnUsage!.cacheReadTokens / contextWindowSize) * 100}%` }}
              title={`Cache read: ${fmt(lastTurnUsage!.cacheReadTokens)}`}
            />
            {/* Used: cache write portion */}
            <div
              className="bg-orange-400 h-full"
              style={{ width: `${(lastTurnUsage!.cacheCreationTokens / contextWindowSize) * 100}%` }}
              title={`Cache write: ${fmt(lastTurnUsage!.cacheCreationTokens)}`}
            />
            {/* Free space is the remainder (bg-claude-border) */}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-claude-muted font-mono flex-wrap">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              Input {fmt(lastTurnUsage!.inputTokens)}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" />
              Cached {fmt(lastTurnUsage!.cacheReadTokens)}
            </span>
            {lastTurnUsage!.cacheCreationTokens > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                Written {fmt(lastTurnUsage!.cacheCreationTokens)}
              </span>
            )}
            <span className="flex items-center gap-1 ml-auto">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-claude-border border border-claude-muted/30" />
              Free {fmt(peakFreeSpace)}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
