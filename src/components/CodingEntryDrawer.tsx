import { useMemo, useState } from 'react'
import { FileCode2, Plus, RotateCw, Save, Trash2, X } from 'lucide-react'
import type { CodingCase, CodingChange, CodingEntry, CodingEntryType, CodingReviewStatus, DocumentMapItem } from '../types'
import { getCatalogText } from '../data/codeCatalog'
import { CatalogCodeText, CodeCatalogSearch } from './CodeCatalogSearch'
import { dateForEvent, formatDay } from './TreatmentRibbon'

export interface CodingEntryInput {
  action: Extract<CodingChange, 'added' | 'changed' | 'deleted'>
  type: CodingEntryType
  code: string
  description: string
  targetEntryId?: string
  evidenceDocumentId: string
  treatmentEventId?: string
  serviceDate?: string
  serviceTime?: string
  serviceEndDate?: string
  laterality?: CodingEntry['laterality']
  quantity?: number
  department?: string
  reviewStatus: CodingReviewStatus
}

interface CodingEntryDrawerProps {
  document: DocumentMapItem
  codingCase: CodingCase
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

export function CodingEntryDrawer({ document, codingCase, entries, running, onClose, onSave }: CodingEntryDrawerProps) {
  const activeEntries = useMemo(() => entries
    .filter((entry) => entry.active)
    .sort((a, b) => Number(b.evidenceDocumentId === document.id) - Number(a.evidenceDocumentId === document.id)), [document.id, entries])
  const [action, setAction] = useState<CodingEntryInput['action']>('added')
  const [type, setType] = useState<CodingEntryType>('ND')
  const [targetEntryId, setTargetEntryId] = useState(activeEntries[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const linkedEvents = codingCase.timeline.filter((event) => event.linkedDocumentIds?.includes(document.id))
  const [treatmentEventId, setTreatmentEventId] = useState(linkedEvents[0]?.id ?? '')
  const initialDate = linkedEvents[0] ? dateForEvent(codingCase, linkedEvents[0]) : codingCase.admissionDate
  const [serviceDate, setServiceDate] = useState(initialDate ?? '')
  const [serviceTime, setServiceTime] = useState(linkedEvents[0]?.time ?? '')
  const [serviceEndDate, setServiceEndDate] = useState('')
  const [laterality, setLaterality] = useState<NonNullable<CodingEntry['laterality']>>('keine')
  const [quantity, setQuantity] = useState(1)
  const [department, setDepartment] = useState(linkedEvents[0]?.department ?? document.department)
  const [reviewStatus, setReviewStatus] = useState<CodingReviewStatus>('wahrscheinlich')
  const [error, setError] = useState('')
  const targetEntry = activeEntries.find((entry) => entry.id === targetEntryId)
  const effectiveType = action === 'added' ? type : targetEntry?.type ?? type
  const catalogKind = effectiveType === 'OPS' ? 'OPS' : 'ICD'

  const changeAction = (nextAction: CodingEntryInput['action']) => {
    setAction(nextAction)
    setError('')
    if (nextAction !== 'added') {
      const entry = targetEntry ?? activeEntries[0]
      if (!entry) return
      setTargetEntryId(entry.id)
      setType(entry.type)
      setCode(entry.code)
      setDescription(getCatalogText(entry.type === 'OPS' ? 'OPS' : 'ICD', entry.code, entry.description).shortText)
      setTreatmentEventId(entry.treatmentEventId ?? linkedEvents[0]?.id ?? '')
      setServiceDate(entry.serviceDate ?? initialDate ?? '')
      setServiceTime(entry.serviceTime ?? linkedEvents[0]?.time ?? '')
      setServiceEndDate(entry.serviceEndDate ?? '')
      setLaterality(entry.laterality ?? 'keine')
      setQuantity(entry.quantity ?? 1)
      setDepartment(entry.department ?? document.department)
      setReviewStatus(entry.reviewStatus)
    }
  }

  const changeTarget = (entryId: string) => {
    setTargetEntryId(entryId)
    const entry = activeEntries.find((item) => item.id === entryId)
    if (!entry) return
    setType(entry.type)
    setCode(entry.code)
    setDescription(getCatalogText(entry.type === 'OPS' ? 'OPS' : 'ICD', entry.code, entry.description).shortText)
    setTreatmentEventId(entry.treatmentEventId ?? '')
    setServiceDate(entry.serviceDate ?? '')
    setServiceTime(entry.serviceTime ?? codingCase.timeline.find((event) => event.id === entry.treatmentEventId)?.time ?? '')
    setServiceEndDate(entry.serviceEndDate ?? '')
    setLaterality(entry.laterality ?? 'keine')
    setQuantity(entry.quantity ?? 1)
    setDepartment(entry.department ?? document.department)
    setReviewStatus(entry.reviewStatus)
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
    if (action !== 'deleted' && effectiveType === 'OPS' && (!serviceDate || !serviceTime)) {
      setError('Für OPS werden Leistungsdatum und Uhrzeit für den Grouper benötigt.')
      return
    }
    await onSave({
      action,
      type: action === 'added' ? type : targetEntry!.type,
      code: action === 'deleted' ? targetEntry!.code : code.trim().toUpperCase(),
      description: action === 'deleted' ? targetEntry!.description : description.trim(),
      targetEntryId: action === 'added' ? undefined : targetEntry!.id,
      evidenceDocumentId: document.id,
      treatmentEventId: treatmentEventId || undefined,
      serviceDate: serviceDate || undefined,
      serviceTime: serviceTime || undefined,
      serviceEndDate: serviceEndDate || undefined,
      laterality,
      quantity: effectiveType === 'OPS' ? quantity : undefined,
      department: department || undefined,
      reviewStatus,
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
              {activeEntries.map((entry) => <option value={entry.id} key={entry.id}>{entry.type} · {entry.code} · {getCatalogText(entry.type === 'OPS' ? 'OPS' : 'ICD', entry.code, entry.description).shortText}</option>)}
            </select>
          </label>
        )}

        {action === 'added' && <fieldset className="coding-type-choice">
          <legend>Was möchtest du aus dem Dokument kodieren?</legend>
          {([['HD', 'Hauptdiagnose (ICD)'], ['ND', 'Nebendiagnose (ICD)'], ['OPS', 'Prozedur (OPS)']] as Array<[CodingEntryType, string]>).map(([value, label]) => <label className={type === value ? 'active' : ''} key={value}>
            <input type="radio" name="document-code-type" value={value} checked={type === value} onChange={() => {
              setType(value)
              setCode('')
              setDescription('')
              setError('')
            }} />
            <span>{label}</span>
          </label>)}
        </fieldset>}

        {action !== 'deleted' ? (
          <div className="coding-entry-fields">
            <CodeCatalogSearch kind={catalogKind} value={code} fallbackText={description} onSelect={(nextCode, shortText) => {
              setCode(nextCode)
              setDescription(shortText)
            }} />
            <label>Katalogtext / Arbeitsbeschreibung
              <textarea aria-label="Beschreibung" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Wird bei der Auswahl aus dem Katalog übernommen" />
            </label>
            {effectiveType === 'OPS' && <div className="ops-format-help">
              <strong>OPS wird in getrennten Feldern erfasst</strong>
              <small>Kode, Leistungsdatum und Uhrzeit nicht in ein gemeinsames Textfeld schreiben. Datum und Uhrzeit sind aus dem zugeordneten Ereignis vorausgefüllt und können geprüft werden.</small>
            </div>}
            <div className="coding-parameter-grid">
              <label>Ereignisbezug
                <select aria-label="Ereignisbezug" value={treatmentEventId} onChange={(event) => {
                  const id = event.target.value
                  const linkedEvent = codingCase.timeline.find((item) => item.id === id)
                  setTreatmentEventId(id)
                  if (linkedEvent) {
                    setServiceDate(dateForEvent(codingCase, linkedEvent) ?? '')
                    setServiceTime(linkedEvent.time ?? '')
                    setDepartment(linkedEvent.department)
                  }
                }}>
                  <option value="">Kein Ereignis gewählt</option>
                  {codingCase.timeline.map((event) => <option value={event.id} key={event.id}>{formatDay(codingCase, event.day)} · {event.label}</option>)}
                </select>
              </label>
              <label>Fachabteilung
                <input aria-label="Fachabteilung" value={department} onChange={(event) => setDepartment(event.target.value)} />
              </label>
              <label>{effectiveType === 'OPS' ? 'OPS-Leistungsdatum' : 'Diagnose-Bezugsdatum'}
                <input aria-label="Leistungsdatum" type="date" value={serviceDate} min={codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceDate(event.target.value)} />
              </label>
              {effectiveType === 'OPS' && <label>OPS-Uhrzeit
                <input aria-label="Leistungsuhrzeit" type="time" value={serviceTime} onChange={(event) => setServiceTime(event.target.value)} />
              </label>}
              <label>Enddatum <span>(optional)</span>
                <input aria-label="Enddatum" type="date" value={serviceEndDate} min={serviceDate || codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceEndDate(event.target.value)} />
              </label>
              <label>Seitenlokalisation <span>(kodeabhängig)</span>
                <select aria-label="Seitenlokalisation" value={laterality} onChange={(event) => setLaterality(event.target.value as NonNullable<CodingEntry['laterality']>)}><option value="keine">Keine</option><option value="links">Links</option><option value="rechts">Rechts</option><option value="beidseits">Beidseits</option></select>
              </label>
              {effectiveType === 'OPS' && <label>Anzahl
                <input aria-label="Anzahl" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} />
              </label>}
              <label>Prüfstatus
                <select aria-label="Prüfstatus" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as CodingReviewStatus)}><option value="ungeprüft">Ungeprüft</option><option value="wahrscheinlich">Wahrscheinlich</option><option value="belegt">Belegt</option><option value="widersprüchlich">Widersprüchlich</option></select>
              </label>
            </div>
          </div>
        ) : targetEntry ? (
          <div className="coding-delete-preview"><Trash2 aria-hidden="true" /><span><strong>{targetEntry.type} · {targetEntry.code}</strong><CatalogCodeText compact kind={targetEntry.type === 'OPS' ? 'OPS' : 'ICD'} code={targetEntry.code} fallbackText={targetEntry.description} /><span>Bleibt als gelöscht in der KIS-Übergabe und Historie sichtbar.</span></span></div>
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
