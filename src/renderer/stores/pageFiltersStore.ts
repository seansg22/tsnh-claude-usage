import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ProjectsSortField = 'lastActive' | 'cost' | 'sessions' | 'tokens'
type SessionsSortField = 'lastActive' | 'cost' | 'tokens' | 'messages'
type SortDir = 'asc' | 'desc'

interface PageFiltersState {
  // Projects page
  projectsSearch: string
  projectsSortField: ProjectsSortField
  projectsSortDir: SortDir

  // Sessions page
  sessionsSearch: string
  sessionsProjectFilter: string
  sessionsPage: number
  sessionsSortField: SessionsSortField
  sessionsSortDir: SortDir

  // Actions
  setProjectsSearch: (s: string) => void
  setProjectsSort: (field: ProjectsSortField, dir: SortDir) => void
  setSessionsSearch: (s: string) => void
  setSessionsProjectFilter: (f: string) => void
  setSessionsPage: (p: number) => void
  setSessionsSort: (field: SessionsSortField, dir: SortDir) => void
}

export const usePageFiltersStore = create<PageFiltersState>()(
  persist(
    (set) => ({
      projectsSearch: '',
      projectsSortField: 'lastActive',
      projectsSortDir: 'desc',

      sessionsSearch: '',
      sessionsProjectFilter: '',
      sessionsPage: 0,
      sessionsSortField: 'lastActive',
      sessionsSortDir: 'desc',

      setProjectsSearch: (s) => set({ projectsSearch: s }),
      setProjectsSort: (field, dir) => set({ projectsSortField: field, projectsSortDir: dir }),
      setSessionsSearch: (s) => set({ sessionsSearch: s }),
      setSessionsProjectFilter: (f) => set({ sessionsProjectFilter: f }),
      setSessionsPage: (p) => set({ sessionsPage: p }),
      setSessionsSort: (field, dir) => set({ sessionsSortField: field, sessionsSortDir: dir }),
    }),
    {
      name: 'claude-usage-page-filters',
      partialize: (state) => ({
        projectsSearch: state.projectsSearch,
        projectsSortField: state.projectsSortField,
        projectsSortDir: state.projectsSortDir,
        sessionsSearch: state.sessionsSearch,
        sessionsProjectFilter: state.sessionsProjectFilter,
        sessionsPage: state.sessionsPage,
        sessionsSortField: state.sessionsSortField,
        sessionsSortDir: state.sessionsSortDir,
      }),
    },
  ),
)
