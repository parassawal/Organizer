import * as path from 'path'
import * as fs from 'fs'
import { promises as fsp } from 'fs'
import type { OrganizationRule, RuleCondition, ActivityLogEntry, AppSettings } from '../../renderer/src/types'
import { FILE_TYPE_GROUPS, type FileTypeGroup } from '../../renderer/src/types'
import { getRules, getSettings, addActivityLogEntry, incrementStats, markActivityUndone } from './config-store'
import { getFileTypeByMagicNumber } from './magic-inspector'

async function asyncExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

export class OrganizerEngine {
  private onFileOrganized: ((entry: ActivityLogEntry) => void) | null = null

  setOnFileOrganized(callback: (entry: ActivityLogEntry) => void): void {
    this.onFileOrganized = callback
  }

  async organizeFile(filePath: string, watchedFolderPath: string, specificRuleIds?: string[]): Promise<boolean> {
    const settings = getSettings()
    const fileName = path.basename(filePath)

    if (this.isExcluded(fileName, settings)) {
      return false
    }

    if (!(await asyncExists(filePath))) {
      return false
    }

    let rules = getRules().filter(r => r.enabled)
    if (specificRuleIds && specificRuleIds.length > 0) {
      rules = rules.filter(r => specificRuleIds.includes(r.id))
    }

    rules.sort((a, b) => a.priority - b.priority)

    const matchingRule = await this.findMatchingRule(filePath, rules)
    if (!matchingRule) {
      return false
    }

    const destDir = path.isAbsolute(matchingRule.destination)
      ? matchingRule.destination
      : path.join(watchedFolderPath, matchingRule.destination)

    if (settings.createSubfolders && !(await asyncExists(destDir))) {
      await fsp.mkdir(destDir, { recursive: true }).catch(() => {})
    }

    if (!(await asyncExists(destDir))) {
      return false
    }

    let destPath = path.join(destDir, fileName)

    if (path.resolve(filePath) === path.resolve(destPath)) {
      return false
    }

    if (await asyncExists(destPath)) {
      switch (settings.conflictResolution) {
        case 'skip':
          this.logEntry('skipped', filePath, destPath, matchingRule)
          return false
        case 'overwrite':
          break
        case 'rename':
        default:
          destPath = await this.getUniqueFileName(destPath)
          break
      }
    }

    try {
      await fsp.rename(filePath, destPath)
      const entry = this.logEntry('moved', filePath, destPath, matchingRule)
      incrementStats()

      if (this.onFileOrganized && entry) {
        this.onFileOrganized(entry)
      }
      return true
    } catch (err) {
      try {
        await fsp.copyFile(filePath, destPath)
        await fsp.unlink(filePath)
        const entry = this.logEntry('moved', filePath, destPath, matchingRule)
        incrementStats()

        if (this.onFileOrganized && entry) {
          this.onFileOrganized(entry)
        }
        return true
      } catch (copyErr) {
        this.logEntry('error', filePath, destPath, matchingRule)
        return false
      }
    }
  }

  async organizeExistingFiles(watchedFolderPath: string, specificRuleIds?: string[]): Promise<number> {
    const settings = getSettings()
    let count = 0

    try {
      const entries = await fsp.readdir(watchedFolderPath, { withFileTypes: true })
      
      const MAX_CONCURRENT = 10
      for (let i = 0; i < entries.length; i += MAX_CONCURRENT) {
        const batch = entries.slice(i, i + MAX_CONCURRENT)
        
        await Promise.all(batch.map(async (entry) => {
          if (!entry.isFile()) return
          if (this.isExcluded(entry.name, settings)) return

          const filePath = path.join(watchedFolderPath, entry.name)
          const moved = await this.organizeFile(filePath, watchedFolderPath, specificRuleIds)
          if (moved) {
            count++
          }
        }))
      }
    } catch (err) {
      console.error(`Error scanning folder ${watchedFolderPath}:`, err)
    }

    return count
  }

