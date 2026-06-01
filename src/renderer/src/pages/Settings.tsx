import { useState, useEffect, type KeyboardEvent } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { AppSettings } from '../types'

export default function Settings() {
  const api = useAPI()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [newPattern, setNewPattern] = useState('')

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {})
  }, [])

  const update = async (updates: Partial<AppSettings>) => {
    const updated = await api.updateSettings(updates)
    setSettings(updated)
  }

  const addExclusion = () => {
    if (!newPattern.trim() || !settings) return
    if (settings.exclusionPatterns.includes(newPattern.trim())) return
    update({ exclusionPatterns: [...settings.exclusionPatterns, newPattern.trim()] })
    setNewPattern('')
  }

  const removeExclusion = (pattern: string) => {
    if (!settings) return
    update({ exclusionPatterns: settings.exclusionPatterns.filter(p => p !== pattern) })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addExclusion()
  }

  if (!settings) return null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure Organizer preferences</p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">General</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Launch at startup</div>
            <div className="settings-row-desc">Automatically start Organizer when you log in</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.launchAtStartup} onChange={e => update({ launchAtStartup: e.target.checked })} />
            <span className="toggle-track" /><span className="toggle-thumb" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Show notifications</div>
            <div className="settings-row-desc">Display OS notifications when files are organized</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.showNotifications} onChange={e => update({ showNotifications: e.target.checked })} />
            <span className="toggle-track" /><span className="toggle-thumb" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Minimize to tray</div>
            <div className="settings-row-desc">Keep running in background when window is closed</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.minimizeToTray} onChange={e => update({ minimizeToTray: e.target.checked })} />
            <span className="toggle-track" /><span className="toggle-thumb" />
          </label>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Auto-create subfolders</div>
            <div className="settings-row-desc">Create destination folders if they don't exist</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={settings.createSubfolders} onChange={e => update({ createSubfolders: e.target.checked })} />
            <span className="toggle-track" /><span className="toggle-thumb" />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Organization</h3>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Conflict resolution</div>
            <div className="settings-row-desc">What to do when a file already exists</div>
          </div>
          <select className="input" style={{ width: 160 }} value={settings.conflictResolution}
            onChange={e => update({ conflictResolution: e.target.value as AppSettings['conflictResolution'] })}>
            <option value="rename">Rename (add number)</option>
            <option value="overwrite">Overwrite</option>
            <option value="skip">Skip</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Stability delay</div>
            <div className="settings-row-desc">Seconds to wait before organizing (handles downloads)</div>
          </div>
          <input className="input" type="number" style={{ width: 80 }} min={0} max={60}
            value={settings.stabilityDelay}
            onChange={e => update({ stabilityDelay: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Max log entries</div>
            <div className="settings-row-desc">Maximum number of activity log entries to keep</div>
          </div>
          <input className="input" type="number" style={{ width: 100 }} min={100} max={10000}
            value={settings.maxLogEntries}
            onChange={e => update({ maxLogEntries: parseInt(e.target.value) || 1000 })} />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Exclusion Patterns</h3>
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          Files matching these patterns will be ignored. Use * for wildcards.
        </p>
        <div className="tags-container">
          {settings.exclusionPatterns.map((pattern) => (
            <span key={pattern} className="tag">
              {pattern}
              <button className="tag-remove" onClick={() => removeExclusion(pattern)}>×</button>
            </span>
          ))}
          <input
            className="tags-input"
            value={newPattern}
            onChange={e => setNewPattern(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add pattern, press Enter..."
          />
        </div>
      </div>
    </div>
  )
}
