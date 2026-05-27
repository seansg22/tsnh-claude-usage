import { app, BrowserWindow, nativeImage, dialog } from 'electron'
import * as path from 'path'
import { autoUpdater } from 'electron-updater'
import { createDashboardWindow, createMenuBarWindow } from './windows'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc'

function setupAutoUpdater() {
  // Only run in packaged app, not during dev
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of Claude Usage has been downloaded. Restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {/* no network — ignore */})
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)
}

let dashboardWindow: BrowserWindow | null = null
let menuBarWindow: BrowserWindow | null = null

function getDashboardWindow(): BrowserWindow | null {
  return dashboardWindow
}

function getMenuBarWindow(): BrowserWindow | null {
  return menuBarWindow
}

app.whenReady().then(() => {
  // Set dock icon (use PNG — works in both dev and prod)
  if (process.platform === 'darwin' && app.dock) {
    const iconCandidates = [
      path.join(__dirname, '../../resources/icon.png'),
      path.join(process.resourcesPath ?? '', 'icon.png'),
      path.join(app.getAppPath(), 'resources/icon.png'),
    ]
    for (const p of iconCandidates) {
      try {
        const img = nativeImage.createFromPath(p)
        if (!img.isEmpty()) { app.dock.setIcon(img); break }
      } catch { /* skip */ }
    }
  }

  // Create windows
  dashboardWindow = createDashboardWindow()
  menuBarWindow = createMenuBarWindow()

  // Create tray
  createTray(getMenuBarWindow, getDashboardWindow)

  // Register IPC handlers
  registerIpcHandlers(getDashboardWindow)

  // Check for updates
  setupAutoUpdater()

  app.on('activate', () => {
    // macOS: re-open window when clicking dock icon
    if (dashboardWindow) {
      dashboardWindow.show()
      dashboardWindow.focus()
    } else {
      dashboardWindow = createDashboardWindow()
    }
  })
})

// Do NOT quit when all windows close (menu bar app stays alive)
app.on('window-all-closed', () => {
  // Keep running in menu bar
})

// Clean up on quit
app.on('before-quit', () => {
  // Allow windows to actually close on quit
  if (dashboardWindow) {
    dashboardWindow.removeAllListeners('close')
    dashboardWindow.close()
  }
  if (menuBarWindow) {
    menuBarWindow.removeAllListeners('close')
    menuBarWindow.close()
  }
})
