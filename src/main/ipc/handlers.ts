import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { IPC_CHANNELS } from '../../renderer/src/types'
import * as configStore from '../services/config-store'
import { FileWatcherService } from '../services/file-watcher'
import { OrganizerEngine } from '../services/organizer'
import { DedupeEngine } from '../services/dedupe'

export function registerIpcHandlers(
  fileWatcher: FileWatcherService,
  organizer: OrganizerEngine,
  dedupe: DedupeEngine
): void {
  // --- Folders ---
  ipcMain.handle(IPC_CHANNELS.GET_WATCHED_FOLDERS, () => {
    return configStore.getWatchedFolders()
  })

  ipcMain.handle(IPC_CHANNELS.ADD_WATCHED_FOLDER, async (_, folderPath: string) => {
    const folder = configStore.addWatchedFolder(folderPath)
    if (folder.enabled) {
      // Organize all existing files first
      await organizer.organizeExistingFiles(
        folder.path,
        folder.ruleIds.length > 0 ? folder.ruleIds : undefined
      )
      // Then start watching for new files
      await fileWatcher.startWatching(folder)
    }
    return folder
  })

  ipcMain.handle(IPC_CHANNELS.REMOVE_WATCHED_FOLDER, async (_, id: string) => {
    await fileWatcher.stopWatching(id)
    return configStore.removeWatchedFolder(id)
  })

  ipcMain.handle(IPC_CHANNELS.TOGGLE_WATCHED_FOLDER, async (_, id: string) => {
    const folder = configStore.toggleWatchedFolder(id)
    if (folder) {
      if (folder.enabled) {
        await fileWatcher.startWatching(folder)
      } else {
        await fileWatcher.stopWatching(folder.id)
      }
    }
    return folder
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // --- Rules ---
  ipcMain.handle(IPC_CHANNELS.GET_RULES, () => {
    return configStore.getRules()
  })

  ipcMain.handle(IPC_CHANNELS.ADD_RULE, (_, rule) => {
    return configStore.addRule(rule)
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_RULE, (_, id: string, updates) => {
    return configStore.updateRule(id, updates)
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_RULE, (_, id: string) => {
    return configStore.deleteRule(id)
  })

  ipcMain.handle(IPC_CHANNELS.RESET_RULES, () => {
    configStore.resetRules()
    return configStore.getRules()
  })

  // --- Activity ---
  ipcMain.handle(IPC_CHANNELS.GET_ACTIVITY_LOG, () => {
    return configStore.getActivityLog()
  })

  ipcMain.handle(IPC_CHANNELS.CLEAR_ACTIVITY_LOG, () => {
    configStore.clearActivityLog()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.UNDO_ACTION, async (_, id: string) => {
    return organizer.undoAction(id)
  })

  // --- Settings ---
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return configStore.getSettings()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_, updates) => {
    const settings = configStore.updateSettings(updates)
    // Handle launch at startup
    if (updates.launchAtStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: updates.launchAtStartup })
    }
    return settings
  })

  // --- Stats ---
  ipcMain.handle(IPC_CHANNELS.GET_STATS, () => {
    return configStore.getStats()
  })

  // --- Control ---
  ipcMain.handle(IPC_CHANNELS.PAUSE_WATCHING, () => {
    fileWatcher.pause()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.RESUME_WATCHING, () => {
    fileWatcher.resume()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.GET_WATCHING_STATUS, () => {
    return {
      paused: fileWatcher.isPaused(),
      activeWatchers: fileWatcher.getActiveWatcherCount()
    }
  })

  // --- Organize Now ---
  ipcMain.handle(IPC_CHANNELS.ORGANIZE_NOW, async (_, folderId: string) => {
    const folders = configStore.getWatchedFolders()
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return 0
    return organizer.organizeExistingFiles(
      folder.path,
      folder.ruleIds.length > 0 ? folder.ruleIds : undefined
    )
  })

  // --- Deduplication ---
  ipcMain.handle(IPC_CHANNELS.SCAN_DUPLICATES, async (_, folderPaths: string[]) => {
    return dedupe.scanFolders(folderPaths)
  })

  ipcMain.handle(IPC_CHANNELS.MOVE_DUPLICATES, async (_, filePaths: string[]) => {
    return dedupe.moveDuplicates(filePaths)
  })
}
