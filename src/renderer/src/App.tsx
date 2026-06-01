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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />
      case 'folders': return <WatchFolders />
      case 'rules': return <Rules />
      case 'activity': return <ActivityLog />
      case 'duplicates': return <Duplicates />
      case 'settings': return <Settings />
    }
  }

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main-content">
        <div className="titlebar">Organizer</div>
        <div className="page-content">
          <div className="page-enter" key={currentPage}>
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  )
}
