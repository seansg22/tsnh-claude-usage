import { Tray, Menu, nativeImage, app } from 'electron'
import * as path from 'path'
import type { BrowserWindow } from 'electron'
import { showMenuBarWindow } from './windows'

let trayInstance: Tray | null = null

/**
 * Create the system tray icon.
 */
export function createTray(
  getMenuBarWindow: () => BrowserWindow | null,
  getDashboardWindow: () => BrowserWindow | null,
): Tray {
  // In dev mode __dirname is out/main/ ; in prod it's inside app.asar
  // Resources folder is always two levels up from out/main/
  const candidates = [
    path.join(__dirname, '../../resources/trayIcon.png'),      // dev
    path.join(process.resourcesPath ?? '', 'trayIcon.png'),    // prod packaged
    path.join(app.getAppPath(), 'resources/trayIcon.png'),     // fallback
  ]

  let icon: Electron.NativeImage = createFallbackIcon()
  for (const p of candidates) {
    try {
      const candidate = nativeImage.createFromPath(p)
      if (!candidate.isEmpty()) { icon = candidate; break }
    } catch { /* skip */ }
  }

  // Resize to 22x22 (standard macOS menu bar icon size)
  const sized = icon.resize({ width: 22, height: 22 })
  // Do NOT set template image — keep orange color visible


  const tray = new Tray(sized)
  trayInstance = tray

  tray.setToolTip('Claude Usage')

  tray.on('click', (_event, bounds) => {
    const menuBarWin = getMenuBarWindow()
    if (!menuBarWin || menuBarWin.isDestroyed()) return

    if (menuBarWin.isVisible()) {
      menuBarWin.hide()
    } else {
      showMenuBarWindow(menuBarWin, bounds)
    }
  })

  // Context menu (right-click only — keeps left-click for the popover)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        const dashWin = getDashboardWindow()
        if (dashWin && !dashWin.isDestroyed()) {
          if (dashWin.isMinimized()) dashWin.restore()
          dashWin.show()
          dashWin.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Claude Usage',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu)
  })

  return tray
}

/**
 * Update the tray tooltip with today's cost.
 */
export function updateTrayTooltip(todayCost: string): void {
  if (trayInstance) {
    trayInstance.setToolTip(`Claude Usage · Today: ${todayCost}`)
  }
}

/**
 * Create a 22×22 white circle PNG (template image — macOS auto-inverts for dark/light mode).
 * Generated with: python3 make_png(22, 22, 255, 255, 255, RGBA)
 */
function createFallbackIcon(): Electron.NativeImage {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAAQklEQVR42mNgGAzg' +
    'PxBQzSBCgOoGkmzBfwoATQzFazhNDP5PRTBqMKbB/2kARsOYjgYPvSxN09KNpuUx' +
    'TWsQatR5ANRz70kJsPpAAAAAAElFTkSuQmCC'

  try {
    const img = nativeImage.createFromBuffer(Buffer.from(pngBase64, 'base64'))
    img.setTemplateImage(true)
    return img
  } catch {
    return nativeImage.createEmpty()
  }
}
