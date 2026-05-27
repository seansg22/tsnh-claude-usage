import { app, BrowserWindow } from 'electron'
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
