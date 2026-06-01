import { app, BrowserWindow, shell, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { OrganizerEngine } from './services/organizer'
import { FileWatcherService } from './services/file-watcher'
import { TrayManager } from './services/tray'
import { registerIpcHandlers } from './ipc/handlers'
import { getSettings } from './services/config-store'

import { DedupeEngine } from './services/dedupe'

let mainWindow: BrowserWindow | null = null
let forceQuit = false
let isQuitting = false

const organizer = new OrganizerEngine()
const fileWatcher = new FileWatcherService(organizer)
const trayManager = new TrayManager(fileWatcher, () => {
  forceQuit = true
  app.quit()
})
const dedupe = new DedupeEngine()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Prevent window from being destroyed to keep renderer/background tasks alive
  mainWindow.on('close', (event) => {
    if (!isQuitting && !forceQuit) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Dev server or production build
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.organizer.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  registerIpcHandlers(fileWatcher, organizer, dedupe)

  // Set up file organized callback
  organizer.setOnFileOrganized((entry) => {
    // Send to renderer
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0 && !windows[0].isDestroyed()) {
      windows[0].webContents.send('on-file-organized', entry)
    }

    // Show notification
    const settings = getSettings()
    if (settings.showNotifications && Notification.isSupported()) {
      new Notification({
        title: 'Organizer',
        body: `Moved "${entry.fileName}" to ${entry.ruleName}`
      }).show()
    }

    // Update tray
    trayManager.updateMenu()
  })

  createWindow()

  // Set up tray
  trayManager.create()

  // Start watching
  fileWatcher.startAll()

  app.on('activate', () => {
    if (app.dock) {
      try {
        app.dock.show()
      } catch (e) {}
    }

    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })
})

app.on('before-quit', async (event) => {
  const settings = getSettings()
  
  if (!forceQuit && settings.minimizeToTray) {
    event.preventDefault()
    if (mainWindow) {
      mainWindow.hide()
    }
    
    // Hide dock icon so it runs purely as a background daemon
    if (app.dock) {
      try {
        app.dock.hide()
      } catch (e) {}
    }
    return
  }

  isQuitting = true
  await fileWatcher.stopAll()
  trayManager.destroy()
})
