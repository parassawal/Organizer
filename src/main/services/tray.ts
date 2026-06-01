import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import * as path from 'path'
import { FileWatcherService } from './file-watcher'

export class TrayManager {
  private tray: Tray | null = null
  private fileWatcher: FileWatcherService
  private createWindow: () => void

  constructor(fileWatcher: FileWatcherService, createWindow: () => void) {
    this.fileWatcher = fileWatcher
    this.createWindow = createWindow
  }

  create(): void {
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVR42mL8z8BQz0BFAMTA' +
      'QGUwagCxhhiqAZgYqAxGDYCBUQPIcwFMM8wQZDFiNMPkYIYQoxmmBpcBxGiGqcFlADGaYWpwGUCMZpgaXAYQoxmmBgABAACjVB/x' +
      'mFdYOAAAAABJRU5ErkJggg=='
    )

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
    this.tray.setToolTip('Organizer - File Organizer')
    this.updateMenu()

    this.tray.on('click', () => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        if (windows[0].isVisible()) {
          windows[0].focus()
        } else {
          windows[0].show()
        }
      } else {
        this.createWindow()
      }
    })
  }

  updateMenu(): void {
    if (!this.tray) return

    const isPaused = this.fileWatcher.isPaused()

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Organizer',
        click: () => {
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].show()
            windows[0].focus()
          } else {
            this.createWindow()
          }
        }
      },
      { type: 'separator' },
      {
        label: isPaused ? '▶ Resume Watching' : '⏸ Pause Watching',
        click: () => {
          if (isPaused) {
            this.fileWatcher.resume()
          } else {
            this.fileWatcher.pause()
          }
          this.updateMenu()
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Organizer',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