  async undoAction(entryId: string): Promise<boolean> {
    const entry = markActivityUndone(entryId)
    if (!entry) return false

    try {
      if (entry.type === 'moved' && (await asyncExists(entry.destinationPath))) {
        const sourceDir = path.dirname(entry.sourcePath)
        if (!(await asyncExists(sourceDir))) {
          await fsp.mkdir(sourceDir, { recursive: true })
        }

        await fsp.rename(entry.destinationPath, entry.sourcePath)
        return true
      }
    } catch {
      try {
        await fsp.copyFile(entry.destinationPath, entry.sourcePath)
        await fsp.unlink(entry.destinationPath)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  private async findMatchingRule(filePath: string, rules: OrganizationRule[]): Promise<OrganizationRule | null> {
    for (const rule of rules) {
      if (await this.matchesRule(filePath, rule)) {
        return rule
      }
    }
    return null
  }

  private async matchesRule(filePath: string, rule: OrganizationRule): Promise<boolean> {
    if (rule.conditions.length === 0) return false

    const results = await Promise.all(rule.conditions.map(cond => this.matchesCondition(filePath, cond)))

    if (rule.conditionLogic === 'AND') {
      return results.every(Boolean)
    } else {
      return results.some(Boolean)
    }
  }

  private async matchesCondition(filePath: string, condition: RuleCondition): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase()
    const fileName = path.basename(filePath)

    switch (condition.type) {
      case 'extension': {
        const targetExt = condition.value.startsWith('.') ? condition.value.toLowerCase() : `.${condition.value.toLowerCase()}`
        return ext === targetExt
      }

      case 'typeGroup': {
        const group = condition.value as FileTypeGroup
        const extensions = FILE_TYPE_GROUPS[group]
        
        let isMatch = extensions ? extensions.includes(ext) : false
        
        if (!isMatch) {
          const magicType = await getFileTypeByMagicNumber(filePath)
          if (magicType === group) {
            isMatch = true
          }
        }
        
        return isMatch
      }

      case 'namePattern': {
        return this.matchGlob(fileName, condition.value)
      }

      case 'sizeGreaterThan': {
        try {
          const stats = await fsp.stat(filePath)
          return stats.size > parseInt(condition.value)
        } catch {
          return false
        }
      }

      case 'sizeLessThan': {
        try {
          const stats = await fsp.stat(filePath)
          return stats.size < parseInt(condition.value)
        } catch {
          return false
        }
      }

      case 'dateCreated': {
        try {
          const stats = await fsp.stat(filePath)
          const created = stats.birthtime.toISOString()
          return created.startsWith(condition.value)
        } catch {
          return false
        }
      }

      default:
        return false
    }
  }

  private matchGlob(fileName: string, pattern: string): boolean {
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${regex}$`, 'i').test(fileName)
  }

  private isExcluded(fileName: string, settings: AppSettings): boolean {
    return settings.exclusionPatterns.some(pattern => {
      if (pattern.includes('*')) {
        return this.matchGlob(fileName, pattern)
      }
      return fileName === pattern
    })
  }

  private async getUniqueFileName(destPath: string): Promise<string> {
    const dir = path.dirname(destPath)
    const ext = path.extname(destPath)
    const nameWithoutExt = path.basename(destPath, ext)
    let counter = 1
    let newPath = destPath

    while (await asyncExists(newPath)) {
      newPath = path.join(dir, `${nameWithoutExt} (${counter})${ext}`)
      counter++
    }

    return newPath
  }

  private logEntry(
    type: ActivityLogEntry['type'],
    sourcePath: string,
    destinationPath: string,
    rule: OrganizationRule
  ): ActivityLogEntry {
    return addActivityLogEntry({
      type,
      sourcePath,
      destinationPath,
      fileName: path.basename(sourcePath),
      ruleId: rule.id,
      ruleName: rule.name
    })
  }
}
