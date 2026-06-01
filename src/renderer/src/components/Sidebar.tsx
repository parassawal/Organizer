import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import logoImg from '../assets/logo.jpg'

type Page = 'dashboard' | 'folders' | 'rules' | 'activity' | 'duplicates' | 'settings'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const navItems: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'folders', label: 'Watch Folders' },
  { id: 'rules', label: 'Rules' },
  { id: 'activity', label: 'Activity Log' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'settings', label: 'Settings' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const api = useAPI()
  const [status, setStatus] = useState({ paused: false, activeWatchers: 0 })

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const s = await api.getWatchingStatus()
        setStatus(s)
      } catch { /* ignore */ }
    }
    loadStatus()
    const interval = setInterval(loadStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logoImg} alt="Logo" className="sidebar-logo-icon" style={{ padding: 0, objectFit: 'cover' }} />
        <span className="sidebar-logo-text">Organizer</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-status">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`status-dot ${status.paused ? 'paused' : 'active'}`} />
          <span className="status-text">
            {status.paused ? 'Paused' : 'Watching'}
          </span>
        </div>
        <div className="status-text" style={{ marginTop: 4, paddingLeft: 16 }}>
          {status.activeWatchers} folder{status.activeWatchers !== 1 ? 's' : ''} active
        </div>
      </div>
    </div>
  )
}
