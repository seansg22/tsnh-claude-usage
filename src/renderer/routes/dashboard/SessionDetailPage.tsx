import React, { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import { useParams } from 'react-router-dom'
import { useSessionStore } from '../../stores/sessionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { StatCard } from '../../components/metrics/StatCard'
import { TokenBar } from '../../components/metrics/TokenBar'
import { CostBadge } from '../../components/metrics/CostBadge'
import { JsonViewer } from '../../components/ui/JsonViewer'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { formatCost, formatTokens } from '@shared/pricing/calculator'
import { getModelDisplayName } from '@shared/pricing/models'
import { formatDistanceToNow, format } from 'date-fns'
import type { ProcessedMessage, TokenUsage } from '@shared/types/domain'
import { clsx } from 'clsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedCommand {
  name: string
  message: string
  args: string
}

function parseCommandContent(content: string): ParsedCommand | null {
  const nameMatch = content.match(/<command-name>([\s\S]*?)<\/command-name>/)
  const messageMatch = content.match(/<command-message>([\s\S]*?)<\/command-message>/)
  const argsMatch = content.match(/<command-args>([\s\S]*?)<\/command-args>/)
  if (!nameMatch && !messageMatch) return null
  return {
    name: nameMatch?.[1]?.trim() ?? '',
    message: messageMatch?.[1]?.trim() ?? '',
    args: argsMatch?.[1]?.trim() ?? '',
  }
}

/** Strip `mcp__<server>__` prefix for readability */
function shortToolName(name: string): string {
  return name.replace(/^mcp__[^_]+__/, '')
}

// ---------------------------------------------------------------------------
// Mermaid diagram
// ---------------------------------------------------------------------------

