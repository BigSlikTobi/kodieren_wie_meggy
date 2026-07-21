import { useMemo, useState } from 'react'
import { CheckCircle2, FileCode2, Plus, RotateCw, Save, ShieldAlert, Trash2, X } from 'lucide-react'
import { getCatalogText } from '../data/codeCatalog'
import type { CaseDecision, CodingCase, CodingChange, CodingEntry, CodingEntryType } from '../types'
import { CatalogCodeText, CodeCatalogSearch } from './CodeCatalogSearch'
import { dateForEvent, formatDay } from './TreatmentRibbon'

export interface DirectCodingInput {
  action: Extract<CodingChange, 'added' | 'changed' | 'deleted'>
  type: CodingEntryType
  code: string
  description: string
  targetEntryId?: string
  treatmentEventId?: string
  serviceDate?: string
  serviceTime?: string
  serviceEndDate?: string
  laterality?: CodingEntry['laterality']
  quantity?: number
  department?: string
  decisionId: string
}

interface DirectCodingDrawerProps {
  codingCase: CodingCase
  decision: CaseDecision
  initialEntryId?: string
  running: boolean
  onClose: () => void
  onSave: (input: DirectCodingInput) => Promise<void>
}

const actionLabels = { added: 'Ergänzen', changed: 'Ändern', deleted: 'Löschen' }

