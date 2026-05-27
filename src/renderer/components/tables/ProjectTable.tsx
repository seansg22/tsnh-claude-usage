import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ProjectSummary } from '@shared/types/domain'
import { formatCost, formatTokens } from '@shared/pricing/calculator'
import { formatDistanceToNow } from 'date-fns'
import { CostBadge } from '../metrics/CostBadge'

type SortField = 'lastActive' | 'cost' | 'sessions' | 'tokens'
type SortDir = 'asc' | 'desc'

interface ProjectTableProps {
  projects: ProjectSummary[]
  searchQuery?: string
  compact?: boolean
  /** Controlled sort — when provided, sort state is managed externally (e.g. persisted store) */
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (field: SortField, dir: SortDir) => void
}

export function ProjectTable({ projects, searchQuery = '', compact = false, sortField: controlledSortField, sortDir: controlledSortDir, onSort }: ProjectTableProps) {
  const navigate = useNavigate()
  const [localSortField, setLocalSortField] = useState<SortField>('lastActive')
  const [localSortDir, setLocalSortDir] = useState<SortDir>('desc')

  const sortField = controlledSortField ?? localSortField
  const sortDir = controlledSortDir ?? localSortDir

  const filtered = useMemo(() => {
    if (!searchQuery) return projects
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) => p.projectName.toLowerCase().includes(q) || p.projectPath.toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'lastActive':
          cmp = a.lastActive.localeCompare(b.lastActive)
          break
        case 'cost':
          cmp = a.estimatedCost - b.estimatedCost
          break
        case 'sessions':
          cmp = a.sessionCount - b.sessionCount
          break
        case 'tokens':
          cmp = a.usage.totalTokens - b.usage.totalTokens
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    const newDir = sortField === field ? (sortDir === 'asc' ? 'desc' : 'asc') : 'desc'
    if (onSort) {
      onSort(field, newDir)
    } else {
      setLocalSortField(field)
      setLocalSortDir(newDir)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-claude-border ml-1">↕</span>
    return <span className="text-claude-orange ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-claude-muted">
        {searchQuery ? 'No projects match your search.' : 'No projects found.'}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-claude-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] table-fixed">
          <colgroup>
            <col className="w-auto" />
            <col className="w-28" />
            <col className="w-28" />
            {!compact && (
              <>
                <col className="w-24" />
                <col className="w-36" />
              </>
            )}
          </colgroup>
          <thead className="border-b border-claude-border bg-claude-surface">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-claude-muted whitespace-nowrap">
                Project
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-claude-muted hover:text-claude-text whitespace-nowrap"
                onClick={() => toggleSort('cost')}
              >
                Cost <SortIcon field="cost" />
              </th>
              <th
                className="cursor-pointer px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-claude-muted hover:text-claude-text whitespace-nowrap"
                onClick={() => toggleSort('tokens')}
              >
                Tokens <SortIcon field="tokens" />
              </th>
              {!compact && (
                <>
                  <th
                    className="cursor-pointer px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-claude-muted hover:text-claude-text whitespace-nowrap"
                    onClick={() => toggleSort('sessions')}
                  >
                    Sessions <SortIcon field="sessions" />
                  </th>
                  <th
                    className="cursor-pointer px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-claude-muted hover:text-claude-text whitespace-nowrap"
                    onClick={() => toggleSort('lastActive')}
                  >
                    Last Active <SortIcon field="lastActive" />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-claude-border/50">
            {sorted.map((project) => (
              <tr
                key={project.projectDirName}
                className="cursor-pointer hover:bg-claude-surface/50 transition-colors group"
                onClick={() =>
                  navigate(`/dashboard/projects/${encodeURIComponent(project.projectDirName)}`)
                }
              >
                <td className="px-3 py-3 min-w-0">
                  <p className="text-sm font-medium text-claude-text group-hover:text-white truncate">
                    {project.projectName}
                  </p>
                  <p className="mt-0.5 text-xs text-claude-muted truncate" title={project.projectPath}>
                    {project.projectPath}
                  </p>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end">
                    <CostBadge cost={project.estimatedCost} size="sm" />
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-xs text-claude-muted font-mono whitespace-nowrap">
                  {formatTokens(project.usage.totalTokens)}
                </td>
                {!compact && (
                  <>
                    <td className="px-3 py-3 text-right text-xs text-claude-muted">{project.sessionCount}</td>
                    <td className="px-3 py-3 text-right text-xs text-claude-muted whitespace-nowrap">
                      {formatDistanceToNow(new Date(project.lastActive), { addSuffix: true })}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
