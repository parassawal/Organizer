import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import type {
  OrganizationRule,
  WatchedFolder,
  ActivityLogEntry,
  AppSettings,
  AppStats
} from '../../renderer/src/types'
import { DEFAULT_SETTINGS, DEFAULT_RULES } from '../../renderer/src/types'

interface StoreSchema {
  rules: OrganizationRule[]
  watchedFolders: WatchedFolder[]
  activityLog: ActivityLogEntry[]
  settings: AppSettings
  stats: AppStats
}

const store = new Store<StoreSchema>({
  name: 'organizer-config',
  defaults: {
    rules: DEFAULT_RULES,
    watchedFolders: [],
    activityLog: [],
    settings: DEFAULT_SETTINGS,
    stats: {
      filesOrganizedToday: 0,
      filesOrganizedTotal: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    }
  }
})

// --- Rules ---
export function getRules(): OrganizationRule[] {
  return store.get('rules')
}

export function addRule(rule: Omit<OrganizationRule, 'id' | 'createdAt' | 'updatedAt'>): OrganizationRule {
  const newRule: OrganizationRule = {
    ...rule,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const rules = getRules()
  rules.push(newRule)
  store.set('rules', rules)
  return newRule
}

export function updateRule(id: string, updates: Partial<OrganizationRule>): OrganizationRule | null {
  const rules = getRules()
  const index = rules.findIndex(r => r.id === id)
  if (index === -1) return null
  rules[index] = { ...rules[index], ...updates, updatedAt: new Date().toISOString() }
  store.set('rules', rules)
  return rules[index]
}

export function deleteRule(id: string): boolean {
  const rules = getRules()
  const filtered = rules.filter(r => r.id !== id)
  if (filtered.length === rules.length) return false
  store.set('rules', filtered)
  return true
}

export function resetRules(): void {
  store.set('rules', DEFAULT_RULES)
}

// --- Watched Folders ---
export function getWatchedFolders(): WatchedFolder[] {
  return store.get('watchedFolders')
}

export function addWatchedFolder(folderPath: string): WatchedFolder {
  const folder: WatchedFolder = {
    id: uuidv4(),
    path: folderPath,
    enabled: true,
    ruleIds: [],
    addedAt: new Date().toISOString()
  }
  const folders = getWatchedFolders()
  // Don't add duplicates
  if (folders.some(f => f.path === folderPath)) {
    return folders.find(f => f.path === folderPath)!
  }
  folders.push(folder)
  store.set('watchedFolders', folders)
  return folder
}

export function removeWatchedFolder(id: string): boolean {
  const folders = getWatchedFolders()
  const filtered = folders.filter(f => f.id !== id)
  if (filtered.length === folders.length) return false
  store.set('watchedFolders', filtered)
  return true
}

export function toggleWatchedFolder(id: string): WatchedFolder | null {
  const folders = getWatchedFolders()
  const index = folders.findIndex(f => f.id === id)
  if (index === -1) return null
  folders[index].enabled = !folders[index].enabled
  store.set('watchedFolders', folders)
  return folders[index]
}

// --- Activity Log ---
export function getActivityLog(): ActivityLogEntry[] {
  return store.get('activityLog')
}

export function addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'undone'>): ActivityLogEntry {
  const newEntry: ActivityLogEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    undone: false
  }
  const log = getActivityLog()
  log.unshift(newEntry) // newest first

  const settings = getSettings()
  // Trim log to max entries
  if (log.length > settings.maxLogEntries) {
    log.splice(settings.maxLogEntries)
  }

  store.set('activityLog', log)
  return newEntry
}

export function markActivityUndone(id: string): ActivityLogEntry | null {
  const log = getActivityLog()
  const index = log.findIndex(e => e.id === id)
  if (index === -1) return null
  log[index].undone = true
  store.set('activityLog', log)
  return log[index]
}

export function clearActivityLog(): void {
  store.set('activityLog', [])
}

// --- Settings ---
export function getSettings(): AppSettings {
  return store.get('settings')
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const settings = { ...getSettings(), ...updates }
  store.set('settings', settings)
  return settings
}

// --- Stats ---
export function getStats(): AppStats {
  const stats = store.get('stats')
  const today = new Date().toISOString().split('T')[0]
  if (stats.lastResetDate !== today) {
    stats.filesOrganizedToday = 0
    stats.lastResetDate = today
    store.set('stats', stats)
  }
  return stats
}

export function incrementStats(): AppStats {
  const stats = getStats()
  stats.filesOrganizedToday++
  stats.filesOrganizedTotal++
  store.set('stats', stats)
  return stats
}
