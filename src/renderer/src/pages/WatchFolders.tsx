import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { WatchedFolder } from '../types'

export default function WatchFolders() {
  const api = useAPI()
  const [folders, setFolders] = useState<WatchedFolder[]>([])
  const [organizing, setOrganizing] = useState<string | null>(null)

  const loadFolders = async () => {
    try {
      const f = await api.getWatchedFolders()
      setFolders(f)
    } catch { /* ignore */ }
  }

  useEffect(() => { loadFolders() }, [])

  const handleAddFolder = async () => {
    const path = await api.selectFolder()
    if (path) {
      await api.addWatchedFolder(path)
      loadFolders()
    }
  }

  const handleRemoveFolder = async (id: string) => {
    await api.removeWatchedFolder(id)
    loadFolders()
  }

  const handleToggleFolder = async (id: string) => {
    await api.toggleWatchedFolder(id)
    loadFolders()
  }

  const handleOrganizeNow = async (id: string) => {
    setOrganizing(id)
    try {
      const count = await api.organizeNow(id)
      setOrganizing(null)
      if (count === 0) {
        // No files to organize — could show a message
      }
    } catch {
      setOrganizing(null)
    }
  }

  const getFolderName = (p: string) => p.split(/[/\\]/).pop() || p

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Watch Folders</h1>
        <p className="page-subtitle">Folders being monitored for new files. Existing files are organized automatically when a folder is added.</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={handleAddFolder}>
          + Add Folder
        </button>
      </div>

      {folders.length === 0 ? (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">No watch folders</div>
            <div className="empty-state-desc">
              Add a folder to start automatically organizing files
            </div>
            <button className="btn btn-primary" onClick={handleAddFolder}>
              + Add Your First Folder
            </button>
          </div>
        </div>
      ) : (
        <div className="folder-grid">
          {folders.map((folder) => (
            <div key={folder.id} className="folder-card">
              <div className="folder-card-icon">📁</div>
              <div className="folder-card-info">
                <div className="folder-card-path" title={folder.path}>
                  {getFolderName(folder.path)}
                </div>
                <div className="folder-card-name" title={folder.path}>
                  {folder.path}
                </div>
              </div>
              <div className="folder-card-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOrganizeNow(folder.id)}
                  disabled={organizing === folder.id}
                  title="Organize all existing files now"
                >
                  {organizing === folder.id ? '⏳ Sorting...' : '🗂️ Organize Now'}
                </button>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={folder.enabled}
                    onChange={() => handleToggleFolder(folder.id)}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleRemoveFolder(folder.id)}
                  title="Remove folder"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
