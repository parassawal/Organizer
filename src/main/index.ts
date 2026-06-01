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
const organizer = new OrganizerEngine()
const fileWatcher = new FileWatcherService(organizer)
const trayManager = new TrayManager(fileWatcher)
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

  mainWindow.on('close', (event) => {
    // True background mode: Always hide instead of closing
    event.preventDefault()
    mainWindow?.hide()
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
  // True background mode: Hide the app from the macOS Dock completely
  if (app.dock) {
    app.dock.hide()
  }

  electronApp.setAppUserModelId('com.organizer.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  registerIpcHandlers(fileWatcher, organizer, dedupe)

  // Set up file organized callback
  organizer.setOnFileOrganized((entry) => {
    // Send to renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-file-organized', entry)
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
  trayManager.setMainWindow(mainWindow!)
  trayManager.create()

  // Start watching
  fileWatcher.startAll()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  // True background mode: Never quit when windows are closed.
  // The app continues running in the background until explicitly quit from the tray.
})

app.on('before-quit', async () => {
  await fileWatcher.stopAll()
  trayManager.destroy()
})
