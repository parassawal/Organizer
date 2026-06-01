import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../renderer/src/types'
import type {
  OrganizationRule,
  WatchedFolder,
  ActivityLogEntry,
  AppSettings,
  AppStats,
  DuplicateGroup
} from '../renderer/src/types'

const api = {
  // Folders
  getWatchedFolders: (): Promise<WatchedFolder[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_WATCHED_FOLDERS),
  addWatchedFolder: (path: string): Promise<WatchedFolder> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_WATCHED_FOLDER, path),
  removeWatchedFolder: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.REMOVE_WATCHED_FOLDER, id),
  toggleWatchedFolder: (id: string): Promise<WatchedFolder | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_WATCHED_FOLDER, id),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),

  // Rules
  getRules: (): Promise<OrganizationRule[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RULES),
  addRule: (rule: Omit<OrganizationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<OrganizationRule> =>
    ipcRenderer.invoke(IPC_CHANNELS.ADD_RULE, rule),
  updateRule: (id: string, updates: Partial<OrganizationRule>): Promise<OrganizationRule | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_RULE, id, updates),
  deleteRule: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_RULE, id),
  resetRules: (): Promise<OrganizationRule[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_RULES),

  // Activity
  getActivityLog: (): Promise<ActivityLogEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVITY_LOG),
  clearActivityLog: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEAR_ACTIVITY_LOG),
  undoAction: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.UNDO_ACTION, id),
  onFileOrganized: (callback: (entry: ActivityLogEntry) => void) => {
    const handler = (_: unknown, entry: ActivityLogEntry) => callback(entry)
    ipcRenderer.on('on-file-organized', handler)
    return () => ipcRenderer.removeListener('on-file-organized', handler)
  },

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (updates: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, updates),

  // Stats
  getStats: (): Promise<AppStats> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_STATS),

  // Control
  pauseWatching: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PAUSE_WATCHING),
  resumeWatching: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_WATCHING),
  getWatchingStatus: (): Promise<{ paused: boolean; activeWatchers: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_WATCHING_STATUS),

  // Organize
  organizeNow: (folderId: string): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.ORGANIZE_NOW, folderId),

  // Deduplication
  scanDuplicates: (folderPaths: string[]): Promise<DuplicateGroup[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_DUPLICATES, folderPaths),
  moveDuplicates: (filePaths: string[]): Promise<number> =>
    ipcRenderer.invoke(IPC_CHANNELS.MOVE_DUPLICATES, filePaths)
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
