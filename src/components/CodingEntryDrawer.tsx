import { useMemo, useState } from 'react'
import { FileCode2, Plus, RotateCw, Save, Trash2, X } from 'lucide-react'
import type { CodingChange, CodingEntry, CodingEntryType, DocumentMapItem } from '../types'

export interface CodingEntryInput {
  action: Extract<CodingChange, 'added' | 'changed' | 'deleted'>
  type: CodingEntryType
  code: string
  description: string
  targetEntryId?: string
  evidenceDocumentId: string
}

interface CodingEntryDrawerProps {
  document: DocumentMapItem
  entries: CodingEntry[]
  running: boolean
  onClose: () => void
  onSave: (input: CodingEntryInput) => Promise<void>
}

const actionLabels = {
  added: 'Ergänzen',
  changed: 'Ändern',
  deleted: 'Löschen',
}

export function CodingEntryDrawer({ document, entries, running, onClose, onSave }: CodingEntryDrawerProps) {
  const activeEntries = useMemo(() => entries.filter((entry) => entry.active), [entries])
  const [action, setAction] = useState<CodingEntryInput['action']>('added')
  const [type, setType] = useState<CodingEntryType>('ND')
  const [targetEntryId, setTargetEntryId] = useState(activeEntries[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const targetEntry = activeEntries.find((entry) => entry.id === targetEntryId)

  const changeAction = (nextAction: CodingEntryInput['action']) => {
    setAction(nextAction)
    setError('')
    if (nextAction !== 'added') {
      const entry = targetEntry ?? activeEntries[0]
      if (!entry) return
      setTargetEntryId(entry.id)
      setType(entry.type)
      setCode(entry.code)
      setDescription(entry.description)
    }
  }

  const changeTarget = (entryId: string) => {
    setTargetEntryId(entryId)
    const entry = activeEntries.find((item) => item.id === entryId)
    if (!entry) return
    setType(entry.type)
    setCode(entry.code)
    setDescription(entry.description)
  }

  const submit = async () => {
    setError('')
    if (action !== 'added' && !targetEntry) {
      setError('Bitte einen bestehenden Kode auswählen.')
      return
    }
    if (action !== 'deleted' && !code.trim()) {
      setError('Bitte einen ICD- oder OPS-Kode eingeben.')
      return
    }
    if (action === 'added' && type === 'HD' && activeEntries.some((entry) => entry.type === 'HD')) {
      setError('Es gibt bereits eine aktive Hauptdiagnose. Nutze „Ändern“ für einen Wechsel.')
      return
    }
    await onSave({
      action,
      type: action === 'added' ? type : targetEntry!.type,
      code: action === 'deleted' ? targetEntry!.code : code.trim().toUpperCase(),
      description: action === 'deleted' ? targetEntry!.description : description.trim(),
      targetEntryId: action === 'added' ? undefined : targetEntry!.id,
      evidenceDocumentId: document.id,
    })
  }

  return (
    <div className="drawer-backdrop coding-entry-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer coding-entry-drawer" role="dialog" aria-modal="true" aria-labelledby="coding-entry-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Dokumentnachweis · neue Iteration</div><h2 id="coding-entry-title">ICD / OPS erfassen</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="coding-source-strip">
          <FileCode2 aria-hidden="true" />
          <span><small>Belegquelle</small><strong>{document.title}</strong><span>Bewertet bisher in Iteration {document.assessedIteration}</span></span>
        </div>

        <fieldset className="coding-action-choice">
          <legend>Was ändert sich gegenüber der Vorkodierung?</legend>
          {(Object.keys(actionLabels) as CodingEntryInput['action'][]).map((value) => (
            <label className={action === value ? 'active' : ''} key={value}>
              <input type="radio" name="coding-action" value={value} checked={action === value} onChange={() => changeAction(value)} />
              <span>{value === 'added' ? <Plus aria-hidden="true" /> : value === 'deleted' ? <Trash2 aria-hidden="true" /> : <RotateCw aria-hidden="true" />}{actionLabels[value]}</span>
            </label>
          ))}
        </fieldset>

        {action !== 'added' && (
          <label>Bestehenden Kode auswählen
            <select aria-label="Bestehenden Kode auswählen" value={targetEntryId} onChange={(event) => changeTarget(event.target.value)}>
              {activeEntries.map((entry) => <option value={entry.id} key={entry.id}>{entry.type} · {entry.code} · {entry.description}</option>)}
            </select>
          </label>
        )}

        {action === 'added' && (
          <label>Kodetyp
            <select aria-label="Kodetyp" value={type} onChange={(event) => setType(event.target.value as CodingEntryType)}>
              <option value="HD">Hauptdiagnose (ICD)</option>
              <option value="ND">Nebendiagnose (ICD)</option>
              <option value="OPS">Prozedur (OPS)</option>
            </select>
          </label>
        )}

        {action !== 'deleted' ? (
          <div className="coding-entry-fields">
            <label>ICD- oder OPS-Kode
              <input aria-label="ICD- oder OPS-Kode" value={code} onChange={(event) => setCode(event.target.value)} placeholder={type === 'OPS' ? 'z. B. 1-620.0' : 'z. B. J18.9'} autoComplete="off" />
            </label>
            <label>Beschreibung <span>(optional)</span>
              <textarea aria-label="Beschreibung" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Kurze fallbezogene Einordnung" />
            </label>
          </div>
        ) : targetEntry ? (
          <div className="coding-delete-preview"><Trash2 aria-hidden="true" /><span><strong>{targetEntry.type} · {targetEntry.code}</strong><small>{targetEntry.description}</small><span>Bleibt als gelöscht in der KIS-Übergabe und Historie sichtbar.</span></span></div>
        ) : null}

        <div className="coding-iteration-preview">
          <RotateCw aria-hidden="true" />
          <span><strong>Speichern startet automatisch den Grouper.</strong><small>Der aktuelle Stand wird nicht überschrieben. Die Änderung bekommt eine neue Iteration und Bewertung.</small></span>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="button-row end">
          <button className="button secondary" type="button" onClick={onClose}>Abbrechen</button>
          <button className="button primary" type="button" disabled={running} onClick={() => void submit()}>{running ? <RotateCw className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{running ? 'Grouper läuft …' : `${actionLabels[action]} und neu bewerten`}</button>
        </div>
      </aside>
    </div>
  )
}
