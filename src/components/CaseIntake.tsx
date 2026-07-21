import { ArrowLeft, ArrowRight, Check, ChevronDown, FileImage, FileText, ListPlus } from 'lucide-react'
import { useState } from 'react'
import type { CodingCase, HospitalProfile, IntakeSource, TreatmentEvent } from '../types'
import { CaseJourney } from './CaseJourney'
import { GrouperBaselineEditor } from './GrouperBaselineEditor'
import { TreatmentRibbon } from './TreatmentRibbon'

interface CaseIntakeProps {
  codingCase: CodingCase
  hospitals: HospitalProfile[]
  onBack: () => void
  onAddSource: (source: IntakeSource) => void
  onAddEvent: (event: TreatmentEvent) => void
  onRemoveEvent: (eventId: string) => void
  onUpdateCase: (next: CodingCase) => void
  onConfirm: () => Promise<void> | void
}

export function CaseIntake({ codingCase, hospitals, onBack, onAddSource, onAddEvent, onRemoveEvent, onUpdateCase, onConfirm }: CaseIntakeProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const [department, setDepartment] = useState(codingCase.timeline.find((event) => event.department)?.department ?? 'Fachabteilung')
  const [day, setDay] = useState(String(Math.min(2, codingCase.stayDays)))
  const [eventType, setEventType] = useState<TreatmentEvent['type']>('Diagnostik')
  const [eventLabel, setEventLabel] = useState('')
  const [lastChange, setLastChange] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const hospital = hospitals.find((item) => item.id === codingCase.hospitalId)
  const profile = hospital?.profiles.find((item) => item.siteId === codingCase.siteId && item.year === codingCase.year)
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const activeMainDiagnoses = activeEntries.filter((entry) => entry.type === 'HD')
  const invalidCodes = activeEntries.filter((entry) => !entry.code.trim())
  const invalidProcedures = activeEntries.filter((entry) => entry.type === 'OPS' && (!entry.serviceDate || !entry.serviceTime))
  const basisReady = codingCase.timeline.length >= 2 && activeMainDiagnoses.length === 1 && invalidCodes.length === 0 && invalidProcedures.length === 0

  const handleFile = (files: FileList | null, kind: 'screenshot' | 'arztbrief') => {
    const file = files?.[0]
    if (!file) return
    const now = Date.now()
    const parsedDay = clampDay(day, codingCase.stayDays)
    onAddSource({
      id: `source-${kind}-${now}`,
      kind,
      label: file.name,
      status: 'erkannt',
      detail: kind === 'screenshot' ? 'Verlaufsvorschlag aus Screenshot erkannt.' : 'Verlaufsvorschlag aus Bericht erkannt.',
      addedAt: new Date().toISOString(),
    })
    onAddEvent({
      id: `event-${kind}-${now}`,
      day: parsedDay,
      department,
      type: kind === 'arztbrief' ? 'Therapie' : 'Diagnostik',
      label: `Aus ${file.name} erkannt`,
      linkedDocumentIds: [],
    })
    setLastChange(`${file.name} wurde in den Verlauf eingefügt.`)
  }

  const addManualEvent = () => {
    if (!eventLabel.trim()) return
    const parsedDay = clampDay(day, codingCase.stayDays)
    const now = Date.now()
    onAddEvent({ id: `event-manual-${now}`, day: parsedDay, department, type: eventType, label: eventLabel.trim(), linkedDocumentIds: [] })
    onAddSource({ id: `source-manual-${now}`, kind: 'manuell', label: eventLabel.trim(), status: 'bestätigt', detail: `Tag ${parsedDay} · ${department}`, addedAt: new Date().toISOString() })
    setEventLabel('')
    setLastChange('Ereignis wurde in den Verlauf übernommen.')
  }

  const confirm = async () => {
    if (!basisReady) return
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return (
    <div className="page intake-page v27-intake-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Zurück zum Fallpool</button>
      <CaseJourney active="basis" />
      <div className="intake-heading"><div><div className="page-kicker">Fallbasis · {codingCase.caseNumber}</div><h1>Verlauf und Ausgangskodierung abgleichen</h1></div><span className={`status-pill status-${basisReady ? 'belegt' : 'wahrscheinlich'}`}>{basisReady ? 'Bereit' : 'Prüfen'}</span></div>

      <section className="intake-case-strip" aria-label="Importierte Basisdaten">
        <div><span>Haus</span><strong>{hospital?.name} · {profile?.siteName}</strong></div>
        <div><span>Zeitraum</span><strong>{codingCase.admissionDate && codingCase.dischargeDate ? `${formatDate(codingCase.admissionDate)}–${formatDate(codingCase.dischargeDate)}` : `${codingCase.stayDays} Tage`}</strong></div>
        <div><span>Aus Verlauf erkannt</span><strong>{codingCase.careForm} · {codingCase.complexity}</strong></div>
        <div><span>Fallnummer</span><strong>{codingCase.caseNumber}</strong></div>
      </section>

      <section className="basis-check-card" aria-labelledby="course-check-title">
        <header><span className="basis-check-number">1</span><div><h2 id="course-check-title">Behandlungsverlauf</h2><p>Fachabteilungen und Ereignisse auf einer Zeitachse</p></div><b>{codingCase.timeline.length} Ereignisse</b></header>
        <TreatmentRibbon codingCase={codingCase} compact mode="intake" />
        {lastChange && <div className="change-confirmation" role="status"><Check aria-hidden="true" />{lastChange}</div>}
        <div className="course-edit-bar">
          <button className="button secondary" type="button" onClick={() => setManualOpen((value) => !value)}><ListPlus aria-hidden="true" /> Ereignis ergänzen</button>
          <label className="button secondary upload-button"><FileText aria-hidden="true" /> Arztbrief ergänzen<input className="sr-only" type="file" accept=".pdf,.txt" onChange={(event) => handleFile(event.target.files, 'arztbrief')} /></label>
          <label className="button secondary upload-button"><FileImage aria-hidden="true" /> Screenshot ergänzen<input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files, 'screenshot')} /></label>
        </div>
        {manualOpen && <div className="manual-event-form calm-manual-event"><div className="form-grid"><label>Tag<input type="number" min="1" max={codingCase.stayDays} value={day} onChange={(event) => setDay(event.target.value)} /></label><label>Fachabteilung<input value={department} onChange={(event) => setDepartment(event.target.value)} /></label><label>Ereignisart<select value={eventType} onChange={(event) => setEventType(event.target.value as TreatmentEvent['type'])}><option>Diagnostik</option><option>Eingriff</option><option>Therapie</option><option>Verlegung</option><option>Intensiv</option></select></label></div><label>Was ist passiert?<input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="z. B. operative Versorgung" /></label><button className="button primary" type="button" disabled={!eventLabel.trim() || !day} onClick={addManualEvent}><Check aria-hidden="true" /> Übernehmen</button></div>}
        <details className="quiet-details"><summary><span>Ereignisse bearbeiten</span><span>{codingCase.timeline.length}<ChevronDown aria-hidden="true" /></span></summary><div className="editable-event-list">{codingCase.timeline.map((event) => <div key={event.id}><span>Tag {event.day}</span><strong>{event.label}</strong>{!['Aufnahme', 'Entlassung'].includes(event.type) && <button type="button" onClick={() => { onRemoveEvent(event.id); setLastChange(`${event.label} wurde entfernt.`) }}>Entfernen</button>}</div>)}</div></details>
      </section>

      <section className="basis-check-card coding-baseline-card" aria-labelledby="coding-check-title">
        <header><span className="basis-check-number">2</span><div><h2 id="coding-check-title">Grouper-Ausgangsstand</h2><p>Falldaten, Diagnosen, Prozeduren und Ergebnis</p></div><b>{activeEntries.length} Kodes</b></header>
        <GrouperBaselineEditor codingCase={codingCase} onChange={onUpdateCase} />
      </section>

      <section className="intake-combined-confirm" aria-label="Fallbasis bestätigen">
        <div><strong>{basisReady ? 'Beide Ausgangsstände sind technisch vollständig.' : 'Fallbasis noch nicht vollständig'}</strong><small>{activeMainDiagnoses.length !== 1 ? 'Genau eine Hauptdiagnose ist erforderlich.' : invalidCodes.length ? `${invalidCodes.length} Kodeingaben sind leer.` : invalidProcedures.length ? `${invalidProcedures.length} OPS benötigen Datum und Uhrzeit.` : 'Mit der Bestätigung startet die erste DRG-Iteration.'}</small></div>
        <button className="button primary" type="button" disabled={!basisReady || confirming} onClick={() => void confirm()}>{confirming ? 'Grouper läuft …' : 'Fallbasis bestätigen und DRG-Hypothese starten'} <ArrowRight aria-hidden="true" /></button>
      </section>
    </div>
  )
}

function clampDay(value: string, stayDays: number) {
  const parsed = Number(value)
  return Math.max(1, Math.min(stayDays, Number.isFinite(parsed) ? parsed : 1))
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
