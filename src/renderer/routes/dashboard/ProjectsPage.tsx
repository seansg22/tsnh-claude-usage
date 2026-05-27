import React, { useEffect, useState } from 'react'
import { useAnalyticsStore } from '../../stores/analyticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { ProjectTable } from '../../components/tables/ProjectTable'
import { LoadingOverlay } from '../../components/ui/LoadingOverlay'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { SearchInput } from '../../components/ui/SearchInput'

export function ProjectsPage() {
  const { summary, isLoading, error, scanProgress, fetchSummary, clearError } = useAnalyticsStore()
  const { baseDir } = useSettingsStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (baseDir) fetchSummary(baseDir)
  }, [baseDir])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingOverlay progress={scanProgress} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorBanner message={error} onDismiss={clearError} />
      </div>
    )
  }

  const projects = summary?.allProjects ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-claude-text">
          Projects
          {summary && (
            <span className="ml-2 text-sm font-normal text-claude-muted">
              ({summary.projectCount})
            </span>
          )}
        </h1>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects…"
          className="w-64"
        />
      </div>

      {projects.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-sm text-claude-muted">
          No projects found.
        </div>
      ) : (
        <ProjectTable projects={projects} searchQuery={search} />
      )}
    </div>
  )
}
