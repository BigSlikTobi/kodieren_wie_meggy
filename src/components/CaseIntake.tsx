import { ArrowLeft, ArrowRight, Check, ChevronDown, FileCode2, FileImage, FileText, GitMerge, ListPlus, Upload } from 'lucide-react'
import { useState } from 'react'
import type { CodingCase, HospitalProfile, IntakeSource, TreatmentEvent } from '../types'
import { CaseJourney } from './CaseJourney'
import { TreatmentRibbon } from './TreatmentRibbon'

interface CaseIntakeProps {
  codingCase: CodingCase
  hospitals: HospitalProfile[]
  onBack: () => void
  onAddSource: (source: IntakeSource) => void
  onAddEvent: (event: TreatmentEvent) => void
  onRemoveEvent: (eventId: string) => void
  onConfirm: () => void
}

export function CaseIntake({ codingCase, hospitals, onBack, onAddSource, onAddEvent, onRemoveEvent, onConfirm }: CaseIntakeProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const [courseConfirmed, setCourseConfirmed] = useState(false)
  const [codingConfirmed, setCodingConfirmed] = useState(false)
  const [department, setDepartment] = useState('Pneumologie')
  const [day, setDay] = useState(Math.min(2, codingCase.stayDays))
  const [eventType, setEventType] = useState<TreatmentEvent['type']>('Diagnostik')
  const [eventLabel, setEventLabel] = useState('')
  const [lastChange, setLastChange] = useState<string>()
  const hospital = hospitals.find((item) => item.id === codingCase.hospitalId)
  const profile = hospital?.profiles.find((item) => item.siteId === codingCase.siteId && item.year === codingCase.year)
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const icdCount = activeEntries.filter((entry) => entry.type === 'HD' || entry.type === 'ND').length
  const opsCount = activeEntries.filter((entry) => entry.type === 'OPS').length
  const currentRun = codingCase.grouperRuns.at(-1)

  const handleFile = (files: FileList | null, kind: 'screenshot' | 'arztbrief') => {
    const file = files?.[0]
    if (!file) return
    const now = Date.now()
    onAddSource({
      id: `source-${kind}-${now}`,
      kind,
      label: file.name,
      status: 'erkannt',
      detail: kind === 'screenshot' ? 'Ein zusätzlicher Verlaufsvorschlag wurde aus dem Screenshot erkannt.' : 'Ein zusätzlicher Verlaufsvorschlag wurde aus den Überschriften erkannt.',
      addedAt: new Date().toISOString(),
    })
    onAddEvent({
      id: `event-${kind}-${now}`,
      day,
      department,
      type: kind === 'arztbrief' ? 'Therapie' : 'Diagnostik',
      label: `Aus ${file.name} erkannter Verlaufsvorschlag`,
      linkedDocumentIds: [],
    })
    setCourseConfirmed(false)
    setLastChange(`„${file.name}“ wurde als neues Ereignis sichtbar in den Verlauf eingefügt.`)
  }

  const addManualEvent = () => {
    if (!eventLabel.trim()) return
    onAddEvent({ id: `event-manual-${Date.now()}`, day, department, type: eventType, label: eventLabel.trim(), linkedDocumentIds: [] })
    onAddSource({ id: `source-manual-${Date.now()}`, kind: 'manuell', label: eventLabel.trim(), status: 'bestätigt', detail: `Tag ${day} · ${department} · ${eventType}`, addedAt: new Date().toISOString() })
    setEventLabel('')
    setCourseConfirmed(false)
    setLastChange('Das manuelle Ereignis wurde direkt in den Behandlungsverlauf übernommen.')
  }

  const removeEvent = (eventId: string, label: string) => {
    onRemoveEvent(eventId)
    setCourseConfirmed(false)
    setLastChange(`„${label}“ wurde aus dem Behandlungsverlauf entfernt.`)
  }

  return (
    <div className="page intake-page calm-intake-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Zurück zum Fallpool</button>
      <CaseJourney active="basis" />
      <div className="intake-heading"><div><div className="page-kicker">Fallbasis · {codingCase.caseNumber}</div><h1>Zwei Ausgangsstände prüfen.</h1><p className="lead">Zuerst den Behandlungsverlauf. Danach die aktuelle Kodierung aus dem KIS. Erst wenn beides stimmt, startet die DRG-Hypothese.</p></div><span className="status-pill status-wahrscheinlich">{courseConfirmed && codingConfirmed ? 'Bereit' : '2 Prüfungen'}</span></div>

      <section className="intake-case-strip" aria-label="Importierte Basisdaten">
        <div><span>Haus</span><strong>{hospital?.name} · {profile?.siteName}</strong></div>
        <div><span>Zeitraum</span><strong>{codingCase.admissionDate && codingCase.dischargeDate ? `${formatDate(codingCase.admissionDate)}–${formatDate(codingCase.dischargeDate)}` : `${codingCase.stayDays} Tage`}</strong></div>
        <div><span>Versorgung</span><strong>{codingCase.careForm}</strong></div>
        <div><span>Fallnummer</span><strong>{codingCase.caseNumber}</strong></div>
      </section>

      <section className={`basis-check-card ${courseConfirmed ? 'is-confirmed' : ''}`} aria-labelledby="course-check-title">
        <header><span className="basis-check-number">1</span><div><h2 id="course-check-title">Behandlungsverlauf</h2><p>Passen Zeitfolge, Fachabteilungen und zentrale Behandlungen?</p></div><b>{courseConfirmed ? <><Check aria-hidden="true" /> Bestätigt</> : 'Jetzt prüfen'}</b></header>
        <TreatmentRibbon codingCase={codingCase} compact mode="intake" />
        {lastChange && <div className="change-confirmation" role="status"><Check aria-hidden="true" />{lastChange}</div>}
        <div className="course-edit-bar">
          <button className="button secondary" type="button" onClick={() => setManualOpen((value) => !value)}><ListPlus aria-hidden="true" /> Ereignis ergänzen</button>
          <label className="button secondary upload-button"><FileText aria-hidden="true" /> Arztbrief ergänzen<input className="sr-only" type="file" accept=".pdf,.txt" onChange={(event) => handleFile(event.target.files, 'arztbrief')} /></label>
          <label className="button secondary upload-button"><FileImage aria-hidden="true" /> Screenshot ergänzen<input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files, 'screenshot')} /></label>
        </div>
        {manualOpen && <div className="manual-event-form calm-manual-event"><div className="form-grid"><label>Tag<input type="number" min="1" max={codingCase.stayDays} value={day} onChange={(event) => setDay(Number(event.target.value))} /></label><label>Fachabteilung<input value={department} onChange={(event) => setDepartment(event.target.value)} /></label><label>Ereignisart<select value={eventType} onChange={(event) => setEventType(event.target.value as TreatmentEvent['type'])}><option>Diagnostik</option><option>Eingriff</option><option>Therapie</option><option>Verlegung</option><option>Intensiv</option></select></label></div><label>Was ist passiert?<input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="z. B. Operation einer Schenkelhalsfraktur" /></label><button className="button primary" type="button" disabled={!eventLabel.trim()} onClick={addManualEvent}><Check aria-hidden="true" /> Im Verlauf übernehmen</button></div>}
        <details className="quiet-details"><summary><span>Erkannte Ereignisse bearbeiten</span><span>{codingCase.timeline.length}<ChevronDown aria-hidden="true" /></span></summary><div className="editable-event-list">{codingCase.timeline.map((event) => <div key={event.id}><span>Tag {event.day}</span><strong>{event.label}</strong>{!['Aufnahme', 'Entlassung'].includes(event.type) && <button type="button" onClick={() => removeEvent(event.id, event.label)}>Entfernen</button>}</div>)}</div></details>
        <div className="basis-check-action"><span>Änderungen setzen diese Bestätigung zurück.</span><button className={courseConfirmed ? 'button secondary' : 'button primary'} type="button" onClick={() => setCourseConfirmed(true)}><Check aria-hidden="true" /> Verlauf bestätigen</button></div>
      </section>

      <section className={`basis-check-card coding-baseline-card ${codingConfirmed ? 'is-confirmed' : ''}`} aria-labelledby="coding-check-title">
        <header><span className="basis-check-number">2</span><div><h2 id="coding-check-title">Aktuelle KIS-Kodierung</h2><p>Ist dies wirklich der Ausgangsstand, gegen den die App prüfen soll?</p></div><b>{codingConfirmed ? <><Check aria-hidden="true" /> Bestätigt</> : courseConfirmed ? 'Danach prüfen' : 'Wartet'}</b></header>
        <div className="coding-baseline-summary"><span><FileCode2 aria-hidden="true" /></span><div><small>Übernommener Ausgangsstand</small><strong>{icdCount} ICD · {opsCount} OPS</strong><em>{currentRun?.drg ?? 'DRG noch offen'}</em></div></div>
        <details className="quiet-details"><summary><span>Übernommene Kodes anzeigen</span><span>{activeEntries.length}<ChevronDown aria-hidden="true" /></span></summary><div className="intake-coding-list">{activeEntries.map((entry) => <span key={entry.id}><b>{entry.type}</b><code>{entry.code}</code><small>{entry.description}</small></span>)}</div></details>
        <details className="quiet-details"><summary><span>Quellen der Fallbasis</span><span>{codingCase.intakeSources.length}<ChevronDown aria-hidden="true" /></span></summary><div className="source-provenance-list">{codingCase.intakeSources.map((source) => <div key={source.id}><span className={`source-kind source-${source.kind}`}>{source.kind === 'screenshot' ? <FileImage aria-hidden="true" /> : source.kind === 'arztbrief' ? <FileText aria-hidden="true" /> : source.kind === 'manuell' ? <ListPlus aria-hidden="true" /> : <GitMerge aria-hidden="true" />}</span><span><strong>{source.label}</strong><small>{source.detail}</small></span></div>)}</div></details>
        <div className="basis-check-action"><span>Die Kodes werden später einzeln validiert.</span><button className={codingConfirmed ? 'button secondary' : 'button primary'} type="button" disabled={!courseConfirmed} onClick={() => setCodingConfirmed(true)}><Check aria-hidden="true" /> Ausgangskodierung bestätigen</button></div>
      </section>

      <section className="intake-confirm"><div><Check aria-hidden="true" /><span><strong>{courseConfirmed && codingConfirmed ? 'Fallbasis vollständig' : 'Erst beide Ausgangsstände bestätigen'}</strong><small>Danach startet die erste sichtbare DRG-Iteration mit genau einem empfohlenen Prüfschritt.</small></span></div><button className="button primary" type="button" disabled={!courseConfirmed || !codingConfirmed} onClick={onConfirm}>Erste DRG-Iteration starten <ArrowRight aria-hidden="true" /></button></section>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
