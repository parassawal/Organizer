import chokidar from 'chokidar'
import * as path from 'path'
import * as fs from 'fs'
import { getSettings, getWatchedFolders } from './config-store'
import { OrganizerEngine } from './organizer'
import type { WatchedFolder } from '../../renderer/src/types'

export class FileWatcherService {
  private watchers: Map<string, chokidar.FSWatcher> = new Map()
  private organizer: OrganizerEngine
  private paused = false
  private pendingTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(organizer: OrganizerEngine) {
    this.organizer = organizer
  }

  async startWatching(folder: WatchedFolder): Promise<void> {
    if (this.watchers.has(folder.id)) return
    if (!fs.existsSync(folder.path)) return

    const watcher = chokidar.watch(folder.path, {
      persistent: true,
      ignoreInitial: true,
      depth: 0,
      awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
    })

    watcher.on('add', (filePath: string) => {
      if (this.paused) return
      const fileDir = path.dirname(filePath)
      if (path.resolve(fileDir) !== path.resolve(folder.path)) return

      const settings = getSettings()
      const delay = settings.stabilityDelay * 1000
      const existing = this.pendingTimers.get(filePath)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(() => {
        this.pendingTimers.delete(filePath)
        this.organizer.organizeFile(
          filePath, folder.path,
          folder.ruleIds.length > 0 ? folder.ruleIds : undefined
        )
      }, delay)
      this.pendingTimers.set(filePath, timer)
    })

    watcher.on('error', (error: Error) => {
      console.error(`Watcher error for ${folder.path}:`, error)
    })

    this.watchers.set(folder.id, watcher)
  }

  async stopWatching(folderId: string): Promise<void> {
    const watcher = this.watchers.get(folderId)
    if (watcher) {
      await watcher.close()
      this.watchers.delete(folderId)
    }
  }

  async startAll(): Promise<void> {
    const folders = getWatchedFolders()
    for (const folder of folders) {
      if (folder.enabled) await this.startWatching(folder)
    }
  }

  async stopAll(): Promise<void> {
    for (const [id] of this.watchers) await this.stopWatching(id)
    for (const [, timer] of this.pendingTimers) clearTimeout(timer)
    this.pendingTimers.clear()
  }

  pause(): void {
    this.paused = true
    for (const [, timer] of this.pendingTimers) clearTimeout(timer)
    this.pendingTimers.clear()
  }

  resume(): void { this.paused = false }
  isPaused(): boolean { return this.paused }
  getActiveWatcherCount(): number { return this.watchers.size }
}
