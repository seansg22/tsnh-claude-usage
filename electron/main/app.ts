import { app, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'
import { createDashboardWindow, createMenuBarWindow } from './windows'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc'

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
