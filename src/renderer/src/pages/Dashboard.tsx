import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { AppStats, ActivityLogEntry, WatchedFolder, OrganizationRule } from '../types'

type Page = 'dashboard' | 'folders' | 'rules' | 'activity' | 'settings'

interface DashboardProps {
  onNavigate: (page: Page) => void
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const api = useAPI()
  const [stats, setStats] = useState<AppStats>({ filesOrganizedToday: 0, filesOrganizedTotal: 0, lastResetDate: '' })
  const [recentActivity, setRecentActivity] = useState<ActivityLogEntry[]>([])
  const [folders, setFolders] = useState<WatchedFolder[]>([])
  const [rules, setRules] = useState<OrganizationRule[]>([])

  const loadData = async () => {
    try {
      const [s, a, f, r] = await Promise.all([
        api.getStats(),
        api.getActivityLog(),
        api.getWatchedFolders(),
        api.getRules()
      ])
      setStats(s)
      setRecentActivity(a.slice(0, 8))
      setFolders(f)
      setRules(r)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    loadData()
    const cleanup = api.onFileOrganized(() => loadData())
    return cleanup
  }, [])

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'heic']
    const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'webm']
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg']
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf']
    const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz']
    if (imageExts.includes(ext)) return '🖼️'
    if (videoExts.includes(ext)) return '🎬'
    if (audioExts.includes(ext)) return '🎵'
    if (docExts.includes(ext)) return '📄'
    if (archiveExts.includes(ext)) return '📦'
    return '📄'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your file organization</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-icon">📂</div>
          <div className="stat-card-value">{stats.filesOrganizedToday}</div>
          <div className="stat-card-label">Files organized today</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-icon">✅</div>
          <div className="stat-card-value">{stats.filesOrganizedTotal}</div>
          <div className="stat-card-label">Total files organized</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-icon">👁️</div>
          <div className="stat-card-value">{folders.filter(f => f.enabled).length}</div>
          <div className="stat-card-label">Active watch folders</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-card-icon">📋</div>
          <div className="stat-card-value">{rules.filter(r => r.enabled).length}</div>
          <div className="stat-card-label">Active rules</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('activity')}>
            View All →
          </button>
        </div>
        <div className="section-body">
          {recentActivity.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No activity yet</div>
              <div className="empty-state-desc">
                Add a watch folder and files will be organized automatically
              </div>
              <button className="btn btn-primary" onClick={() => onNavigate('folders')}>
                Add Watch Folder
              </button>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.map((entry) => (
                <div key={entry.id} className={`activity-item ${entry.undone ? 'undone' : ''}`}>
                  <div className={`activity-icon ${entry.type}`}>
                    {entry.type === 'moved' ? '↗️' : entry.type === 'error' ? '❌' : '⏭️'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-filename">
                      {getFileIcon(entry.fileName)} {entry.fileName}
                    </div>
                    <div className="activity-path">
                      → {entry.ruleName}
                    </div>
                  </div>
                  <div className="activity-time">{formatTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
