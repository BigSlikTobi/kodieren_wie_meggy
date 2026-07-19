import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Check, FileCode2, FileText, Hospital, Image, ListPlus, Upload } from 'lucide-react'
import type { BatchCaseRecord, CodingEntryType, HospitalProfile, IntakeSource, NewCaseInput, TreatmentEvent } from '../types'
import { CaseJourney } from './CaseJourney'

interface CaseStartProps {
  hospitals: HospitalProfile[]
  batchRecord?: BatchCaseRecord
  onStart: (input: NewCaseInput) => void
  onCancel: () => void
}

type CourseMethod = 'arztbrief' | 'screenshot' | 'datenimport' | 'manuell'
type CodingMethod = 'datenimport' | 'screenshot' | 'manuell'

export function CaseStart({ hospitals, batchRecord, onStart, onCancel }: CaseStartProps) {
  const firstHospital = hospitals.find((item) => item.id === batchRecord?.hospitalId) ?? hospitals[0]
  const batchStayDays = batchRecord ? Math.max(1, Math.round((new Date(`${batchRecord.dischargeDate}T12:00:00`).getTime() - new Date(`${batchRecord.admissionDate}T12:00:00`).getTime()) / 86_400_000) + 1) : undefined
  const [step, setStep] = useState(1)
  const [caseNumber, setCaseNumber] = useState(batchRecord?.caseNumber ?? '')
  const [hospitalId, setHospitalId] = useState(firstHospital?.id ?? '')
  const hospital = hospitals.find((item) => item.id === hospitalId)
  const uniqueSites = useMemo(() => Array.from(new Map((hospital?.profiles ?? []).map((profile) => [profile.siteId, profile])).values()), [hospital])
  const [siteId, setSiteId] = useState(batchRecord?.siteId ?? firstHospital?.profiles[0]?.siteId ?? '')
  const availableYears = useMemo(() => (hospital?.profiles ?? []).filter((profile) => profile.siteId === siteId).map((profile) => profile.year), [hospital, siteId])
  const [year, setYear] = useState(batchRecord?.year ?? firstHospital?.profiles[0]?.year ?? 2026)
  const [age, setAge] = useState(batchRecord?.age ?? 67)
  const [stayDays, setStayDays] = useState(batchStayDays ?? 22)
  const [careForm, setCareForm] = useState<NewCaseInput['careForm']>(batchRecord?.careForm ?? 'Normalstation')
  const [scenario, setScenario] = useState<NewCaseInput['scenario']>(batchRecord?.scenario ?? 'pulmo-onko')
  const [courseMethod, setCourseMethod] = useState<CourseMethod>(batchRecord ? 'datenimport' : 'arztbrief')
  const [codingMethod, setCodingMethod] = useState<CodingMethod>('datenimport')
  const [courseFiles, setCourseFiles] = useState<string[]>(batchRecord?.importStatus === 'bereit' ? ['Behandlungsverlauf aus Batch-Vorlauf'] : [])
  const [codingFiles, setCodingFiles] = useState<string[]>(batchRecord ? [`KIS-Vorkodierung · ${batchRecord.codingSummary}`] : [])
  const [manualEvents, setManualEvents] = useState<TreatmentEvent[]>([])
  const [eventDay, setEventDay] = useState(2)
  const [eventDepartment, setEventDepartment] = useState('Pneumologie')
  const [eventType, setEventType] = useState<TreatmentEvent['type']>('Diagnostik')
  const [eventLabel, setEventLabel] = useState('')
  const [manualCoding, setManualCoding] = useState('HD C34.9 Bronchialkarzinom\nND J18.9 Pneumonie\nOPS 1-620.0 Bronchoskopie')
  const [touched, setTouched] = useState(false)

  const profile = hospital?.profiles.find((item) => item.siteId === siteId && item.year === year)
  const parsedCoding = useMemo(() => parseManualCoding(manualCoding), [manualCoding])
  const courseReady = courseMethod === 'manuell' ? manualEvents.length > 0 : courseFiles.length > 0
  const codingReady = codingMethod === 'manuell' ? parsedCoding.length > 0 : codingFiles.length > 0
  const validBase = Boolean(caseNumber.trim() && hospitalId && siteId && year && age >= 0 && stayDays > 0 && profile)

  const changeHospital = (id: string) => {
    const nextHospital = hospitals.find((item) => item.id === id)
    const nextProfile = nextHospital?.profiles[0]
    setHospitalId(id)
    setSiteId(nextProfile?.siteId ?? '')
    setYear(nextProfile?.year ?? 2026)
  }

  const changeSite = (id: string) => {
    const nextProfile = hospital?.profiles.find((item) => item.siteId === id)
    setSiteId(id)
    setYear(nextProfile?.year ?? 2026)
  }

  const handleFiles = (fileList: FileList | null, target: 'course' | 'coding') => {
    if (!fileList) return
    const names = Array.from(fileList).map((file) => file.name)
    if (target === 'course') setCourseFiles(names)
    else setCodingFiles(names)
  }

  const addManualEvent = () => {
    if (!eventLabel.trim()) return
    setManualEvents((current) => [...current, {
      id: `event-start-manual-${Date.now()}`,
      day: Math.max(1, Math.min(stayDays, eventDay)),
      department: eventDepartment,
      type: eventType,
      label: eventLabel.trim(),
      linkedDocumentIds: [],
    }].sort((a, b) => a.day - b.day))
    setEventLabel('')
  }

  const next = () => {
    setTouched(true)
    if (step === 1 && validBase) { setStep(2); setTouched(false) }
    else if (step === 2 && courseReady && codingReady) { setStep(3); setTouched(false) }
  }

  const submit = () => {
    if (!validBase || !courseReady || !codingReady) return
    const now = new Date().toISOString()
    const intakeSources: IntakeSource[] = [
      ...(batchRecord ? [{ id: `source-${batchRecord.id}`, kind: 'batch' as const, label: 'Krankenhaus-Batch', status: 'importiert' as const, detail: 'Fallnummer, Falldaten, Vorkodierung und technische Werte wurden strukturiert übernommen.', addedAt: now }] : []),
      ...sourceEntries(courseMethod, courseMethod === 'manuell' ? [`${manualEvents.length} manuelle Ereignisse`] : courseFiles, 'Behandlungsverlauf', now),
      ...sourceEntries(codingMethod === 'datenimport' ? 'kodierung' : codingMethod, codingMethod === 'manuell' ? [`${parsedCoding.length} manuelle Kodes`] : codingFiles, 'KIS-Ausgangskodierung', now),
    ]
    onStart({
      caseNumber: caseNumber.trim(), hospitalId, siteId, year, age, stayDays, careForm, scenario,
      files: [...courseFiles, ...codingFiles], intakeSources,
      admissionDate: batchRecord?.admissionDate,
      dischargeDate: batchRecord?.dischargeDate,
      technicalValues: batchRecord?.technicalValues,
      demoVariant: batchRecord?.demoVariant,
      manualTimeline: courseMethod === 'manuell' ? manualEvents : undefined,
      manualCodingEntries: codingMethod === 'manuell' ? parsedCoding : undefined,
    })
  }

  return (
    <div className="page narrow-page calm-start-page">
      <CaseJourney active="kis" />
      <div className="page-kicker">{batchRecord ? 'Pool-Fall vorausgefüllt' : 'Einzelfall anlegen'} · Schritt {step} von 3</div>
      <h1>Fall aus dem KIS übernehmen.</h1>
      <p className="lead">{batchRecord ? 'Die bekannten KIS-Daten sind vorausgefüllt. Prüfe sie und ergänze nur, was für Behandlungsverlauf und Ausgangskodierung noch fehlt.' : 'Zuerst den Fall eindeutig zuordnen. Danach werden Behandlungsverlauf und aktuelle KIS-Kodierung getrennt übernommen.'}</p>

      <ol className="stepper" aria-label="Fallstart Fortschritt">
        {['Fall zuordnen', 'Fallbasis übernehmen', 'Prüfen'].map((label, index) => (
          <li key={label} className={step >= index + 1 ? 'active' : ''} aria-current={step === index + 1 ? 'step' : undefined}>
            <span>{step > index + 1 ? <Check aria-hidden="true" /> : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="panel form-panel" aria-labelledby="context-title">
          <div className="section-heading"><Hospital aria-hidden="true" /><div><h2 id="context-title">Welcher KIS-Fall ist geöffnet?</h2><p>Nur Angaben zur eindeutigen Zuordnung. Hausregeln werden später automatisch berücksichtigt.</p></div></div>
          <div className="form-grid">
            <label>Fallnummer<input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} /></label>
            <label>Krankenhaus<select value={hospitalId} onChange={(event) => changeHospital(event.target.value)}>{hospitals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Standort<select value={siteId} onChange={(event) => changeSite(event.target.value)}>{uniqueSites.map((item) => <option key={item.siteId} value={item.siteId}>{item.siteName}</option>)}</select></label>
            <label>Behandlungsjahr<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{availableYears.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Alter bei Aufnahme<input type="number" min="0" max="130" value={age} onChange={(event) => setAge(Number(event.target.value))} /></label>
            <label>Verweildauer<input type="number" min="1" max="365" value={stayDays} onChange={(event) => setStayDays(Number(event.target.value))} /></label>
            <label>Versorgungsform<select value={careForm} onChange={(event) => setCareForm(event.target.value as NewCaseInput['careForm'])}><option>Normalstation</option><option>Normal- und Intensivstation</option></select></label>
            <label>Demoverlauf<select value={scenario} onChange={(event) => setScenario(event.target.value as NewCaseInput['scenario'])}><option value="pulmo-onko">Komplexer Verlauf</option><option value="standard">Standardnaher Verlauf</option></select></label>
          </div>
          {touched && !validBase && <p className="error-text">Bitte Fallnummer und alle Zuordnungsdaten vollständig angeben.</p>}
        </section>
      )}

      {step === 2 && (
        <section className="source-pair" aria-label="Fallbasis übernehmen">
          <SourceCard number="1" title="Behandlungsverlauf erstellen" description="Mindestens ein Arzt- oder Entlassungsbericht – alternativ Screenshot, Datenimport oder manuelle Ereignisse." ready={courseReady}>
            <div className="source-methods" role="group" aria-label="Quelle für Behandlungsverlauf">
              <MethodButton active={courseMethod === 'arztbrief'} icon={<FileText aria-hidden="true" />} label="Arztbrief" onClick={() => setCourseMethod('arztbrief')} />
              <MethodButton active={courseMethod === 'screenshot'} icon={<Image aria-hidden="true" />} label="Screenshot" onClick={() => setCourseMethod('screenshot')} />
              <MethodButton active={courseMethod === 'datenimport'} icon={<Upload aria-hidden="true" />} label="Datenimport" onClick={() => setCourseMethod('datenimport')} />
              <MethodButton active={courseMethod === 'manuell'} icon={<ListPlus aria-hidden="true" />} label="Manuell" onClick={() => setCourseMethod('manuell')} />
            </div>
            {courseMethod === 'manuell' ? (
              <div className="manual-course-builder">
                <div className="form-grid compact"><label>Tag<input type="number" min="1" max={stayDays} value={eventDay} onChange={(event) => setEventDay(Number(event.target.value))} /></label><label>Fachabteilung<input value={eventDepartment} onChange={(event) => setEventDepartment(event.target.value)} /></label><label>Ereignisart<select value={eventType} onChange={(event) => setEventType(event.target.value as TreatmentEvent['type'])}><option>Diagnostik</option><option>Eingriff</option><option>Therapie</option><option>Verlegung</option><option>Intensiv</option></select></label></div>
                <label>Was ist passiert?<input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="z. B. Bronchoskopie mit Biopsie" /></label>
                <button className="button secondary" type="button" onClick={addManualEvent} disabled={!eventLabel.trim()}><ListPlus aria-hidden="true" /> Ereignis hinzufügen</button>
                {manualEvents.length > 0 && <ol className="manual-preview-list">{manualEvents.map((event) => <li key={event.id}><span>Tag {event.day}</span><strong>{event.label}</strong><button type="button" onClick={() => setManualEvents((current) => current.filter((item) => item.id !== event.id))}>Entfernen</button></li>)}</ol>}
              </div>
            ) : <UploadField label={courseMethod === 'arztbrief' ? 'Arzt- oder Entlassungsbericht auswählen' : courseMethod === 'screenshot' ? 'Screenshot auswählen' : 'Verlaufsdaten auswählen'} files={courseFiles} onFiles={(files) => handleFiles(files, 'course')} />}
          </SourceCard>

          <SourceCard number="2" title="Aktuelle KIS-Kodierung übernehmen" description="Der Grouper startet immer mit der tatsächlich im KIS vorhandenen HD, den ND und OPS." ready={codingReady}>
            <div className="source-methods" role="group" aria-label="Quelle für KIS-Ausgangskodierung">
              <MethodButton active={codingMethod === 'datenimport'} icon={<Upload aria-hidden="true" />} label="Datenexport" onClick={() => setCodingMethod('datenimport')} />
              <MethodButton active={codingMethod === 'screenshot'} icon={<Image aria-hidden="true" />} label="Screenshot" onClick={() => setCodingMethod('screenshot')} />
              <MethodButton active={codingMethod === 'manuell'} icon={<FileCode2 aria-hidden="true" />} label="Manuell" onClick={() => setCodingMethod('manuell')} />
            </div>
            {codingMethod === 'manuell' ? <label className="manual-code-entry">Kodes aus dem KIS<textarea value={manualCoding} onChange={(event) => setManualCoding(event.target.value)} rows={6} /><small>Eine Zeile pro Kode: HD, ND oder OPS · Kode · optionale Bezeichnung</small><span>{parsedCoding.length} Kodes erkannt</span></label> : <UploadField label={codingMethod === 'screenshot' ? 'Screenshot der Kodierung auswählen' : 'KIS-Kodierexport auswählen'} files={codingFiles} onFiles={(files) => handleFiles(files, 'coding')} />}
          </SourceCard>
          {touched && (!courseReady || !codingReady) && <p className="error-text">Für den nächsten Schritt werden sowohl ein Behandlungsverlauf als auch die aktuelle KIS-Kodierung benötigt.</p>}
        </section>
      )}

      {step === 3 && (
        <section className="panel review-panel" aria-labelledby="review-title">
          <div className="section-heading"><Check aria-hidden="true" /><div><h2 id="review-title">Beide Ausgangsstände sind vorhanden</h2><p>Im nächsten Screen werden Verlauf und KIS-Kodierung noch nicht gemeinsam bestätigt, sondern nacheinander geprüft.</p></div></div>
          <dl className="review-list">
            <div><dt>KIS-Fall</dt><dd>{caseNumber} · {hospital?.name}</dd></div>
            <div><dt>Behandlungsverlauf</dt><dd>{courseMethod === 'manuell' ? `${manualEvents.length} manuelle Ereignisse` : `${courseFiles.length} Quelle(n) · ${methodLabel(courseMethod)}`}</dd></div>
            <div><dt>Ausgangskodierung</dt><dd>{codingMethod === 'manuell' ? `${parsedCoding.length} Kodes manuell` : `${codingFiles.length} Quelle(n) · ${methodLabel(codingMethod)}`}</dd></div>
          </dl>
        </section>
      )}

      <div className="button-row between">
        <button className="button secondary" type="button" onClick={() => { setTouched(false); if (step === 1) onCancel(); else setStep((current) => current - 1) }}>{step === 1 ? 'Zum Fallpool' : 'Zurück'}</button>
        {step < 3 ? <button className="button primary" type="button" onClick={next}>Weiter <ArrowRight aria-hidden="true" /></button> : <button className="button primary" type="button" onClick={submit}>Fallbasis prüfen <ArrowRight aria-hidden="true" /></button>}
      </div>
    </div>
  )
}

function SourceCard({ number, title, description, ready, children }: { number: string; title: string; description: string; ready: boolean; children: ReactNode }) {
  return <article className="source-setup-card"><header><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div><b className={ready ? 'is-ready' : ''}>{ready ? 'Vorhanden' : 'Noch offen'}</b></header>{children}</article>
}

function MethodButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'source-method active' : 'source-method'} type="button" aria-pressed={active} onClick={onClick}>{icon}<span>{label}</span></button>
}

function UploadField({ label, files, onFiles }: { label: string; files: string[]; onFiles: (files: FileList | null) => void }) {
  return <div className="compact-upload"><label><Upload aria-hidden="true" /><span><strong>{label}</strong><small>PDF, Bild, TXT, CSV oder XLSX</small></span><input className="sr-only" type="file" multiple accept=".pdf,.txt,.png,.jpg,.jpeg,.xls,.xlsx,.csv" onChange={(event) => onFiles(event.target.files)} /></label>{files.length > 0 && <div className="source-file-list">{files.map((file) => <span key={file}><Check aria-hidden="true" />{file}</span>)}</div>}</div>
}

function parseManualCoding(value: string): Array<{ type: CodingEntryType; code: string; description: string }> {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const match = line.match(/^(HD|ND|OPS)\s*[:;,-]?\s*([^\s;]+)\s*(.*)$/i)
    if (!match) return []
    return [{ type: match[1].toUpperCase() as CodingEntryType, code: match[2], description: match[3].replace(/^[-;:]\s*/, '') || 'Manuell aus dem KIS übernommen' }]
  })
}

function sourceEntries(kind: CourseMethod | CodingMethod | 'kodierung', values: string[], prefix: string, addedAt: string): IntakeSource[] {
  return values.map((value, index) => ({ id: `source-${prefix}-${index}-${Date.now()}`, kind, label: value, status: kind === 'manuell' ? 'bestätigt' : 'erkannt', detail: `${prefix} wurde über ${methodLabel(kind)} übernommen.`, addedAt }))
}

function methodLabel(method: CourseMethod | CodingMethod | 'kodierung') {
  return { arztbrief: 'Arztbrief', screenshot: 'Screenshot', datenimport: 'Datenimport', kodierung: 'KIS-Datenexport', manuell: 'manuelle Eingabe' }[method]
}
