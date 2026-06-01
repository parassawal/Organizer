import * as fs from 'fs'
import type { FileTypeGroup } from '../../renderer/src/types'

export function getFileTypeByMagicNumber(filePath: string): FileTypeGroup | 'unknown' {
  try {
    const buffer = Buffer.alloc(16)
    const fd = fs.openSync(filePath, 'r')
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0)
    fs.closeSync(fd)

    if (bytesRead === 0) return 'unknown'

    const hex = buffer.toString('hex').toUpperCase()
    
    // --- Images ---
    if (hex.startsWith('FFD8FF')) return 'images' // JPEG
    if (hex.startsWith('89504E47')) return 'images' // PNG
    if (hex.startsWith('47494638')) return 'images' // GIF
    if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') return 'images' // WEBP (RIFF...WEBP)
    if (hex.startsWith('49492A00') || hex.startsWith('4D4D002A')) return 'images' // TIFF
    if (hex.startsWith('00000100') && filePath.toLowerCase().endsWith('.ico')) return 'images' // ICO (weak signature, added check for safety)

    // --- Documents ---
    if (hex.startsWith('25504446')) return 'documents' // PDF (%PDF)
    if (hex.startsWith('D0CF11E0A1B11AE1')) return 'documents' // Legacy Office (DOC, XLS, PPT)
    if (hex.startsWith('7B5C727466')) return 'documents' // RTF ({\rtf)
    
    // --- Archives & ZIP-based Documents ---
    // Note: DOCX, XLSX, PPTX are technically ZIP files.
    if (hex.startsWith('504B0304') || hex.startsWith('504B0506') || hex.startsWith('504B0708')) {
      // It's a ZIP archive. It could be an Office document. 
      // For a basic file organizer, grouping zip-based docs into 'archives' is okay unless we read deeper,
      // but let's assume if the extension is explicitly .docx/.xlsx/.pptx, the normal extension check caught it.
      // If we fall back to magic number, we return archives.
      return 'archives' 
    }
    if (hex.startsWith('526172211A0700') || hex.startsWith('526172211A070100')) return 'archives' // RAR
    if (hex.startsWith('377ABCAF271C')) return 'archives' // 7z
    if (hex.startsWith('1F8B08')) return 'archives' // GZ
    if (hex.startsWith('425A68')) return 'archives' // BZ2
    if (hex.startsWith('FD377A585A00')) return 'archives' // XZ
    if (hex.startsWith('7801')) return 'archives' // DMG (Mac Disk Image - zlib)

    // --- Audio ---
    if (hex.startsWith('494433')) return 'audio' // MP3 (ID3v2)
    if (hex.startsWith('FFFB') || hex.startsWith('FFF3') || hex.startsWith('FFF2')) return 'audio' // MP3 (no ID3)
    if (hex.startsWith('4F676753')) return 'audio' // OGG
    if (hex.startsWith('664C6143')) return 'audio' // FLAC
    if (hex.startsWith('52494646') && hex.substring(16, 24) === '57415645') return 'audio' // WAV (RIFF...WAVE)

    // --- Videos ---
    // MP4/MOV/M4V contain 'ftyp' at bytes 4-7
    if (hex.substring(8, 16) === '66747970') return 'videos' 
    if (hex.startsWith('1A45DFA3')) return 'videos' // MKV, WebM
    if (hex.startsWith('52494646') && hex.substring(16, 24) === '41564920') return 'videos' // AVI (RIFF...AVI )
    if (hex.startsWith('464C5601')) return 'videos' // FLV

    // --- Executables ---
    if (hex.startsWith('4D5A')) return 'executables' // EXE, DLL (MZ)
    if (hex.startsWith('7F454C46')) return 'executables' // ELF (Linux)
    if (hex.startsWith('CEFAEDFE') || hex.startsWith('CFFAEDFE') || hex.startsWith('FEEDFACE') || hex.startsWith('CAFEBABE')) return 'executables' // Mach-O (macOS)

    return 'unknown'
  } catch (err) {
    return 'unknown'
  }
}
