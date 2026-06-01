import { useState } from 'react'
import type { OrganizationRule, RuleCondition } from '../types'

interface RuleEditorProps {
  rule: OrganizationRule | null
  onSave: (data: {
    name: string
    destination: string
    conditions: RuleCondition[]
    conditionLogic: 'AND' | 'OR'
    priority: number
    enabled: boolean
  }) => void
  onClose: () => void
}

const conditionTypes: { value: RuleCondition['type']; label: string }[] = [
  { value: 'extension', label: 'File Extension' },
  { value: 'typeGroup', label: 'File Type Group' },
  { value: 'namePattern', label: 'Name Pattern' },
  { value: 'sizeGreaterThan', label: 'Size Greater Than' },
  { value: 'sizeLessThan', label: 'Size Less Than' },
]

const typeGroups = ['images', 'videos', 'audio', 'documents', 'archives', 'code', 'executables', 'fonts']

export default function RuleEditor({ rule, onSave, onClose }: RuleEditorProps) {
  const [name, setName] = useState(rule?.name || '')
  const [destination, setDestination] = useState(rule?.destination || '')
  const [conditions, setConditions] = useState<RuleCondition[]>(rule?.conditions || [{ type: 'extension', value: '' }])
  const [conditionLogic, setConditionLogic] = useState<'AND' | 'OR'>(rule?.conditionLogic || 'OR')
  const [priority, setPriority] = useState(rule?.priority || 1)
  const [enabled, setEnabled] = useState(rule?.enabled ?? true)

  const addCondition = () => {
    setConditions([...conditions, { type: 'extension', value: '' }])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, field: 'type' | 'value', val: string) => {
    const updated = [...conditions]
    if (field === 'type') {
      updated[index] = { type: val as RuleCondition['type'], value: '' }
    } else {
      updated[index] = { ...updated[index], value: val }
    }
    setConditions(updated)
  }

  const handleSubmit = () => {
    if (!name.trim() || !destination.trim() || conditions.some(c => !c.value.trim())) return
    onSave({ name, destination, conditions, conditionLogic, priority, enabled })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{rule ? 'Edit Rule' : 'New Rule'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label className="input-label">Rule Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Images" />
          </div>

          <div className="input-group">
            <label className="input-label">Destination Folder</label>
            <input className="input" value={destination} onChange={e => setDestination(e.target.value)} placeholder="e.g., Images (relative) or /abs/path" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Priority</label>
              <input className="input" type="number" min={1} value={priority} onChange={e => setPriority(parseInt(e.target.value) || 1)} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Condition Logic</label>
              <select className="input" value={conditionLogic} onChange={e => setConditionLogic(e.target.value as 'AND' | 'OR')}>
                <option value="OR">Match ANY condition</option>
                <option value="AND">Match ALL conditions</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Conditions</label>
            {conditions.map((cond, i) => (
              <div key={i} className="condition-row">
                <select className="input" value={cond.type} onChange={e => updateCondition(i, 'type', e.target.value)}>
                  {conditionTypes.map(ct => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
                {cond.type === 'typeGroup' ? (
                  <select className="input" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)}>
                    <option value="">Select type...</option>
                    {typeGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <input
                    className="input"
                    value={cond.value}
                    onChange={e => updateCondition(i, 'value', e.target.value)}
                    placeholder={
                      cond.type === 'extension' ? '.pdf' :
                      cond.type === 'namePattern' ? 'invoice_*' :
                      cond.type === 'sizeGreaterThan' || cond.type === 'sizeLessThan' ? 'Bytes (e.g., 104857600)' :
                      'Value'
                    }
                  />
                )}
                {conditions.length > 1 && (
                  <button className="btn btn-ghost btn-icon" onClick={() => removeCondition(i)}>✕</button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={addCondition}>+ Add Condition</button>
          </div>

          <div className="settings-row" style={{ borderBottom: 'none', paddingTop: 8 }}>
            <div>
              <div className="settings-row-label">Enabled</div>
              <div className="settings-row-desc">Rule is active and will match files</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {rule ? 'Save Changes' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  )
}
