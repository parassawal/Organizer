import { useState, useEffect } from 'react'
import { useAPI } from '../hooks/useElectronAPI'
import type { OrganizationRule, RuleCondition } from '../types'
import RuleEditor from '../components/RuleEditor'

export default function Rules() {
  const api = useAPI()
  const [rules, setRules] = useState<OrganizationRule[]>([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<OrganizationRule | null>(null)

  const loadRules = async () => {
    try { setRules(await api.getRules()) } catch { /* ignore */ }
  }

  useEffect(() => { loadRules() }, [])

  const handleAdd = () => {
    setEditingRule(null)
    setShowEditor(true)
  }

  const handleEdit = (rule: OrganizationRule) => {
    setEditingRule(rule)
    setShowEditor(true)
  }

  const handleSave = async (data: {
    name: string
    destination: string
    conditions: RuleCondition[]
    conditionLogic: 'AND' | 'OR'
    priority: number
    enabled: boolean
  }) => {
    if (editingRule) {
      await api.updateRule(editingRule.id, data)
    } else {
      await api.addRule(data)
    }
    setShowEditor(false)
    loadRules()
  }

  const handleDelete = async (id: string) => {
    await api.deleteRule(id)
    loadRules()
  }

  const handleToggle = async (rule: OrganizationRule) => {
    await api.updateRule(rule.id, { enabled: !rule.enabled })
    loadRules()
  }

  const handleReset = async () => {
    await api.resetRules()
    loadRules()
  }

  const describeConditions = (conditions: RuleCondition[]) => {
    return conditions.map(c => {
      switch (c.type) {
        case 'extension': return c.value
        case 'typeGroup': return c.value
        case 'namePattern': return `"${c.value}"`
        case 'sizeGreaterThan': return `> ${formatBytes(parseInt(c.value))}`
        case 'sizeLessThan': return `< ${formatBytes(parseInt(c.value))}`
        case 'dateCreated': return `date: ${c.value}`
        default: return c.value
      }
    })
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB'
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(0) + ' MB'
    return (bytes / 1073741824).toFixed(1) + ' GB'
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Organization Rules</h1>
        <p className="page-subtitle">Define how files should be organized</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={handleAdd}>+ New Rule</button>
        <button className="btn btn-secondary" onClick={handleReset}>Reset to Defaults</button>
      </div>

      {rules.length === 0 ? (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No rules configured</div>
            <div className="empty-state-desc">
              Create rules to define how files should be organized
            </div>
            <button className="btn btn-primary" onClick={handleAdd}>+ Create Rule</button>
          </div>
        </div>
      ) : (
        <div className="rules-list">
          {rules.sort((a, b) => a.priority - b.priority).map((rule) => (
            <div key={rule.id} className={`rule-card ${!rule.enabled ? 'disabled' : ''}`}>
              <div className="rule-card-priority">{rule.priority}</div>
              <div className="rule-card-info">
                <div className="rule-card-name">{rule.name}</div>
                <div className="rule-card-desc">→ {rule.destination}/</div>
                <div className="rule-card-badges">
                  {describeConditions(rule.conditions).map((desc, i) => (
                    <span key={i} className="badge">{desc}</span>
                  ))}
                  {rule.conditions.length > 1 && (
                    <span className="badge green">{rule.conditionLogic}</span>
                  )}
                </div>
              </div>
              <div className="rule-card-actions">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggle(rule)}
                  />
                  <span className="toggle-track" />
                  <span className="toggle-thumb" />
                </label>
                <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(rule)} title="Edit">✏️</button>
                <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(rule.id)} title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSave}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
