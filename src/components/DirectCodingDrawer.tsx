import { useMemo, useState } from 'react'
import { FileCode2, Plus, RotateCw, Save, ShieldAlert, Trash2, X } from 'lucide-react'
import type { CaseDecision, CodingCase, CodingChange, CodingEntry, CodingEntryType } from '../types'
import { dateForEvent, formatDay } from './TreatmentRibbon'

export interface DirectCodingInput {
  action: Extract<CodingChange, 'added' | 'changed' | 'deleted'>
  type: CodingEntryType
  code: string
  description: string
  targetEntryId?: string
  treatmentEventId?: string
  serviceDate?: string
  serviceEndDate?: string
  laterality?: CodingEntry['laterality']
  quantity?: number
  department?: string
  decisionId: string
}

interface DirectCodingDrawerProps {
  codingCase: CodingCase
  decision: CaseDecision
  running: boolean
  onClose: () => void
  onSave: (input: DirectCodingInput) => Promise<void>
}

const actionLabels = { added: 'Ergänzen', changed: 'Ändern', deleted: 'Löschen' }

export function DirectCodingDrawer({ codingCase, decision, running, onClose, onSave }: DirectCodingDrawerProps) {
  const activeEntries = useMemo(() => codingCase.codingEntries.filter((entry) => entry.active), [codingCase.codingEntries])
  const recommendedType: CodingEntryType = decision.id === 'decision-main' ? 'HD' : decision.id.includes('therapy') || decision.id.includes('palliative') ? 'OPS' : 'ND'
  const recommendedTarget = activeEntries.find((entry) => entry.type === recommendedType) ?? activeEntries[0]
  const initialAction: DirectCodingInput['action'] = recommendedType === 'HD' && recommendedTarget?.type === 'HD' ? 'changed' : 'added'
  const [action, setAction] = useState<DirectCodingInput['action']>(initialAction)
  const [type, setType] = useState<CodingEntryType>(recommendedType)
  const [targetEntryId, setTargetEntryId] = useState(recommendedTarget?.id ?? '')
  const initialEntry = initialAction === 'changed' ? recommendedTarget : undefined
  const [code, setCode] = useState(initialEntry?.code ?? '')
  const [description, setDescription] = useState(initialEntry?.description ?? '')
  const [treatmentEventId, setTreatmentEventId] = useState(initialEntry?.treatmentEventId ?? '')
  const [serviceDate, setServiceDate] = useState(initialEntry?.serviceDate ?? codingCase.admissionDate ?? '')
  const [serviceEndDate, setServiceEndDate] = useState(initialEntry?.serviceEndDate ?? '')
  const [department, setDepartment] = useState(initialEntry?.department ?? 'Gesamtfall')
  const [laterality, setLaterality] = useState<NonNullable<CodingEntry['laterality']>>(initialEntry?.laterality ?? 'keine')
  const [quantity, setQuantity] = useState(initialEntry?.quantity ?? 1)
  const [error, setError] = useState('')
  const targetEntry = activeEntries.find((entry) => entry.id === targetEntryId)

  const loadEntry = (entry?: CodingEntry) => {
    if (!entry) return
    setTargetEntryId(entry.id)
    setType(entry.type)
    setCode(entry.code)
    setDescription(entry.description)
    setTreatmentEventId(entry.treatmentEventId ?? '')
    setServiceDate(entry.serviceDate ?? codingCase.admissionDate ?? '')
    setServiceEndDate(entry.serviceEndDate ?? '')
    setDepartment(entry.department ?? 'Gesamtfall')
    setLaterality(entry.laterality ?? 'keine')
    setQuantity(entry.quantity ?? 1)
  }

  const changeAction = (nextAction: DirectCodingInput['action']) => {
    setAction(nextAction)
    setError('')
    if (nextAction !== 'added') loadEntry(targetEntry ?? recommendedTarget)
    if (nextAction === 'added') {
      setType(recommendedType)
      setCode('')
      setDescription('')
    }
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
      treatmentEventId: treatmentEventId || undefined,
      serviceDate: serviceDate || undefined,
      serviceEndDate: serviceEndDate || undefined,
      laterality: (action === 'added' ? type : targetEntry?.type) === 'OPS' ? laterality : undefined,
      quantity: (action === 'added' ? type : targetEntry?.type) === 'OPS' ? quantity : undefined,
      department: department || undefined,
      decisionId: decision.id,
    })
  }

  return (
    <div className="drawer-backdrop coding-entry-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer coding-entry-drawer direct-coding-drawer" role="dialog" aria-modal="true" aria-labelledby="direct-coding-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Freie Kodierung · neue Iteration</div><h2 id="direct-coding-title">ICD / OPS eingeben</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="coding-source-strip manual-code-source">
          <FileCode2 aria-hidden="true" />
          <span><small>Arbeitskontext</small><strong>{decision.title}</strong><span>Direkteingabe der Kodierfachkraft ohne Dokumentbezug</span></span>
        </div>

        <div className="manual-code-warning">
          <ShieldAlert aria-hidden="true" />
          <span><strong>Arbeitskode, noch nicht belegt</strong><small>Der Grouper und alle DRG-Hypothesen werden neu bewertet. Die Prüfentscheidung bleibt offen, bis der Fallbezug belegt oder fachlich entschieden ist.</small></span>
        </div>

        <fieldset className="coding-action-choice">
          <legend>Was ändert sich gegenüber der Vorkodierung?</legend>
          {(Object.keys(actionLabels) as DirectCodingInput['action'][]).map((value) => (
            <label className={action === value ? 'active' : ''} key={value}>
              <input type="radio" name="direct-coding-action" value={value} checked={action === value} onChange={() => changeAction(value)} />
              <span>{value === 'added' ? <Plus aria-hidden="true" /> : value === 'deleted' ? <Trash2 aria-hidden="true" /> : <RotateCw aria-hidden="true" />}{actionLabels[value]}</span>
            </label>
          ))}
        </fieldset>

        {action !== 'added' && <label>Bestehenden Kode auswählen
          <select aria-label="Bestehenden Kode für freie Kodierung auswählen" value={targetEntryId} onChange={(event) => loadEntry(activeEntries.find((entry) => entry.id === event.target.value))}>
            {activeEntries.map((entry) => <option value={entry.id} key={entry.id}>{entry.type} · {entry.code} · {entry.description}</option>)}
          </select>
        </label>}

        {action === 'added' && <label>Kodetyp
          <select aria-label="Kodetyp für freie Kodierung" value={type} onChange={(event) => setType(event.target.value as CodingEntryType)}>
            <option value="HD">Hauptdiagnose (ICD)</option>
            <option value="ND">Nebendiagnose (ICD)</option>
            <option value="OPS">Prozedur (OPS)</option>
          </select>
        </label>}

        {action !== 'deleted' ? <div className="coding-entry-fields">
          <label>ICD- oder OPS-Kode
            <input aria-label="Freier ICD- oder OPS-Kode" value={code} onChange={(event) => setCode(event.target.value)} placeholder={(action === 'added' ? type : targetEntry?.type) === 'OPS' ? 'z. B. 8-98e.0' : 'z. B. J18.9'} autoComplete="off" />
          </label>
          <label>Beschreibung <span>(optional)</span>
            <textarea aria-label="Beschreibung der freien Kodierung" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Kurze fallbezogene Einordnung" />
          </label>
          <details className="direct-coding-parameters">
            <summary>Kodierparameter ergänzen</summary>
            <div className="coding-parameter-grid">
              <label>Ereignisbezug
                <select aria-label="Ereignisbezug der freien Kodierung" value={treatmentEventId} onChange={(event) => {
                  const id = event.target.value
                  const linkedEvent = codingCase.timeline.find((item) => item.id === id)
                  setTreatmentEventId(id)
                  if (linkedEvent) {
                    setServiceDate(dateForEvent(codingCase, linkedEvent) ?? '')
                    setDepartment(linkedEvent.department)
                  }
                }}>
                  <option value="">Kein Ereignis gewählt</option>
                  {codingCase.timeline.map((event) => <option value={event.id} key={event.id}>{formatDay(codingCase, event.day)} · {event.label}</option>)}
                </select>
              </label>
              <label>Fachabteilung<input aria-label="Fachabteilung der freien Kodierung" value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
              <label>Leistungsdatum<input aria-label="Leistungsdatum der freien Kodierung" type="date" value={serviceDate} min={codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
              <label>Enddatum <span>(optional)</span><input aria-label="Enddatum der freien Kodierung" type="date" value={serviceEndDate} min={serviceDate || codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceEndDate(event.target.value)} /></label>
              {(action === 'added' ? type : targetEntry?.type) === 'OPS' && <label>Seitenlokalisation<select aria-label="Seitenlokalisation der freien Kodierung" value={laterality} onChange={(event) => setLaterality(event.target.value as NonNullable<CodingEntry['laterality']>)}><option value="keine">Keine</option><option value="links">Links</option><option value="rechts">Rechts</option><option value="beidseits">Beidseits</option></select></label>}
              {(action === 'added' ? type : targetEntry?.type) === 'OPS' && <label>Anzahl<input aria-label="Anzahl der freien Kodierung" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>}
            </div>
          </details>
        </div> : targetEntry ? <div className="coding-delete-preview"><Trash2 aria-hidden="true" /><span><strong>{targetEntry.type} · {targetEntry.code}</strong><small>{targetEntry.description}</small><span>Bleibt als gelöscht in der KIS-Übergabe und Historie sichtbar.</span></span></div> : null}

        <div className="coding-iteration-preview">
          <RotateCw aria-hidden="true" />
          <span><strong>Speichern erzeugt Iteration {codingCase.grouperRuns.length + 1}.</strong><small>Alle offenen und erledigten Hypothesenbestandteile erhalten den neuen Bewertungsstand.</small></span>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="button-row end">
          <button className="button secondary" type="button" disabled={running} onClick={onClose}>Abbrechen</button>
          <button className="button primary" type="button" disabled={running} onClick={() => void submit()}>{running ? <RotateCw className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{running ? 'Grouper läuft …' : `${actionLabels[action]} und alles neu bewerten`}</button>
        </div>
      </aside>
    </div>
  )
}