let mermaidInitialized = false
function ensureMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true })
    mermaidInitialized = true
  }
}

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureMermaid()
    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    mermaid.render(id, code).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch((err) => {
      setError(String(err?.message ?? err))
    })
  }, [code])

  if (error) {
    return (
      <pre className="my-2 rounded-lg border border-red-500/30 bg-claude-surface px-3 py-2 text-xs font-mono text-red-400/80 leading-relaxed overflow-x-auto">
        {code}
      </pre>
    )
  }

  return (
    <div
      ref={ref}
      className="my-3 flex justify-center overflow-x-auto rounded-lg border border-claude-border/30 bg-claude-surface/50 p-4 [&_svg]:max-w-full"
    />
  )
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="mt-14 mb-5 text-base font-bold text-claude-text first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mt-12 mb-4 text-sm font-bold text-claude-text first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mt-10 mb-3 text-sm font-semibold text-claude-text first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="mt-8 mb-2 text-xs font-semibold text-claude-text uppercase tracking-wide first:mt-0">{children}</h4>,
        // Paragraphs
        p: ({ children }) => <p className="mb-4 text-sm text-claude-text leading-7 last:mb-0">{children}</p>,
        // Inline code
        code: ({ children, className }) => {
          const lang = className?.replace('language-', '') ?? ''
          if (lang) return <code>{children}</code> // handled by pre
          return (
            <code className="rounded px-1.5 py-0.5 text-xs font-mono bg-claude-surface border border-claude-border/50 text-claude-text/90">
              {children}
            </code>
          )
        },
        // Code blocks — intercept mermaid, render others as styled <pre>
        pre: ({ children }) => {
          const child = React.Children.only(children) as React.ReactElement<{ className?: string; children?: string }>
          const lang = child?.props?.className?.replace('language-', '') ?? ''
          const code = String(child?.props?.children ?? '').trim()
          if (lang === 'mermaid') return <MermaidDiagram code={code} />
          return (
            <pre className="my-4 overflow-x-auto rounded-lg border border-claude-border/40 bg-claude-surface px-4 py-3.5 text-xs font-mono text-claude-text/90 leading-relaxed">
              {children}
            </pre>
          )
        },
        // Horizontal rule
        hr: () => <hr className="my-6 border-claude-border/40" />,
        // Lists
        ul: ({ children }) => <ul className="mb-4 ml-5 space-y-2 list-disc text-sm text-claude-text">{children}</ul>,
        ol: ({ children }) => <ol className="mb-4 ml-5 space-y-2 list-decimal text-sm text-claude-text">{children}</ol>,
        li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-2 border-claude-orange/40 pl-4 text-sm text-claude-muted italic">
            {children}
          </blockquote>
        ),
        // Links
        a: ({ href, children }) => (
          <a href={href} className="text-claude-orange underline underline-offset-2 hover:opacity-80" target="_blank" rel="noreferrer">
            {children}
          </a>
        ),
        // Bold / italic
        strong: ({ children }) => <strong className="font-semibold text-claude-text">{children}</strong>,
        em: ({ children }) => <em className="italic text-claude-text/80">{children}</em>,
        // Tables (GFM) — full borders on every cell
        table: ({ children }) => (
          <div className="my-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-claude-surface/60">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-white/10 last:border-0">{children}</tr>,
        th: ({ children }) => (
          <th className="border-r border-white/10 px-4 py-3 text-left font-semibold text-claude-text last:border-r-0">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-r border-white/10 px-4 py-3 text-claude-text/80 last:border-r-0">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ---------------------------------------------------------------------------
// Turn grouping
// ---------------------------------------------------------------------------

interface ToolStep {
  names: string[]   // tool_use names from one assistant entry
  result: string    // content of the following tool_result user entry (may be '')
}

interface AssistantTurn {
  kind: 'assistant'
  id: string
  model: string
  timestamp: string
  steps: ToolStep[]   // interleaved tool calls + results
  text: string        // final text content (may be '')
  totalCost: number
  totalTokens: number
  /** Running cost total up to and including this turn */
  accumulatedCost: number
  /** Running token total up to and including this turn */
  accumulatedTokens: number
}

interface UserTurn {
  kind: 'user'
  id: string
  timestamp: string
  content: string
  command: ParsedCommand | null
  /** Extracted text from <local-command-stdout> tags — renders left-aligned */
  stdout: string | null
}

type Turn = UserTurn | AssistantTurn

/** Extract text inside <local-command-stdout>…</local-command-stdout> */
function parseStdout(content: string): string | null {
  const m = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)
  return m ? m[1].trim() : null
}

function groupMessages(messages: ProcessedMessage[]): Turn[] {
  const turns: Turn[] = []
  const visible = messages.filter((m) => !m.isMeta)
  let i = 0
  let runningCost = 0
  let runningTokens = 0

  while (i < visible.length) {
    const msg = visible[i]

    // Real user message → its own turn
    if (msg.type === 'user' && !msg.isToolResult) {
      const stdout = parseStdout(msg.content)
      turns.push({
        kind: 'user',
        id: msg.uuid,
        timestamp: msg.timestamp,
        content: msg.content,
        command: stdout !== null ? null : parseCommandContent(msg.content),
        stdout,
      })
      i++
      continue
    }

    // Assistant (or orphan tool_result) → collect into one assistant turn
    if (msg.type === 'assistant' || msg.isToolResult) {
      const turnId = msg.uuid
      const model = msg.type === 'assistant' ? (msg.model ?? '') : ''
      const timestamp = msg.timestamp
      const steps: ToolStep[] = []
      let text = ''
      let totalCost = 0
      let totalTokens = 0

      while (i < visible.length) {
        const cur = visible[i]
        if (cur.type === 'user' && !cur.isToolResult) break  // real user message ends turn

        if (cur.type === 'assistant') {
          totalCost += cur.cost ?? 0
          totalTokens += cur.usage?.totalTokens ?? 0

          if (cur.toolCalls && cur.toolCalls.length > 0) {
            // Look ahead for a tool_result
            const next = visible[i + 1]
            const result =
              next && next.isToolResult
                ? (next.content ?? '')
                : ''
            steps.push({ names: cur.toolCalls, result })
            i++
            // Skip the tool_result we already consumed
            if (next && next.isToolResult) i++
          } else if (cur.content) {
            text = cur.content
            i++
          } else {
            i++
          }
        } else if (cur.isToolResult) {
          // Orphan tool_result with no preceding tool_use in this pass
          steps.push({ names: [], result: cur.content ?? '' })
          i++
        } else {
          break
        }
      }

      runningCost += totalCost
      runningTokens += totalTokens

      turns.push({
        kind: 'assistant',
        id: turnId,
        model,
        timestamp,
        steps,
        text,
        totalCost,
        totalTokens,
        accumulatedCost: runningCost,
        accumulatedTokens: runningTokens,
      })
      continue
    }

    i++
  }

  return turns
}

// ---------------------------------------------------------------------------
// Turn components
// ---------------------------------------------------------------------------

function UserMessage({ turn }: { turn: UserTurn }) {
  const cmd = turn.command

  // Command stdout → left-aligned terminal output
  if (turn.stdout !== null) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] mr-12">
          <div className="mb-1 flex items-center gap-2">
            <svg className="h-3 w-3 text-claude-muted/60" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M2 8h8M2 12h5" />
            </svg>
            <span className="text-[10px] text-claude-muted/60 font-mono">stdout</span>
            <span className="text-[10px] text-claude-muted/40">{format(new Date(turn.timestamp), 'HH:mm:ss')}</span>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs font-mono text-claude-text/70 leading-relaxed pl-5">
            {turn.stdout || <span className="italic text-claude-muted/40">(no output)</span>}
          </pre>
        </div>
      </div>
    )
  }

  // Normal user message → right-aligned bubble
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] ml-12 rounded-2xl px-4 py-3 bg-claude-orange/10 border border-claude-orange/20">
        <div className="mb-1.5 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-claude-orange">You</span>
          <span className="text-xs text-claude-muted/60">{format(new Date(turn.timestamp), 'HH:mm:ss')}</span>
        </div>

        {cmd ? (
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-claude-orange/20 px-2 py-0.5 text-xs font-mono font-semibold text-claude-orange ring-1 ring-claude-orange/30">
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.717.82-1z"/>
                <path d="M9.646 4.5H12a3 3 0 0 1 0 6H9a3 3 0 0 1-2.83-4h.893c.11.46.326.877.63 1.217A2 2 0 0 0 9 10.5h3a2 2 0 1 0 0-4h-1.535a4 4 0 0 0-.82-1z"/>
              </svg>
              {cmd.name || '/command'}
            </span>
            {cmd.args && (
              <p className="text-sm text-claude-text leading-relaxed">{cmd.args}</p>
            )}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words text-sm text-claude-text font-sans leading-relaxed">
            {turn.content || <span className="italic text-claude-muted">Empty</span>}
          </pre>
        )}
      </div>
    </div>
  )
}

