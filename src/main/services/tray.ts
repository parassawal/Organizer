import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import * as path from 'path'
import { FileWatcherService } from './file-watcher'

export class TrayManager {
  private tray: Tray | null = null
  private fileWatcher: FileWatcherService
  private mainWindow: BrowserWindow | null = null

  constructor(fileWatcher: FileWatcherService) {
    this.fileWatcher = fileWatcher
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  create(): void {
    // Create a simple 16x16 icon programmatically
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVR42mL8z8BQz0BFAMTA' +
      'QGUwagCxhhiqAZgYqAxGDYCBUQPIcwFMM8wQZDFiNMPkYIYQoxmmBpcBxGiGqcFlADGaYWpwGUCMZpgaXAYQoxmmBgABAACjVB/x' +
      'mFdYOAAAAABJRU5ErkJggg=='
    )

    this.tray = new Tray(icon.resize({ width: 16, height: 16 }))
    this.tray.setToolTip('Organizer - File Organizer')
    this.updateMenu()

    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.focus()
        } else {
          this.mainWindow.show()
        }
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
          if (this.mainWindow) {
            this.mainWindow.show()
            this.mainWindow.focus()
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
