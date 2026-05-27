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

// Show/hide the macOS Dock icon dynamically — visible only when the dashboard is open.
// LSUIElement=true hides it by default; we call show/hide at runtime instead.
function showDock(): void {
  if (process.platform === 'darwin' && app.dock) app.dock.show()
}

function hideDock(): void {
  if (process.platform === 'darwin' && app.dock) app.dock.hide()
}

function createAndTrackDashboardWindow(): BrowserWindow {
  const win = createDashboardWindow()
  showDock()

  win.on('closed', () => {
    dashboardWindow = null
    hideDock()
  })

  return win
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

  // Start hidden in the Dock — it appears when the dashboard window opens
  hideDock()

  // Create windows
  dashboardWindow = createAndTrackDashboardWindow()
  menuBarWindow = createMenuBarWindow()

  // Create tray
  createTray(getMenuBarWindow, getDashboardWindow)

  // Register IPC handlers
  registerIpcHandlers(getDashboardWindow)

  // Check for updates
  setupAutoUpdater()

  app.on('activate', () => {
    // macOS: clicking dock icon while dashboard is open — just focus it
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.show()
      dashboardWindow.focus()
    } else {
      // Dashboard was closed — re-create it (also shows dock via createAndTrackDashboardWindow)
      dashboardWindow = createAndTrackDashboardWindow()
    }
  })
})

// Do NOT quit when all windows close (menu bar app stays alive)
app.on('window-all-closed', () => {
  // Keep running in menu bar
})

// Clean up on quit
app.on('before-quit', () => {
  // Remove ALL listeners (not just 'close') before closing.
  // The menubar window has a 'blur' listener that calls win.hide(); if Electron
  // fires blur during window destruction it throws "Object has been destroyed".
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.removeAllListeners()
    dashboardWindow.close()
  }
  dashboardWindow = null

  if (menuBarWindow && !menuBarWindow.isDestroyed()) {
    menuBarWindow.removeAllListeners()
    menuBarWindow.close()
  }
  menuBarWindow = null
})
