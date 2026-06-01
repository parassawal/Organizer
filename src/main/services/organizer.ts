import * as path from 'path'
import * as fs from 'fs'
import type { OrganizationRule, RuleCondition, ActivityLogEntry, AppSettings } from '../../renderer/src/types'
import { FILE_TYPE_GROUPS, type FileTypeGroup } from '../../renderer/src/types'
import { getRules, getSettings, addActivityLogEntry, incrementStats, markActivityUndone } from './config-store'
import { getFileTypeByMagicNumber } from './magic-inspector'

export class OrganizerEngine {
  private onFileOrganized: ((entry: ActivityLogEntry) => void) | null = null

  setOnFileOrganized(callback: (entry: ActivityLogEntry) => void): void {
    this.onFileOrganized = callback
  }

  async organizeFile(filePath: string, watchedFolderPath: string, specificRuleIds?: string[]): Promise<void> {
    const settings = getSettings()
    const fileName = path.basename(filePath)

    // Check exclusion patterns
    if (this.isExcluded(fileName, settings)) {
      return
    }

    // Check if file still exists (might have been moved already)
    if (!fs.existsSync(filePath)) {
      return
    }

    // Get applicable rules
    let rules = getRules().filter(r => r.enabled)
    if (specificRuleIds && specificRuleIds.length > 0) {
      rules = rules.filter(r => specificRuleIds.includes(r.id))
    }

    // Sort by priority (lower number = higher priority)
    rules.sort((a, b) => a.priority - b.priority)

    // Find matching rule
    const matchingRule = this.findMatchingRule(filePath, rules)
    if (!matchingRule) {
      return
    }

    // Determine destination
    const destDir = path.isAbsolute(matchingRule.destination)
      ? matchingRule.destination
      : path.join(watchedFolderPath, matchingRule.destination)

    // Create destination directory if needed
    if (settings.createSubfolders && !fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    if (!fs.existsSync(destDir)) {
      return
    }

    // Handle destination file path
    let destPath = path.join(destDir, fileName)

    // If source and destination are the same, skip
    if (path.resolve(filePath) === path.resolve(destPath)) {
      return
    }

    // Handle conflicts
    if (fs.existsSync(destPath)) {
      switch (settings.conflictResolution) {
        case 'skip':
          this.logEntry('skipped', filePath, destPath, matchingRule)
          return
        case 'overwrite':
          // Will overwrite below
          break
        case 'rename':
        default:
          destPath = this.getUniqueFileName(destPath)
          break
      }
    }

    try {
      // Move the file
      fs.renameSync(filePath, destPath)
      const entry = this.logEntry('moved', filePath, destPath, matchingRule)
      incrementStats()

      if (this.onFileOrganized && entry) {
        this.onFileOrganized(entry)
      }
    } catch (err) {
      // If rename fails (cross-device), copy then delete
      try {
        fs.copyFileSync(filePath, destPath)
        fs.unlinkSync(filePath)
        const entry = this.logEntry('moved', filePath, destPath, matchingRule)
        incrementStats()

        if (this.onFileOrganized && entry) {
          this.onFileOrganized(entry)
        }
      } catch (copyErr) {
        this.logEntry('error', filePath, destPath, matchingRule)
      }
    }
  }

  async organizeExistingFiles(watchedFolderPath: string, specificRuleIds?: string[]): Promise<number> {
    const settings = getSettings()
    let count = 0

    try {
      const entries = fs.readdirSync(watchedFolderPath, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        if (this.isExcluded(entry.name, settings)) continue

        const filePath = path.join(watchedFolderPath, entry.name)
        await this.organizeFile(filePath, watchedFolderPath, specificRuleIds)
        // Check if file was actually moved (no longer at original path)
        if (!fs.existsSync(filePath)) {
          count++
        }
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
      if (entry.type === 'moved' && fs.existsSync(entry.destinationPath)) {
        // Ensure source directory exists
        const sourceDir = path.dirname(entry.sourcePath)
        if (!fs.existsSync(sourceDir)) {
          fs.mkdirSync(sourceDir, { recursive: true })
        }

        fs.renameSync(entry.destinationPath, entry.sourcePath)
        return true
      }
    } catch {
      // If rename fails, try copy+delete
      try {
        fs.copyFileSync(entry.destinationPath, entry.sourcePath)
        fs.unlinkSync(entry.destinationPath)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  private findMatchingRule(filePath: string, rules: OrganizationRule[]): OrganizationRule | null {
    for (const rule of rules) {
      if (this.matchesRule(filePath, rule)) {
        return rule
      }
    }
    return null
  }

  private matchesRule(filePath: string, rule: OrganizationRule): boolean {
    if (rule.conditions.length === 0) return false

    const results = rule.conditions.map(cond => this.matchesCondition(filePath, cond))

    if (rule.conditionLogic === 'AND') {
      return results.every(Boolean)
    } else {
      return results.some(Boolean)
    }
  }

  private matchesCondition(filePath: string, condition: RuleCondition): boolean {
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
        
        // Deep File Inspection Fallback
        // If the extension didn't match, or there is no extension, try reading the magic number
        if (!isMatch) {
          const magicType = getFileTypeByMagicNumber(filePath)
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
          const stats = fs.statSync(filePath)
          return stats.size > parseInt(condition.value)
        } catch {
          return false
        }
      }

      case 'sizeLessThan': {
        try {
          const stats = fs.statSync(filePath)
          return stats.size < parseInt(condition.value)
        } catch {
          return false
        }
      }

      case 'dateCreated': {
        try {
          const stats = fs.statSync(filePath)
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
    // Simple glob matching: * matches anything, ? matches single char
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

  private getUniqueFileName(destPath: string): string {
    const dir = path.dirname(destPath)
    const ext = path.extname(destPath)
    const nameWithoutExt = path.basename(destPath, ext)
    let counter = 1
    let newPath = destPath

    while (fs.existsSync(newPath)) {
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
