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
    
    const hashInBatches = async <T>(items: T[], fn: (item: T) => Promise<void>) => {
      for (let i = 0; i < items.length; i += 5) {
        await Promise.all(items.slice(i, i + 5).map(fn))
      }
    }

    // 3. Hash only files that share a size using Two-Pass approach
    for (const sizeStr in sizeGroups) {
      const files = sizeGroups[sizeStr]
      if (files.length < 2) continue

      const fileSize = parseInt(sizeStr, 10)
      
      // Pass 1: Fast Hash (First 1MB only)
      const fastHashGroups: Record<string, DuplicateFile[]> = {}
      
      await hashInBatches(files, async (file) => {
        try {
          const hash = await this.hashFile(file.path, 1024 * 1024) 
          if (!fastHashGroups[hash]) fastHashGroups[hash] = []
          fastHashGroups[hash].push(file)
        } catch (err) {
          console.error('Error fast-hashing file:', file.path, err)
        }
      })

      // Pass 2: Full Hash for files that collided on the fast hash
      for (const fastHash in fastHashGroups) {
        const candidates = fastHashGroups[fastHash]
        if (candidates.length < 2) continue
        
        // If file is smaller than or exactly 1MB, the fast hash IS the full hash.
        if (fileSize <= 1024 * 1024) {
          duplicateGroups.push({
            hash: fastHash,
            size: fileSize,
            files: candidates
          })
          continue
        }

        const fullHashGroups: Record<string, DuplicateFile[]> = {}
        await hashInBatches(candidates, async (file) => {
          try {
            const hash = await this.hashFile(file.path, 0) // 0 means full hash
            if (!fullHashGroups[hash]) fullHashGroups[hash] = []
            fullHashGroups[hash].push(file)
          } catch (err) {
            console.error('Error full-hashing file:', file.path, err)
          }
        })

        for (const fullHash in fullHashGroups) {
          if (fullHashGroups[fullHash].length > 1) {
            duplicateGroups.push({
              hash: fullHash,
              size: fileSize,
              files: fullHashGroups[fullHash]
            })
          }
        }
      }
    }

    return duplicateGroups
  }

  async moveDuplicates(filePaths: string[]): Promise<number> {
    let movedCount = 0

    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) continue

        const dir = path.dirname(filePath)
        const dupFolder = path.join(dir, 'Duplicates')
        
        if (!fs.existsSync(dupFolder)) {
          fs.mkdirSync(dupFolder, { recursive: true })
        }

        const fileName = path.basename(filePath)
        let targetPath = path.join(dupFolder, fileName)

        // Handle naming conflicts
        let counter = 1
        const ext = path.extname(fileName)
        const nameWithoutExt = path.basename(fileName, ext)
        while (fs.existsSync(targetPath)) {
          targetPath = path.join(dupFolder, `${nameWithoutExt} (${counter})${ext}`)
          counter++
        }

        fs.renameSync(filePath, targetPath)
        movedCount++
      } catch (err) {
        console.error('Error moving duplicate file:', filePath, err)
      }
    }

    return movedCount
  }

  // Helper to hash files efficiently. maxBytes = 0 for full file
  private hashFile(filePath: string, maxBytes: number = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const options = maxBytes > 0 ? { start: 0, end: maxBytes - 1 } : undefined
      const stream = fs.createReadStream(filePath, options)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }
}
