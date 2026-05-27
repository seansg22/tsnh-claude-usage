import { create } from 'zustand'
import type { ProjectDetail } from '@shared/types/domain'

interface ProjectState {
  projectDetails: Map<string, ProjectDetail>
  loadingProjects: Set<string>
  errors: Map<string, string>

  fetchProjectDetail: (projectDirName: string, baseDir: string) => Promise<void>
  getProjectDetail: (projectDirName: string) => ProjectDetail | undefined
  isLoading: (projectDirName: string) => boolean
  getError: (projectDirName: string) => string | undefined
  invalidate: (projectDirName?: string) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectDetails: new Map(),
  loadingProjects: new Set(),
  errors: new Map(),

  fetchProjectDetail: async (projectDirName: string, baseDir: string) => {
    const state = get()

    // Skip if already loading or cached
    if (state.loadingProjects.has(projectDirName)) return
    if (state.projectDetails.has(projectDirName)) return

    set((s) => ({
      loadingProjects: new Set([...s.loadingProjects, projectDirName]),
    }))

    try {
      const detail = await window.claudeAnalytics.getProjectDetail(projectDirName, baseDir)
      set((s) => {
        const newDetails = new Map(s.projectDetails)
        newDetails.set(projectDirName, detail)
        const newLoading = new Set(s.loadingProjects)
        newLoading.delete(projectDirName)
        const newErrors = new Map(s.errors)
        newErrors.delete(projectDirName)
        return { projectDetails: newDetails, loadingProjects: newLoading, errors: newErrors }
      })
    } catch (err) {
      set((s) => {
        const newLoading = new Set(s.loadingProjects)
        newLoading.delete(projectDirName)
        const newErrors = new Map(s.errors)
        newErrors.set(projectDirName, err instanceof Error ? err.message : 'Failed to load project')
        return { loadingProjects: newLoading, errors: newErrors }
      })
    }
  },

  getProjectDetail: (projectDirName: string) => {
    return get().projectDetails.get(projectDirName)
  },

  isLoading: (projectDirName: string) => {
    return get().loadingProjects.has(projectDirName)
  },

  getError: (projectDirName: string) => {
    return get().errors.get(projectDirName)
  },

  invalidate: (projectDirName?: string) => {
    if (projectDirName) {
      set((s) => {
        const newDetails = new Map(s.projectDetails)
        newDetails.delete(projectDirName)
        return { projectDetails: newDetails }
      })
    } else {
      set({ projectDetails: new Map() })
    }
  },
}))
