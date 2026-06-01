import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import WatchFolders from './pages/WatchFolders'
import Rules from './pages/Rules'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'
import Duplicates from './pages/Duplicates'

type Page = 'dashboard' | 'folders' | 'rules' | 'activity' | 'duplicates' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main-content">
        <div className="titlebar">Organizer</div>
        <div className="page-content">
          <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard onNavigate={setCurrentPage} />
          </div>
          <div style={{ display: currentPage === 'folders' ? 'block' : 'none' }}>
            <WatchFolders />
          </div>
          <div style={{ display: currentPage === 'rules' ? 'block' : 'none' }}>
            <Rules />
          </div>
          <div style={{ display: currentPage === 'activity' ? 'block' : 'none' }}>
            <ActivityLog />
          </div>
          <div style={{ display: currentPage === 'duplicates' ? 'block' : 'none' }}>
            <Duplicates isActive={currentPage === 'duplicates'} />
          </div>
          <div style={{ display: currentPage === 'settings' ? 'block' : 'none' }}>
            <Settings />
          </div>
        </div>
      </div>
    </div>
  )
}
