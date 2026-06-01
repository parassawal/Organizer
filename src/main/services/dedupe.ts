import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { DuplicateGroup, DuplicateFile } from '../../renderer/src/types'

export class DedupeEngine {
  async scanFolders(folderPaths: string[]): Promise<DuplicateGroup[]> {
    const fileList: DuplicateFile[] = []

    // 1. Gather all files
    for (const folderPath of folderPaths) {
      if (!fs.existsSync(folderPath)) continue
      
      try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isFile()) continue
          
          const fullPath = path.join(folderPath, entry.name)
          try {
            const stats = fs.statSync(fullPath)
            fileList.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              folderPath
            })
          } catch (err) {
            console.error('Error stating file:', fullPath, err)
          }
        }
      } catch (err) {
        console.error('Error reading folder:', folderPath, err)
      }
    }

    // 2. Group by size
    const sizeGroups: Record<number, DuplicateFile[]> = {}
    for (const file of fileList) {
      if (!sizeGroups[file.size]) sizeGroups[file.size] = []
      sizeGroups[file.size].push(file)
    }

    // 3. Hash only files that share a size (potential duplicates)
    const duplicateGroups: DuplicateGroup[] = []
    
    for (const sizeStr in sizeGroups) {
      const files = sizeGroups[sizeStr]
      if (files.length < 2) continue // No duplicates possible

      const hashGroups: Record<string, DuplicateFile[]> = {}

      for (const file of files) {
        try {
          const hash = await this.hashFile(file.path)
          if (!hashGroups[hash]) hashGroups[hash] = []
          hashGroups[hash].push(file)
        } catch (err) {
          console.error('Error hashing file:', file.path, err)
        }
      }

      // 4. Collect actual duplicate groups
      for (const hash in hashGroups) {
        if (hashGroups[hash].length > 1) {
          duplicateGroups.push({
            hash,
            size: parseInt(sizeStr, 10),
            files: hashGroups[hash]
          })
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

        // Handle naming conflicts in Duplicates folder
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

  private hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)

      stream.on('data', (data) => hash.update(data))
      stream.on('end', () => resolve(hash.digest('hex')))
      stream.on('error', reject)
    })
  }
}
