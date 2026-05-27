import { create } from 'zustand'
import type { AnalyticsSummary, ProjectSummary, ScanProgress } from '@shared/types/domain'

const CACHE_TTL_MS = 55_000 // 55 seconds (ensures 1-minute poll always triggers a fresh fetch)

interface AnalyticsState {
  summary: AnalyticsSummary | null
  /** Always holds the full unfiltered summary — never overwritten by a dateRange fetch. Used by the sidebar BudgetWidget. */
  unfilteredSummary: AnalyticsSummary | null
  projects: ProjectSummary[]
  isLoading: boolean
  error: string | null
  scanProgress: ScanProgress | null
  lastFetched: number | null
  availableMonths: string[] // 'YYYY-MM' sorted newest-first
  selectedMonth: string | null // null = all time

  fetchSummary: (
    baseDir: string,
    force?: boolean,
    dateRange?: { from: string; to: string },
    notificationOnly?: boolean,
  ) => Promise<void>
  setSelectedMonth: (month: string | null, baseDir: string) => Promise<void>
  invalidate: () => void
  clearError: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  summary: null,
  unfilteredSummary: null,
  projects: [],
  isLoading: false,
  error: null,
  scanProgress: null,
  lastFetched: null,
  availableMonths: [],
  selectedMonth: null,

  fetchSummary: async (
    baseDir: string,
    force = false,
    dateRange?: { from: string; to: string },
    notificationOnly = false,
  ) => {
    const state = get()

    // Skip if recently fetched (unless forced)
    if (
      !force &&
      state.lastFetched &&
      Date.now() - state.lastFetched < CACHE_TTL_MS &&
      state.summary
    ) {
      return
    }

    // Notification-only polls must not touch the display layer at all —
    // no loading spinner, no summary/projects update.
    if (!notificationOnly) {
      set({ isLoading: true, error: null, scanProgress: null })
    }

    // Subscribe to progress updates (irrelevant for silent background polls)
    const unsubscribe = window.claudeAnalytics.onProgress((progress) => {
      if (!notificationOnly) set({ scanProgress: progress })
    })

    try {
      const summary = await window.claudeAnalytics.getAnalyticsSummary(baseDir, dateRange)

      const updates: Partial<AnalyticsState> = {
        lastFetched: Date.now(),
      }

      if (!notificationOnly) {
        updates.isLoading = false
        updates.scanProgress = null
        updates.error = null
      }

      if (!dateRange) {
        // Unfiltered fetch — always refresh unfilteredSummary and availableMonths.
        // Only update summary/projects when this is a user-visible fetch (not a
        // silent background notification poll).
        const months = Array.from(
          new Set(summary.dailyCosts.map((d) => d.date.slice(0, 7))),
        )
          .sort()
          .reverse() // newest first
        updates.availableMonths = months
        updates.unfilteredSummary = summary
        if (!notificationOnly) {
          updates.summary = summary
          updates.projects = summary.allProjects
        }
      } else {
        // Filtered fetch — always display-visible (dateRange is only passed for
        // user-initiated month-filter fetches, never for notification polls).
        updates.summary = summary
        updates.projects = summary.allProjects
        updates.isLoading = false
        updates.scanProgress = null
        updates.error = null
      }

      set(updates)
    } catch (err) {
      if (!notificationOnly) {
        set({
          isLoading: false,
          scanProgress: null,
          error: err instanceof Error ? err.message : 'Failed to load analytics',
        })
      }
    } finally {
      unsubscribe()
    }
  },

  setSelectedMonth: async (month: string | null, baseDir: string) => {
    // Set selectedMonth and isLoading atomically so there is never a render where
    // the filter shows the new month while summary still holds stale data.
    set({ selectedMonth: month, isLoading: true })
    const dateRange = month
      ? { from: `${month}-01`, to: `${month}-31` }
      : undefined
    await get().fetchSummary(baseDir, true, dateRange)
  },

  invalidate: () => {
    set({
      lastFetched: null,
      summary: null,
      unfilteredSummary: null,
      projects: [],
      selectedMonth: null,
      availableMonths: [],
    })
  },

  clearError: () => {
    set({ error: null })
  },
}))
