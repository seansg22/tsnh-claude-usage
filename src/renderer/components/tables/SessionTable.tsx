import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SessionSummary } from '@shared/types/domain'
import { formatTokens } from '@shared/pricing/calculator'
import { getModelDisplayName } from '@shared/pricing/models'
import { formatDistanceToNow } from 'date-fns'
import { CostBadge } from '../metrics/CostBadge'
import { clsx } from 'clsx'

/** Extract a human-readable label + optional type tag from a raw firstPrompt string.
 *  Handles XML-like tags injected by the harness:
 *  <command-name>/clear</command-name> <command-message>…</command-message>
 */
function parsePrompt(raw: string): { label: string; kind: 'command' | 'skill' | 'text' } {
  const cmdMatch = raw.match(/<command-name>(.*?)<\/command-name>/)
  if (cmdMatch) return { label: cmdMatch[1].trim(), kind: 'command' }

  const msgMatch = raw.match(/<command-message>(.*?)<\/command-message>/)
  if (msgMatch) return { label: msgMatch[1].trim(), kind: 'skill' }

  // Strip any remaining tags and collapse whitespace
  return { label: raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), kind: 'text' }
}

type SortField = 'lastActive' | 'cost' | 'tokens' | 'messages'
type SortDir = 'asc' | 'desc'

interface SessionTableProps {
  sessions: SessionSummary[]
  projectDirName?: string
  searchQuery?: string
  showProject?: boolean
  emptyMessage?: string
  /** Controlled sort — when provided, sort state is managed externally (e.g. persisted store) */
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (field: SortField, dir: SortDir) => void
  /**
   * When true the `sessions` array is already sorted by the caller; the table
   * renders it as-is (only header arrows are shown for the active column).
   */
  presorted?: boolean
}

export function SessionTable({ sessions, projectDirName, searchQuery = '', showProject = false, emptyMessage, sortField: controlledSortField, sortDir: controlledSortDir, onSort, presorted = false }: SessionTableProps) {
  const navigate = useNavigate()
  const [localSortField, setLocalSortField] = useState<SortField>('lastActive')
  const [localSortDir, setLocalSortDir] = useState<SortDir>('desc')

  const sortField = controlledSortField ?? localSortField
  const sortDir = controlledSortDir ?? localSortDir

  const filtered = useMemo(() => {
    if (!searchQuery) return sessions
    const q = searchQuery.toLowerCase()
    return sessions.filter(
      (s) =>
        s.firstPrompt?.toLowerCase().includes(q) ||
        s.sessionId.toLowerCase().includes(q) ||
        s.primaryModel.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q),
    )
  }, [sessions, searchQuery])

  // When `presorted` is true the caller has already applied the global sort before
  // paginating; skip the local sort so the page order isn't changed a second time.
  const sorted = useMemo(() => {
    if (presorted) return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'lastActive':
          cmp = a.lastActive.localeCompare(b.lastActive)
          break
        case 'cost':
          cmp = a.estimatedCost - b.estimatedCost
          break
        case 'tokens':
          cmp = a.usage.totalTokens - b.usage.totalTokens
          break
        case 'messages':
          cmp = a.messageCount - b.messageCount
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir, presorted])

  const toggleSort = (field: SortField) => {
    const newDir = sortField === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
    if (onSort) {
      onSort(field, newDir)
    } else {
      setLocalSortField(field)
      setLocalSortDir(newDir)
    }
  }

  const handleRowClick = (session: SessionSummary) => {
    const dirName = projectDirName ?? session.projectDirName
    navigate(`/dashboard/projects/${encodeURIComponent(dirName)}/sessions/${encodeURIComponent(session.sessionId)}`)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-claude-border ml-1">↕</span>
    return (
      <span className="text-claude-orange ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
    )
  }

  const HeaderCell = ({
    field,
    label,
    className,
  }: {
    field: SortField
    label: string
    className?: string
  }) => (
    <th
      className={clsx(
        'cursor-pointer select-none px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-claude-muted hover:text-claude-text transition-colors',
        className,
      )}
      onClick={() => toggleSort(field)}
    >
      {label}
      <SortIcon field={field} />
    </th>
  )

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-claude-muted">
        {emptyMessage ?? (searchQuery ? 'No sessions match your search.' : 'No sessions found.')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-claude-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-claude-border bg-claude-surface">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-claude-muted w-[400px]">
                Prompt
              </th>
              {showProject && (
                <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-claude-muted w-32">
                  Project
                </th>
              )}
              <HeaderCell field="cost" label="Cost" className="w-24" />
              <HeaderCell field="tokens" label="Tokens" className="w-24" />
              <HeaderCell field="messages" label="Msgs" className="w-16" />
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-claude-muted w-40">
                Model
              </th>
              <HeaderCell field="lastActive" label="Last Active" className="w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-claude-border/50">
            {sorted.map((session, idx) => (
              <tr
                key={session.sessionId ? `${session.sessionId}-${session.projectDirName}` : `${session.projectDirName}-${idx}`}
                className="cursor-pointer hover:bg-claude-surface/50 transition-colors group"
                onClick={() => handleRowClick(session)}
              >
                <td className="px-3 py-3 max-w-[400px] w-[400px]">
                  {(() => {
                    if (session.title) {
                      return (
                        <p className="text-sm text-claude-text truncate group-hover:text-white">
                          {session.title}
                        </p>
                      )
                    }
                    if (!session.firstPrompt) {
                      return (
                        <p className="text-sm text-claude-muted italic">No prompt</p>
                      )
                    }
                    const { label, kind } = parsePrompt(session.firstPrompt)
                    return (
                      <p className="flex items-center gap-1.5 text-sm truncate group-hover:text-white">
                        <span className={`truncate ${kind !== 'text' ? 'font-mono text-claude-text' : 'text-claude-text'}`}>
                          {label}
                        </span>
                      </p>
                    )
                  })()}
                  <p className="mt-0.5 text-xs text-claude-muted font-mono">
                    {session.sessionId.slice(0, 8)}…
                  </p>
                </td>
                {showProject && (
                  <td className="px-3 py-3">
                    <span className="text-xs text-claude-muted truncate max-w-[8rem] block">
                      {session.projectName}
                    </span>
                  </td>
                )}
                <td className="px-3 py-3">
                  <CostBadge cost={session.estimatedCost} size="sm" />
                </td>
                <td className="px-3 py-3 text-xs text-claude-muted font-mono">
                  {formatTokens(session.usage.totalTokens)}
                </td>
                <td className="px-3 py-3 text-xs text-claude-muted">{session.messageCount}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-xs text-claude-muted">
                    {getModelDisplayName(session.primaryModel) || '—'}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-claude-muted whitespace-nowrap">
                  {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
