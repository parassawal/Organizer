import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { DuplicateGroup, WatchedFolder } from '../types'

export default function Duplicates() {
  const api = useAPI()
  const [folders, setFolders] = useState<WatchedFolder[]>([])
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [scanning, setScanning] = useState(false)
  const [moving, setMoving] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.getWatchedFolders().then(setFolders)
  }, [api])

  const handleScan = async () => {
    if (folders.length === 0) return
    setScanning(true)
    setSelectedPaths(new Set())
    try {
      const paths = folders.map(f => f.path)
      const results = await api.scanDuplicates(paths)
      // Sort by size (largest first)
      results.sort((a, b) => b.size - a.size)
      setGroups(results)
    } finally {
      setScanning(false)
    }
  }

  const handleToggleFile = (path: string) => {
    const next = new Set(selectedPaths)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setSelectedPaths(next)
  }

  const handleSelectGroupOldest = (group: DuplicateGroup) => {
    // Keep the one with the shortest path name typically, or just keep the first one
    // We'll just select all except the first one in the array to move
    const next = new Set(selectedPaths)
    group.files.forEach((f, i) => {
      if (i === 0) next.delete(f.path)
      else next.add(f.path)
    })
    setSelectedPaths(next)
  }

  const handleMoveSelected = async () => {
    if (selectedPaths.size === 0) return
    setMoving(true)
    try {
      const pathsToMove = Array.from(selectedPaths)
      await api.moveDuplicates(pathsToMove)
      
      // Remove moved files from state
      setGroups(prev => {
        return prev.map(g => ({
          ...g,
          files: g.files.filter(f => !pathsToMove.includes(f.path))
        })).filter(g => g.files.length > 1) // Remove groups that no longer have duplicates
      })
      setSelectedPaths(new Set())
    } finally {
      setMoving(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  const totalDuplicateSpace = groups.reduce((acc, g) => acc + (g.size * (g.files.length - 1)), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Duplicates</h1>
        <p className="page-subtitle">Find exact file duplicates across your watched folders (based on content hash)</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={handleScan} disabled={scanning || folders.length === 0}>
          {scanning ? '⏳ Scanning...' : '🔍 Scan for Duplicates'}
        </button>
        {groups.length > 0 && (
          <button className="btn btn-secondary" onClick={handleMoveSelected} disabled={moving || selectedPaths.size === 0}>
            {moving ? '⏳ Moving...' : `📂 Move Selected to 'Duplicates' (${selectedPaths.size})`}
          </button>
        )}
      </div>

      {groups.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">
            Found {groups.length} duplicate groups. Potential space savings: {formatSize(totalDuplicateSpace)}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.map((group, index) => (
              <div key={index} className="section-card">
                <div className="section-header" style={{ padding: '10px 14px' }}>
                  <div className="section-title">
                    {group.files[0].name} <span style={{ opacity: 0.5, fontWeight: 'normal', fontSize: 12, marginLeft: 8 }}>{formatSize(group.size)} each</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleSelectGroupOldest(group)}>
                    Select Copies (Keep One)
                  </button>
                </div>
                <div className="section-body">
                  {group.files.map(file => (
                    <label key={file.path} className="activity-item" style={{ cursor: 'pointer', display: 'flex', padding: '8px 14px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedPaths.has(file.path)} 
                        onChange={() => handleToggleFile(file.path)} 
                        style={{ marginRight: 12 }}
                      />
                      <div className="activity-details">
                        <div className="activity-filename">{file.name}</div>
                        <div className="activity-path" title={file.path}>{file.path}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && !scanning && (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <div className="empty-state-title">No duplicates found</div>
            <div className="empty-state-desc">
              Run a scan to check for duplicate files in your watched folders.
            </div>
            {folders.length === 0 && (
              <div style={{ marginTop: 12, color: 'var(--accent-amber)', fontSize: 12 }}>
                ⚠️ You need to add a Watched Folder first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
