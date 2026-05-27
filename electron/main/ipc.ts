import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../src/shared/types/ipc'
import type { ScanProgress } from '../../src/shared/types/domain'
import {
  getDefaultClaudeDir,
  scanProjectDirectory,
  parseAllSessions,
  parseSessionDetail,
  findSessionFile,
} from './scanner'
import {
  buildProjectSummaries,
  buildProjectDetail,
  buildAnalyticsSummary,
  buildMenuBarData,
  filterSessionsByDateRange,
} from '../../src/shared/analytics/aggregator'

/**
 * Register all IPC handlers.
 * Call this from app.ts after windows are created.
 */
export function registerIpcHandlers(getDashboardWindow: () => BrowserWindow | null): void {
  // Get default Claude directory
  ipcMain.handle(IPC_CHANNELS.GET_DEFAULT_DIR, async () => {
    return getDefaultClaudeDir()
  })

  // Open native directory picker
  ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win ?? new BrowserWindow(), {
      properties: ['openDirectory'],
      title: 'Select Claude Code Data Directory',
      defaultPath: getDefaultClaudeDir(),
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Get all project summaries
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async (event, { baseDir }: { baseDir: string }) => {
    validateBaseDir(baseDir)
    const sender = event.sender

    const projects = await scanProjectDirectory(baseDir)
    const sessions = await parseAllSessions(projects, (progress: ScanProgress) => {
      if (!sender.isDestroyed()) {
        sender.send(IPC_CHANNELS.SCAN_PROGRESS, progress)
      }
    })

    return buildProjectSummaries(sessions)
  })

  // Get full project detail (sessions + charts)
  ipcMain.handle(
    IPC_CHANNELS.GET_PROJECT_DETAIL,
    async (event, { projectDirName, baseDir }: { projectDirName: string; baseDir: string }) => {
      validateBaseDir(baseDir)
      validateDirName(projectDirName)
      const sender = event.sender

      const projects = await scanProjectDirectory(baseDir)
      const targetProject = projects.filter((p) => p.projectDirName === projectDirName)

      const sessions = await parseAllSessions(targetProject, (progress: ScanProgress) => {
        if (!sender.isDestroyed()) {
          sender.send(IPC_CHANNELS.SCAN_PROGRESS, progress)
        }
      })

      return buildProjectDetail(projectDirName, sessions)
    },
  )

  // Get session detail view
  ipcMain.handle(
    IPC_CHANNELS.GET_SESSION_DETAIL,
    async (
      _event,
      {
        sessionId,
        projectDirName,
        baseDir,
      }: { sessionId: string; projectDirName: string; baseDir: string },
    ) => {
      validateBaseDir(baseDir)
      validateDirName(projectDirName)
      validateSessionId(sessionId)

      const filePath = await findSessionFile(sessionId, projectDirName, baseDir)
      if (!filePath) {
        throw new Error(`Session file not found: ${sessionId}`)
      }

      return parseSessionDetail(filePath, projectDirName)
    },
  )

  // Get cross-project analytics summary
  ipcMain.handle(
    IPC_CHANNELS.GET_ANALYTICS_SUMMARY,
    async (
      event,
      { baseDir, dateRange }: { baseDir: string; dateRange?: { from: string; to: string } },
    ) => {
      validateBaseDir(baseDir)
      const sender = event.sender

      const projects = await scanProjectDirectory(baseDir)
      let sessions = await parseAllSessions(projects, (progress: ScanProgress) => {
        if (!sender.isDestroyed()) {
          sender.send(IPC_CHANNELS.SCAN_PROGRESS, progress)
        }
      })

      if (dateRange?.from && dateRange?.to) {
        const from = new Date(dateRange.from)
        const to = new Date(dateRange.to)
        to.setHours(23, 59, 59, 999)
        sessions = filterSessionsByDateRange(sessions, from, to)
      }

      return buildAnalyticsSummary(sessions)
    },
  )

  // Get menu bar quick view data (lightweight — recent sessions only)
  ipcMain.handle(IPC_CHANNELS.GET_MENU_BAR_DATA, async (_event, { baseDir, billingCycleDay }: { baseDir: string; billingCycleDay: number }) => {
    validateBaseDir(baseDir)

    const projects = await scanProjectDirectory(baseDir)
    const sessions = await parseAllSessions(projects, () => {
      // No progress reporting for menu bar (lightweight)
    })

    return buildMenuBarData(sessions, billingCycleDay ?? 1)
  })

  // Focus / open dashboard window
  ipcMain.handle(IPC_CHANNELS.OPEN_DASHBOARD, async () => {
    const win = getDashboardWindow()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })
}

// Input validation helpers

function validateBaseDir(baseDir: unknown): asserts baseDir is string {
  if (typeof baseDir !== 'string' || !baseDir.trim()) {
    throw new Error('Invalid baseDir: must be a non-empty string')
  }
  // Prevent path traversal
  if (baseDir.includes('\0')) {
    throw new Error('Invalid baseDir: null bytes not allowed')
  }
}

function validateDirName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Invalid directory name')
  }
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    throw new Error('Invalid directory name: path separators not allowed')
  }
}

function validateSessionId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid sessionId')
  }
}