export function DirectCodingDrawer({ codingCase, decision, initialEntryId, running, onClose, onSave }: DirectCodingDrawerProps) {
  const activeEntries = useMemo(() => codingCase.codingEntries.filter((entry) => entry.active), [codingCase.codingEntries])
  const explicitTarget = activeEntries.find((entry) => entry.id === initialEntryId)
  const decisionDocument = codingCase.documentMap.find((document) => document.linkedDecisionId === decision.id && document.availability === 'vorhanden')
  const decisionEvent = codingCase.timeline.find((event) => decisionDocument && event.linkedDocumentIds?.includes(decisionDocument.id))
    ?? codingCase.timeline.find((event) => decisionDocument && event.department === decisionDocument.department && event.day >= decisionDocument.startDay)
  const recommendedType: CodingEntryType = explicitTarget?.type ?? (decision.id === 'decision-main' ? 'HD' : decisionEvent?.type === 'Eingriff' || decision.id.includes('therapy') || decision.id.includes('palliative') ? 'OPS' : 'ND')
  const recommendedTarget = explicitTarget ?? activeEntries.find((entry) => entry.type === recommendedType) ?? activeEntries[0]
  const initialAction: DirectCodingInput['action'] = explicitTarget || (recommendedType === 'HD' && recommendedTarget?.type === 'HD') ? 'changed' : 'added'
  const [action, setAction] = useState<DirectCodingInput['action']>(initialAction)
  const [type, setType] = useState<CodingEntryType>(recommendedType)
  const [targetEntryId, setTargetEntryId] = useState(recommendedTarget?.id ?? '')
  const initialEntry = initialAction === 'changed' ? recommendedTarget : undefined
  const [code, setCode] = useState(initialEntry?.code ?? '')
  const [description, setDescription] = useState(initialEntry?.description ?? '')
  const [treatmentEventId, setTreatmentEventId] = useState(initialEntry?.treatmentEventId ?? decisionEvent?.id ?? '')
  const [serviceDate, setServiceDate] = useState(initialEntry?.serviceDate ?? (decisionEvent ? dateForEvent(codingCase, decisionEvent) : codingCase.admissionDate) ?? '')
  const [serviceTime, setServiceTime] = useState(initialEntry?.serviceTime ?? codingCase.timeline.find((event) => event.id === initialEntry?.treatmentEventId)?.time ?? decisionEvent?.time ?? '')
  const [serviceEndDate, setServiceEndDate] = useState(initialEntry?.serviceEndDate ?? '')
  const [department, setDepartment] = useState(initialEntry?.department ?? decisionEvent?.department ?? 'Gesamtfall')
  const [laterality, setLaterality] = useState<NonNullable<CodingEntry['laterality']>>(initialEntry?.laterality ?? 'keine')
  const [quantity, setQuantity] = useState(initialEntry?.quantity ?? 1)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const targetEntry = activeEntries.find((entry) => entry.id === targetEntryId)
  const effectiveType = action === 'added' ? type : targetEntry?.type ?? type
  const catalogKind = effectiveType === 'OPS' ? 'OPS' : 'ICD'

  const loadEntry = (entry?: CodingEntry) => {
    if (!entry) return
    setTargetEntryId(entry.id)
    setType(entry.type)
    setCode(entry.code)
    setDescription(getCatalogText(entry.type === 'OPS' ? 'OPS' : 'ICD', entry.code, entry.description).shortText)
    setTreatmentEventId(entry.treatmentEventId ?? '')
    setServiceDate(entry.serviceDate ?? codingCase.admissionDate ?? '')
    setServiceTime(entry.serviceTime ?? codingCase.timeline.find((event) => event.id === entry.treatmentEventId)?.time ?? '')
    setServiceEndDate(entry.serviceEndDate ?? '')
    setDepartment(entry.department ?? 'Gesamtfall')
    setLaterality(entry.laterality ?? 'keine')
    setQuantity(entry.quantity ?? 1)
  }

  const changeAction = (nextAction: DirectCodingInput['action']) => {
    setAction(nextAction)
    setError('')
    setSavedMessage('')
    if (nextAction !== 'added') loadEntry(targetEntry ?? recommendedTarget)
    if (nextAction === 'added') {
      setType(recommendedType)
      setCode('')
      setDescription('')
    }
  }

  const submit = async () => {
    setError('')
    setSavedMessage('')
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
    const effectiveType = action === 'added' ? type : targetEntry?.type
    if (action !== 'deleted' && effectiveType === 'OPS' && (!serviceDate || !serviceTime)) {
      setError('Für OPS werden Leistungsdatum und Uhrzeit benötigt.')
      return
    }
    const savedCode = action === 'deleted' ? targetEntry!.code : code.trim().toUpperCase()
    const savedType = action === 'added' ? type : targetEntry!.type
    await onSave({
      action,
      type: savedType,
      code: savedCode,
      description: action === 'deleted' ? targetEntry!.description : description.trim(),
      targetEntryId: action === 'added' ? undefined : targetEntry!.id,
      treatmentEventId: treatmentEventId || undefined,
      serviceDate: serviceDate || undefined,
      serviceTime: serviceTime || undefined,
      serviceEndDate: serviceEndDate || undefined,
      laterality,
      quantity: (action === 'added' ? type : targetEntry?.type) === 'OPS' ? quantity : undefined,
      department: department || undefined,
      decisionId: decision.id,
    })
    setSavedMessage(`${savedType} ${savedCode} wurde gespeichert und neu gruppiert. Du kannst direkt einen weiteren Kode bearbeiten.`)
    if (action === 'added') {
      setCode('')
      setDescription('')
      setTreatmentEventId('')
      setServiceTime('')
      setServiceEndDate('')
    }
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
            {activeEntries.map((entry) => <option value={entry.id} key={entry.id}>{entry.type} · {entry.code} · {getCatalogText(entry.type === 'OPS' ? 'OPS' : 'ICD', entry.code, entry.description).shortText}</option>)}
          </select>
        </label>}

        {action === 'added' && <fieldset className="coding-type-choice">
          <legend>Welche Kodierung möchtest du ergänzen?</legend>
          {([['HD', 'Hauptdiagnose (ICD)'], ['ND', 'Nebendiagnose (ICD)'], ['OPS', 'Prozedur (OPS)']] as Array<[CodingEntryType, string]>).map(([value, label]) => <label className={type === value ? 'active' : ''} key={value}>
            <input type="radio" name="direct-code-type" value={value} checked={type === value} onChange={() => {
              setType(value)
              setCode('')
              setDescription('')
              setError('')
            }} />
            <span>{label}</span>
          </label>)}
        </fieldset>}

        {action !== 'deleted' ? <div className="coding-entry-fields">
          <CodeCatalogSearch kind={catalogKind} value={code} fallbackText={description} onSelect={(nextCode, shortText) => {
            setCode(nextCode)
            setDescription(shortText)
          }} />
          <label>Katalogtext / Arbeitsbeschreibung
            <textarea aria-label="Beschreibung der freien Kodierung" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Wird bei der Auswahl aus dem Katalog übernommen" />
          </label>
          {effectiveType === 'OPS' && <div className="ops-format-help">
            <strong>OPS wird in getrennten Feldern erfasst</strong>
            <small>Kode, Datum und Uhrzeit gehören jeweils in das eigene Feld. Die Werte aus dem Behandlungsereignis sind bereits vorausgefüllt und müssen nur noch geprüft werden.</small>
          </div>}
          <div className="coding-parameter-grid">
              <label>Ereignisbezug
                <select aria-label="Ereignisbezug der freien Kodierung" value={treatmentEventId} onChange={(event) => {
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
              <label>Fachabteilung<input aria-label="Fachabteilung der freien Kodierung" value={department} onChange={(event) => setDepartment(event.target.value)} /></label>
              <label>{effectiveType === 'OPS' ? 'OPS-Leistungsdatum' : 'Diagnose-Bezugsdatum'}<input aria-label="Leistungsdatum der freien Kodierung" type="date" value={serviceDate} min={codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
              {effectiveType === 'OPS' && <label>OPS-Uhrzeit<input aria-label="Leistungsuhrzeit der freien Kodierung" type="time" value={serviceTime} onChange={(event) => setServiceTime(event.target.value)} /></label>}
              <label>Enddatum <span>(optional)</span><input aria-label="Enddatum der freien Kodierung" type="date" value={serviceEndDate} min={serviceDate || codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(event) => setServiceEndDate(event.target.value)} /></label>
              <label>Seitenlokalisation <span>(kodeabhängig)</span><select aria-label="Seitenlokalisation der freien Kodierung" value={laterality} onChange={(event) => setLaterality(event.target.value as NonNullable<CodingEntry['laterality']>)}><option value="keine">Keine</option><option value="links">Links</option><option value="rechts">Rechts</option><option value="beidseits">Beidseits</option></select></label>
              {effectiveType === 'OPS' && <label>Anzahl<input aria-label="Anzahl der freien Kodierung" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>}
          </div>
        </div> : targetEntry ? <div className="coding-delete-preview"><Trash2 aria-hidden="true" /><span><strong>{targetEntry.type} · {targetEntry.code}</strong><CatalogCodeText compact kind={targetEntry.type === 'OPS' ? 'OPS' : 'ICD'} code={targetEntry.code} fallbackText={targetEntry.description} /><span>Bleibt als gelöscht in der KIS-Übergabe und Historie sichtbar.</span></span></div> : null}

        <div className="coding-iteration-preview">
          <RotateCw aria-hidden="true" />
          <span><strong>Speichern erzeugt Iteration {codingCase.grouperRuns.length + 1}.</strong><small>Alle offenen und erledigten Hypothesenbestandteile erhalten den neuen Bewertungsstand.</small></span>
        </div>
        {savedMessage && <div className="direct-coding-success" role="status"><CheckCircle2 aria-hidden="true" /><span><strong>Änderung übernommen</strong><small>{savedMessage}</small></span></div>}
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="button-row end">
          <button className="button secondary" type="button" disabled={running} onClick={onClose}>{savedMessage ? 'Fertig' : 'Abbrechen'}</button>
          <button className="button primary" type="button" disabled={running} onClick={() => void submit()}>{running ? <RotateCw className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{running ? 'Grouper läuft …' : `${actionLabels[action]} und alles neu bewerten`}</button>
        </div>
      </aside>
    </div>
  )
}
