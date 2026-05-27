import type {
  ProjectSummary,
  ProjectDetail,
  SessionDetail,
  AnalyticsSummary,
  MenuBarData,
  ScanProgress,
} from './domain'

export const IPC_CHANNELS = {
  SELECT_DIRECTORY: 'select-directory',
  GET_PROJECTS: 'get-projects',
  GET_PROJECT_DETAIL: 'get-project-detail',
  GET_SESSION_DETAIL: 'get-session-detail',
  GET_ANALYTICS_SUMMARY: 'get-analytics-summary',
  GET_MENU_BAR_DATA: 'get-menu-bar-data',
  OPEN_DASHBOARD: 'open-dashboard',
  SCAN_PROGRESS: 'scan-progress',
  GET_DEFAULT_DIR: 'get-default-dir',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// Typed request/response pairs for each channel
export interface IpcChannelMap {
  [IPC_CHANNELS.SELECT_DIRECTORY]: { req: void; res: string | null }
  [IPC_CHANNELS.GET_PROJECTS]: { req: { baseDir: string }; res: ProjectSummary[] }
  [IPC_CHANNELS.GET_PROJECT_DETAIL]: {
    req: { projectDirName: string; baseDir: string }
    res: ProjectDetail
  }
  [IPC_CHANNELS.GET_SESSION_DETAIL]: {
    req: { sessionId: string; projectDirName: string; baseDir: string }
    res: SessionDetail
  }
  [IPC_CHANNELS.GET_ANALYTICS_SUMMARY]: {
    req: { baseDir: string; dateRange?: { from: string; to: string } }
    res: AnalyticsSummary
  }
  [IPC_CHANNELS.GET_MENU_BAR_DATA]: { req: { baseDir: string; billingCycleDay: number }; res: MenuBarData }
  [IPC_CHANNELS.OPEN_DASHBOARD]: { req: void; res: void }
  [IPC_CHANNELS.SCAN_PROGRESS]: { req: void; res: ScanProgress }
  [IPC_CHANNELS.GET_DEFAULT_DIR]: { req: void; res: string }
}

// The API exposed by preload via contextBridge
export interface ClaudeAnalyticsAPI {
  selectDirectory(): Promise<string | null>
  getDefaultDir(): Promise<string>
  getProjects(baseDir: string): Promise<ProjectSummary[]>
  getProjectDetail(projectDirName: string, baseDir: string): Promise<ProjectDetail>
  getSessionDetail(
    sessionId: string,
    projectDirName: string,
    baseDir: string,
  ): Promise<SessionDetail>
  getAnalyticsSummary(baseDir: string, dateRange?: { from: string; to: string }): Promise<AnalyticsSummary>
  getMenuBarData(baseDir: string, billingCycleDay: number): Promise<MenuBarData>
  openDashboard(): Promise<void>
  onProgress(callback: (progress: ScanProgress) => void): () => void
}

// Augment Window interface for renderer
declare global {
  interface Window {
    claudeAnalytics: ClaudeAnalyticsAPI
  }
}
