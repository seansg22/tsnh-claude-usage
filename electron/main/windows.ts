import { BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

const VITE_DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']

function getPreloadPath(): string {
  // electron-vite outputs .mjs when package.json has "type":"module", .js otherwise
  const base = path.join(__dirname, '../preload/index')
  if (fs.existsSync(base + '.mjs')) return base + '.mjs'
  return base + '.js'
}

function getRendererPath(page = 'index.html'): string {
  return path.join(__dirname, '../renderer/', page)
}

/**
 * Create the main dashboard window.
 */
export function createDashboardWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0F0F0F',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
  })

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '#/dashboard')
  } else {
    win.loadFile(getRendererPath(), { hash: '/dashboard' })
  }

  return win
}

/**
 * Create the menu bar popover window.
 */
export function createMenuBarWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 480,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1A1A1A',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Hide when focus is lost
  win.on('blur', () => {
    win.hide()
  })

  // Prevent closing — only hide
  win.on('close', (event) => {
    event.preventDefault()
    win.hide()
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL + '#/menubar')
  } else {
    win.loadFile(getRendererPath(), { hash: '/menubar' })
  }

  return win
}

/**
 * Position and show the menu bar window near the tray icon.
 */
export function showMenuBarWindow(
  win: BrowserWindow,
  trayBounds: Electron.Rectangle,
): void {
  const winBounds = win.getBounds()

  // Center under the tray icon (macOS: tray is at top)
  const x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2)
  const y = Math.round(trayBounds.y + trayBounds.height + 4)

  win.setPosition(x, y, false)
  win.show()
  win.focus()
}
