import { ipcMain, dialog, BrowserWindow, Notification, nativeImage } from 'electron'
import * as path from 'path'
import * as https from 'https'
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

  // Send a macOS notification when daily budget is exceeded
  ipcMain.handle(
    IPC_CHANNELS.SEND_DAILY_BUDGET_NOTIFICATION,
    async (_event, { dailyBudget }: { dailyBudget: number }) => {
      if (!Notification.isSupported()) return
      const iconPath = path.join(__dirname, '../../resources/icon.png')
      const icon = nativeImage.createFromPath(iconPath)
      new Notification({
        title: 'Daily Budget Exceeded',
        body: `Today's Claude usage has exceeded your $${dailyBudget} daily budget.`,
        icon: icon.isEmpty() ? undefined : icon,
      }).show()
    },
  )

  // Send a macOS notification for a monthly budget usage threshold
  ipcMain.handle(
    IPC_CHANNELS.SEND_BUDGET_NOTIFICATION,
    async (_event, { threshold }: { threshold: number }) => {
      if (!Notification.isSupported()) return
      const iconPath = path.join(__dirname, '../../resources/icon.png')
      const icon = nativeImage.createFromPath(iconPath)
      new Notification({
        title: 'Claude Usage Budget Alert',
        body: `You've reached ${threshold}% of your monthly budget.`,
        icon: icon.isEmpty() ? undefined : icon,
      }).show()
    },
  )

  // Fetch live exchange rates from Frankfurter API via the main process (Node.js https —
  // avoids renderer-side CORS/fetch restrictions).
  ipcMain.handle(IPC_CHANNELS.FETCH_EXCHANGE_RATES, async () => {
    return new Promise<Record<string, number>>((resolve, reject) => {
      https
        .get('https://api.frankfurter.dev/v1/latest?from=USD', (res) => {
          let body = ''
          res.on('data', (chunk: Buffer) => { body += chunk.toString() })
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const data = JSON.parse(body) as { rates: Record<string, number> }
                resolve(data.rates)
              } catch {
                reject(new Error('Invalid JSON from exchange rate API'))
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}`))
            }
          })
        })
        .on('error', (err) => reject(err))
    })
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
