import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { promises as fsp } from 'fs'
import type { DuplicateGroup, DuplicateFile } from '../../renderer/src/types'

export class DedupeEngine {
  async scanFolders(folderPaths: string[]): Promise<DuplicateGroup[]> {
    const fileList: DuplicateFile[] = []

    // 1. Gather all files asynchronously (BFS) to prevent blocking the event loop or call stack limits
    const queue: string[] = [...folderPaths]
    const MAX_CONCURRENT_READDIRS = 10
    
    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_CONCURRENT_READDIRS)
      
      await Promise.all(batch.map(async (dirPath) => {
        try {
          const entries = await fsp.readdir(dirPath, { withFileTypes: true })
          
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name)
            
            // Ignore symbolic links to prevent infinite traversal loops
            if (entry.isSymbolicLink()) continue 
            
            if (entry.isDirectory()) {
              if (entry.name !== 'Duplicates') {
                queue.push(fullPath)
              }
            } else if (entry.isFile()) {
              try {
                const stats = await fsp.stat(fullPath)
                if (stats.size > 0) { // Ignore empty files
                  fileList.push({
                    path: fullPath,
                    name: entry.name,
                    size: stats.size,
                    folderPath: dirPath
                  })
                }
              } catch (err) {
                console.error('Error stating file:', fullPath, err)
              }
            }
          }
        } catch (err) {
          console.error('Error reading directory:', dirPath, err)
        }
      }))
    }

    // 2. Group by exact byte size
    const sizeGroups: Record<number, DuplicateFile[]> = {}
    for (const file of fileList) {
      if (!sizeGroups[file.size]) sizeGroups[file.size] = []
      sizeGroups[file.size].push(file)
    }

    const duplicateGroups: DuplicateGroup[] = []
    
    // 3. Just use size filtering (as requested by user to disable hashing)
    for (const sizeStr in sizeGroups) {
      const files = sizeGroups[sizeStr]
      if (files.length < 2) continue

      const fileSize = parseInt(sizeStr, 10)
      
      duplicateGroups.push({
        hash: `size-only-${fileSize}`, // Fake hash
        size: fileSize,
        files: files
      })
    }

    // Sort by wasted space descending
    duplicateGroups.sort((a, b) => {
      const wastedA = a.size * (a.files.length - 1)
      const wastedB = b.size * (b.files.length - 1)
      return wastedB - wastedA
    })

    // HARD LIMIT: Only return the top 500 largest duplicate groups to prevent crashing the IPC and React Renderer UI
    return duplicateGroups.slice(0, 500)
  }

  async moveDuplicates(filePaths: string[]): Promise<number> {
    let movedCount = 0

    // Process moves in batches to prevent event loop blocking
    const MAX_CONCURRENT_MOVES = 5
    for (let i = 0; i < filePaths.length; i += MAX_CONCURRENT_MOVES) {
      const batch = filePaths.slice(i, i + MAX_CONCURRENT_MOVES)
      await Promise.all(batch.map(async (filePath) => {
        try {
          const exists = await fsp.access(filePath).then(() => true).catch(() => false)
          if (!exists) return

          const dir = path.dirname(filePath)
          const dupFolder = path.join(dir, 'Duplicates')
          
          const dupFolderExists = await fsp.access(dupFolder).then(() => true).catch(() => false)
          if (!dupFolderExists) {
            await fsp.mkdir(dupFolder, { recursive: true }).catch(() => {})
          }

          const fileName = path.basename(filePath)
          let targetPath = path.join(dupFolder, fileName)

          // Handle naming conflicts
          let counter = 1
          const ext = path.extname(fileName)
          const nameWithoutExt = path.basename(fileName, ext)
          
          while (await fsp.access(targetPath).then(() => true).catch(() => false)) {
            targetPath = path.join(dupFolder, `${nameWithoutExt} (${counter})${ext}`)
            counter++
          }

          await fsp.rename(filePath, targetPath)
          movedCount++
        } catch (err) {
          console.error('Error moving duplicate file:', filePath, err)
        }
      }))
    }

    return movedCount
  }

}
