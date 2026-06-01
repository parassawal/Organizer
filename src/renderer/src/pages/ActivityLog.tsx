import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { ActivityLogEntry } from '../types'

export default function ActivityLog() {
  const api = useAPI()
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'moved' | 'error' | 'skipped'>('all')

  const loadLog = async () => {
    try { setEntries(await api.getActivityLog()) } catch { /* ignore */ }
  }

  useEffect(() => {
    loadLog()
    const cleanup = api.onFileOrganized(() => loadLog())
    return cleanup
  }, [])

  const handleUndo = async (id: string) => {
    await api.undoAction(id)
    loadLog()
  }

  const handleClear = async () => {
    await api.clearActivityLog()
    loadLog()
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter)

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Activity Log</h1>
        <p className="page-subtitle">History of all file organization actions</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <select className="input" style={{ width: 160 }} value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All Activity</option>
          <option value="moved">Moved</option>
          <option value="error">Errors</option>
          <option value="skipped">Skipped</option>
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{filtered.length} entries</span>
        <button className="btn btn-danger btn-sm" onClick={handleClear}>Clear Log</button>
      </div>

      <div className="section-card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No activity</div>
            <div className="empty-state-desc">File organization activity will appear here</div>
          </div>
        ) : (
          <div className="activity-list" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {filtered.map((entry) => (
              <div key={entry.id} className={`activity-item ${entry.undone ? 'undone' : ''}`}>
                <div className={`activity-icon ${entry.type}`}>
                  {entry.type === 'moved' ? '↗️' : entry.type === 'error' ? '❌' : '⏭️'}
                </div>
                <div className="activity-details">
                  <div className="activity-filename">{entry.fileName}</div>
                  <div className="activity-path">
                    {entry.type === 'moved' ? `→ ${entry.destinationPath}` : entry.type === 'error' ? 'Failed to organize' : 'Skipped (conflict)'}
                  </div>
                  <div className="activity-path" style={{ fontSize: 10.5, marginTop: 2 }}>
                    Rule: {entry.ruleName}
                  </div>
                </div>
                <div className="activity-time">{formatTime(entry.timestamp)}</div>
                <div className="activity-actions">
                  {entry.type === 'moved' && !entry.undone && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleUndo(entry.id)}>
                      ↩ Undo
                    </button>
                  )}
                  {entry.undone && (
                    <span style={{ fontSize: 11, color: 'var(--accent-amber)' }}>Undone</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
