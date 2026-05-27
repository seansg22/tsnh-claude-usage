import { create } from 'zustand'
import type { SessionDetail } from '@shared/types/domain'

interface SessionState {
  sessionDetails: Map<string, SessionDetail>
  loadingSessions: Set<string>
  errors: Map<string, string>

  fetchSessionDetail: (sessionId: string, projectDirName: string, baseDir: string) => Promise<void>
  getSessionDetail: (sessionId: string) => SessionDetail | undefined
  isLoading: (sessionId: string) => boolean
  getError: (sessionId: string) => string | undefined
  invalidate: (sessionId?: string) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionDetails: new Map(),
  loadingSessions: new Set(),
  errors: new Map(),

  fetchSessionDetail: async (sessionId: string, projectDirName: string, baseDir: string) => {
    const state = get()
    if (state.loadingSessions.has(sessionId)) return
    if (state.sessionDetails.has(sessionId)) return

    set((s) => ({
      loadingSessions: new Set([...s.loadingSessions, sessionId]),
    }))

    try {
      const detail = await window.claudeAnalytics.getSessionDetail(sessionId, projectDirName, baseDir)
      set((s) => {
        const newDetails = new Map(s.sessionDetails)
        newDetails.set(sessionId, detail)
        const newLoading = new Set(s.loadingSessions)
        newLoading.delete(sessionId)
        const newErrors = new Map(s.errors)
        newErrors.delete(sessionId)
        return { sessionDetails: newDetails, loadingSessions: newLoading, errors: newErrors }
      })
    } catch (err) {
      set((s) => {
        const newLoading = new Set(s.loadingSessions)
        newLoading.delete(sessionId)
        const newErrors = new Map(s.errors)
        newErrors.set(sessionId, err instanceof Error ? err.message : 'Failed to load session')
        return { loadingSessions: newLoading, errors: newErrors }
      })
    }
  },

  getSessionDetail: (sessionId: string) => {
    return get().sessionDetails.get(sessionId)
  },

  isLoading: (sessionId: string) => {
    return get().loadingSessions.has(sessionId)
  },

  getError: (sessionId: string) => {
    return get().errors.get(sessionId)
  },

  invalidate: (sessionId?: string) => {
    if (sessionId) {
      set((s) => {
        const newDetails = new Map(s.sessionDetails)
        newDetails.delete(sessionId)
        return { sessionDetails: newDetails }
      })
    } else {
      set({ sessionDetails: new Map() })
    }
  },
}))
