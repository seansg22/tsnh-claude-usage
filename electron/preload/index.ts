import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/types/ipc'
import type { ClaudeAnalyticsAPI } from '../../src/shared/types/ipc'
import type { ScanProgress } from '../../src/shared/types/domain'

const api: ClaudeAnalyticsAPI = {
  selectDirectory() {
    return ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY)
  },

  getDefaultDir() {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_DEFAULT_DIR)
  },

  getProjects(baseDir: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECTS, { baseDir })
  },

  getProjectDetail(projectDirName: string, baseDir: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT_DETAIL, { projectDirName, baseDir })
  },

  getSessionDetail(sessionId: string, projectDirName: string, baseDir: string) {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SESSION_DETAIL, { sessionId, projectDirName, baseDir })
  },

  getAnalyticsSummary(baseDir: string, dateRange?: { from: string; to: string }) {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_ANALYTICS_SUMMARY, { baseDir, dateRange })
  },

  getMenuBarData(baseDir: string, billingCycleDay: number) {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_MENU_BAR_DATA, { baseDir, billingCycleDay })
  },

  openDashboard() {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_DASHBOARD)
  },

  sendBudgetNotification(threshold: number) {
    return ipcRenderer.invoke(IPC_CHANNELS.SEND_BUDGET_NOTIFICATION, { threshold })
  },

  sendDailyBudgetNotification(dailyBudget: number) {
    return ipcRenderer.invoke(IPC_CHANNELS.SEND_DAILY_BUDGET_NOTIFICATION, { dailyBudget })
  },

  onProgress(callback: (progress: ScanProgress) => void) {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => {
      callback(progress)
    }
    ipcRenderer.on(IPC_CHANNELS.SCAN_PROGRESS, handler)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SCAN_PROGRESS, handler)
    }
  },
}

contextBridge.exposeInMainWorld('claudeAnalytics', api)