function ToolRow({ step }: { step: ToolStep }) {
  const [expanded, setExpanded] = useState(false)
  const hasResult = step.result.length > 0
  const resultLines = step.result.split('\n')
  const isLong = resultLines.length > 4 || step.result.length > 300

  return (
    <div>
      {/* Tool call header — click anywhere to toggle */}
      <button
        onClick={() => isLong && setExpanded((v) => !v)}
        className={clsx(
          'flex w-full items-center gap-2 py-0.5 text-left',
          isLong && 'cursor-pointer hover:opacity-80',
        )}
      >
        <svg className="h-3.5 w-3.5 text-claude-muted flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3.5 13 6l-2.5 2.5M5.5 3.5 3 6l2.5 2.5M8.5 2l-1 12" />
        </svg>
        <div className="flex flex-1 flex-wrap gap-1">
          {step.names.length > 0 ? (
            step.names.map((n, i) => (
              <span key={i} className="text-xs font-mono text-claude-text/80 font-medium">
                {shortToolName(n)}{i < step.names.length - 1 ? ',' : ''}
              </span>
            ))
          ) : (
            <span className="text-xs font-mono text-claude-muted italic">tool result</span>
          )}
        </div>
        {/* Expand indicator on the header row */}
        {isLong && (
          <span className="text-xs text-claude-muted/60 flex-shrink-0 pr-1">
            {expanded ? '↑' : '↓'}
          </span>
        )}
      </button>

      {/* Tool result */}
      {hasResult && (
        <div className="ml-5 mt-0.5 mb-1">
          {/* Sticky collapse bar — visible only when expanded and content is long */}
          {isLong && expanded && (
            <div className="sticky top-0 z-10 -mx-1 mb-1">
              <button
                onClick={() => setExpanded(false)}
                className="w-full rounded px-1 py-0.5 text-left text-xs text-claude-muted/60 hover:text-claude-text transition-colors bg-claude-bg/90 backdrop-blur-sm"
              >
                ↑ collapse
              </button>
            </div>
          )}
          <pre
            className={clsx(
              'whitespace-pre-wrap break-words text-xs text-claude-muted font-mono leading-relaxed',
              !expanded && isLong && 'line-clamp-3',
            )}
          >
            {step.result}
          </pre>
          {/* Bottom toggle for non-expanded state */}
          {isLong && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-0.5 text-xs text-claude-muted/60 hover:text-claude-text transition-colors"
            >
              ↓ expand
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AssistantMessage({ turn }: { turn: AssistantTurn }) {
  const modelLabel = getModelDisplayName(turn.model) || 'Assistant'
  const hasCost = turn.totalCost > 0
  const hasTokens = turn.totalTokens > 0

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] mr-4 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-claude-text/70">{modelLabel}</span>
          <span className="text-[10px] text-claude-muted/60">·</span>
          <span className="text-[10px] text-claude-muted/60">{format(new Date(turn.timestamp), 'HH:mm:ss')}</span>
        </div>

        {/* Tool steps */}
        {turn.steps.length > 0 && (
          <div className="space-y-0.5 rounded-lg border border-claude-border/30 bg-claude-surface/30 px-3 py-2">
            {turn.steps.map((step, i) => (
              <ToolRow key={i} step={step} />
            ))}
          </div>
        )}

        {/* Text response — rendered as Markdown */}
        {turn.text && <MarkdownContent content={turn.text} />}

        {/* Footer: per-turn cost/tokens + running totals */}
        {(hasCost || hasTokens) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {/* This turn */}
            <div className="flex items-center gap-2">
              {hasCost && <CostBadge cost={turn.totalCost} size="sm" />}
              {hasTokens && (
                <span className="text-[11px] text-claude-muted font-mono">
                  {formatTokens(turn.totalTokens)} tokens
                </span>
              )}
            </div>
            {/* Divider */}
            <span className="text-claude-muted/30 text-xs select-none">·</span>
            {/* Accumulated */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-claude-muted/50 select-none">Σ</span>
              {hasCost && (
                <span className="text-[11px] text-claude-muted/60 font-mono">
                  {formatCost(turn.accumulatedCost)}
                </span>
              )}
              {hasTokens && (
                <span className="text-[11px] text-claude-muted/60 font-mono">
                  {formatTokens(turn.accumulatedTokens)} tokens
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationView({ messages }: { messages: ProcessedMessage[] }) {
  const turns = groupMessages(messages)
  return (
    <div className="space-y-4">
      {turns.map((turn) =>
        turn.kind === 'user' ? (
          <UserMessage key={turn.id} turn={turn} />
        ) : (
          <AssistantMessage key={turn.id} turn={turn} />
        ),
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SessionDetailPage() {
  const { projectDirName = '', sessionId = '' } = useParams<{
    projectDirName: string
    sessionId: string
  }>()
  const { baseDir } = useSettingsStore()
  const { fetchSessionDetail, getSessionDetail, isLoading, getError } = useSessionStore()
  const [showRaw, setShowRaw] = useState(false)

  const detail = getSessionDetail(sessionId)
  const loading = isLoading(sessionId)
  const error = getError(sessionId)

  useEffect(() => {
    if (sessionId && projectDirName && baseDir) {
      fetchSessionDetail(sessionId, projectDirName, baseDir)
    }
  }, [sessionId, projectDirName, baseDir])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingOverlay progress={null} message="Loading session…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner message={error} />
      </div>
    )
  }

  if (!detail) return null

  const durationMin = Math.round(detail.durationMs / 60_000)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold text-claude-text line-clamp-2">
          {detail.title ?? detail.firstPrompt ?? 'Session'}
        </h1>
        <p className="mt-0.5 text-xs text-claude-muted font-mono">{detail.sessionId}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Estimated Cost" value={formatCost(detail.estimatedCost)} accent />
        <StatCard label="Input Tokens" value={formatTokens(detail.usage.inputTokens)} />
        <StatCard label="Output Tokens" value={formatTokens(detail.usage.outputTokens)} />
        <StatCard
          label="Cache Tokens"
          value={formatTokens(detail.usage.cacheCreationTokens + detail.usage.cacheReadTokens)}
        />
      </div>

      {/* Token bar */}
      <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-claude-text">Token Breakdown</h2>
        <TokenBar usage={detail.usage} />
      </section>

      {/* Metadata */}
      <section className="rounded-xl border border-claude-border bg-claude-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-claude-text">Metadata</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs lg:grid-cols-3">
          {[
            { label: 'Model', value: getModelDisplayName(detail.primaryModel) || '—' },
            { label: 'Messages', value: detail.messageCount },
            { label: 'User Messages', value: detail.userMessageCount },
            { label: 'Duration', value: durationMin ? `${durationMin}m` : '<1m' },
            { label: 'Created', value: format(new Date(detail.createdAt), 'MMM d, HH:mm') },
            {
              label: 'Last Active',
              value: formatDistanceToNow(new Date(detail.lastActive), { addSuffix: true }),
            },
            { label: 'Project', value: detail.projectName },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-claude-muted">{label}</dt>
              <dd className="mt-0.5 font-medium text-claude-text">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Parse errors */}
      {detail.parseErrors.length > 0 && (
        <ErrorBanner
          message={`${detail.parseErrors.length} parse error(s) in this session`}
          details={detail.parseErrors}
        />
      )}

      {/* Conversation */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-claude-text">
          Conversation ({detail.messages.length} messages)
        </h2>
        <ConversationView messages={detail.messages} />
      </section>

      {/* Raw JSONL viewer */}
      <section>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-claude-text"
        >
          <svg
            className={clsx('h-4 w-4 transition-transform', showRaw && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Raw JSONL
        </button>
        {showRaw && <JsonViewer lines={detail.rawLines} />}
      </section>
    </div>
  )
}
