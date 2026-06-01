import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import * as path from 'path'
import { FileWatcherService } from './file-watcher'

export class TrayManager {
  private tray: Tray | null = null
  private fileWatcher: FileWatcherService
  private quitApp: () => void

  constructor(fileWatcher: FileWatcherService, quitApp: () => void) {
    this.fileWatcher = fileWatcher
    this.quitApp = quitApp
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
      app.emit('activate')
    })
  }

  updateMenu(): void {
    if (!this.tray) return

    const isPaused = this.fileWatcher.isPaused()

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Organizer',
        click: () => {
          app.emit('activate')
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
          this.quitApp()
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
