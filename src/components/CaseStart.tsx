import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowRight, Check, FileCode2, FileText, Hospital, Image, ListPlus, Trash2, Upload } from 'lucide-react'
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
type NumericInput = number | ''

interface ManualCodingRow {
  id: string
  type: CodingEntryType
  code: string
  description: string
}

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
  const [age, setAge] = useState<NumericInput>(batchRecord?.age ?? 67)
  const [stayDays, setStayDays] = useState<NumericInput>(batchStayDays ?? 22)
  const [courseMethod, setCourseMethod] = useState<CourseMethod>(batchRecord ? 'datenimport' : 'arztbrief')
  const [codingMethod, setCodingMethod] = useState<CodingMethod>('datenimport')
  const [courseFiles, setCourseFiles] = useState<string[]>(batchRecord?.importStatus === 'bereit' ? ['Behandlungsverlauf aus Batch-Vorlauf'] : [])
  const [codingFiles, setCodingFiles] = useState<string[]>(batchRecord ? [`KIS-Vorkodierung · ${batchRecord.codingSummary}`] : [])
  const [courseReplaceOpen, setCourseReplaceOpen] = useState(false)
  const [codingReplaceOpen, setCodingReplaceOpen] = useState(false)
  const [manualEvents, setManualEvents] = useState<TreatmentEvent[]>([])
  const [eventDay, setEventDay] = useState(2)
  const [eventDepartment, setEventDepartment] = useState('Pneumologie')
  const [eventType, setEventType] = useState<TreatmentEvent['type']>('Diagnostik')
  const [eventLabel, setEventLabel] = useState('')
  const [manualCodingRows, setManualCodingRows] = useState<ManualCodingRow[]>([
    { id: 'manual-code-hd-1', type: 'HD', code: '', description: '' },
  ])
  const [manualImport, setManualImport] = useState('')
  const [manualImportErrors, setManualImportErrors] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  const profile = hospital?.profiles.find((item) => item.siteId === siteId && item.year === year)
  const parsedCoding = useMemo(() => validateManualCoding(manualCodingRows), [manualCodingRows])
  const numericAge = age === '' ? undefined : age
  const numericStayDays = stayDays === '' ? undefined : stayDays
  const usesBatchCourse = Boolean(batchRecord && !courseReplaceOpen)
  const hasIntensiveSignal = manualEvents.some((event) => event.type === 'Intensiv' || /intensiv/i.test(event.department)) || courseFiles.some((file) => /intensiv/i.test(file))
  const inferredCareForm: NewCaseInput['careForm'] = usesBatchCourse ? batchRecord!.careForm : hasIntensiveSignal ? 'Normal- und Intensivstation' : 'Normalstation'
  const inferredScenario: NewCaseInput['scenario'] = usesBatchCourse ? batchRecord!.scenario : inferScenario(courseMethod, manualEvents, courseFiles)
  const courseReady = courseMethod === 'manuell' ? manualEvents.length > 0 : courseFiles.length > 0
  const codingReady = codingMethod === 'manuell' ? parsedCoding.ready : codingFiles.length > 0
  const validBase = Boolean(caseNumber.trim() && hospitalId && siteId && year && numericAge !== undefined && numericAge >= 0 && numericAge <= 130 && numericStayDays !== undefined && numericStayDays > 0 && numericStayDays <= 365 && profile)

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
    const lastStayDay = numericStayDays ?? 365
    setManualEvents((current) => [...current, {
      id: `event-start-manual-${Date.now()}`,
      day: Math.max(1, Math.min(lastStayDay, eventDay)),
      department: eventDepartment,
      type: eventType,
      label: eventLabel.trim(),
      linkedDocumentIds: [],
    }].sort((a, b) => a.day - b.day))
    setEventLabel('')
  }

  const updateManualCodingRow = (id: string, change: Partial<ManualCodingRow>) => {
    setManualCodingRows((current) => current.map((row) => row.id === id ? { ...row, ...change } : row))
  }

  const addManualCodingRow = (type: CodingEntryType) => {
    setManualCodingRows((current) => [...current, { id: `manual-code-${Date.now()}-${current.length}`, type, code: '', description: '' }])
  }

  const importManualCoding = () => {
    const imported = parseManualCodingImport(manualImport)
    setManualImportErrors(imported.errors)
    if (imported.errors.length || !imported.rows.length) return
    setManualCodingRows((current) => {
      const populatedRows = current.filter((row) => row.code.trim() || row.description.trim())
      return [...populatedRows, ...imported.rows]
    })
    setManualImport('')
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
      ...sourceEntries(codingMethod === 'datenimport' ? 'kodierung' : codingMethod, codingMethod === 'manuell' ? [`${parsedCoding.entries.length} manuelle Kodes`] : codingFiles, 'KIS-Ausgangskodierung', now),
    ]
    onStart({
      caseNumber: caseNumber.trim(), hospitalId, siteId, year, age: numericAge!, stayDays: numericStayDays!, careForm: inferredCareForm, scenario: inferredScenario,
      files: [...courseFiles, ...codingFiles], intakeSources,
      admissionDate: batchRecord?.admissionDate,
      dischargeDate: batchRecord?.dischargeDate,
      technicalValues: batchRecord?.technicalValues,
      demoVariant: batchRecord?.demoVariant,
      manualTimeline: courseMethod === 'manuell' ? manualEvents : undefined,
      manualCodingEntries: codingMethod === 'manuell' ? parsedCoding.entries : undefined,
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
            <label>Alter bei Aufnahme<input type="number" min="0" max="130" value={age} onChange={(event) => setAge(numericInputValue(event.target.value))} /></label>
            <label>Verweildauer<input type="number" min="1" max="365" value={stayDays} onChange={(event) => setStayDays(numericInputValue(event.target.value))} /></label>
          </div>
          {touched && !validBase && <p className="error-text">Bitte Fallnummer und alle Zuordnungsdaten vollständig angeben.</p>}
        </section>
      )}

      {step === 2 && (
        <section className="source-pair" aria-label="Fallbasis übernehmen">
          <SourceCard number="1" title="Behandlungsverlauf erstellen" description="Mindestens ein Arzt- oder Entlassungsbericht – alternativ Screenshot, Datenimport oder manuelle Ereignisse." ready={courseReady}>
            {batchRecord && courseReady && !courseReplaceOpen ? <ExistingSourceSummary title="Behandlungsverlauf bereits übernommen" detail={`${courseFiles.length} strukturierte Quelle · ${batchRecord.department}`} onReplace={() => { setCourseFiles([]); setCourseMethod('arztbrief'); setCourseReplaceOpen(true) }} /> : <><div className="source-methods" role="group" aria-label="Quelle für Behandlungsverlauf">
              <MethodButton active={courseMethod === 'arztbrief'} icon={<FileText aria-hidden="true" />} label="Arztbrief" onClick={() => setCourseMethod('arztbrief')} />
              <MethodButton active={courseMethod === 'screenshot'} icon={<Image aria-hidden="true" />} label="Screenshot" onClick={() => setCourseMethod('screenshot')} />
              <MethodButton active={courseMethod === 'datenimport'} icon={<Upload aria-hidden="true" />} label="Datenimport" onClick={() => setCourseMethod('datenimport')} />
              <MethodButton active={courseMethod === 'manuell'} icon={<ListPlus aria-hidden="true" />} label="Manuell" onClick={() => setCourseMethod('manuell')} />
            </div>
            {courseMethod === 'manuell' ? (
              <div className="manual-course-builder">
                <div className="form-grid compact"><label>Tag<input type="number" min="1" max={numericStayDays ?? 365} value={eventDay} onChange={(event) => setEventDay(Number(event.target.value))} /></label><label>Fachabteilung<input value={eventDepartment} onChange={(event) => setEventDepartment(event.target.value)} /></label><label>Ereignisart<select value={eventType} onChange={(event) => setEventType(event.target.value as TreatmentEvent['type'])}><option>Diagnostik</option><option>Eingriff</option><option>Therapie</option><option>Verlegung</option><option>Intensiv</option></select></label></div>
                <label>Was ist passiert?<input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="z. B. Bronchoskopie mit Biopsie" /></label>
                <button className="button secondary" type="button" onClick={addManualEvent} disabled={!eventLabel.trim()}><ListPlus aria-hidden="true" /> Ereignis hinzufügen</button>
                {manualEvents.length > 0 && <ol className="manual-preview-list">{manualEvents.map((event) => <li key={event.id}><span>Tag {event.day}</span><strong>{event.label}</strong><button type="button" onClick={() => setManualEvents((current) => current.filter((item) => item.id !== event.id))}>Entfernen</button></li>)}</ol>}
              </div>
            ) : <UploadField label={courseMethod === 'arztbrief' ? 'Arzt- oder Entlassungsbericht auswählen' : courseMethod === 'screenshot' ? 'Screenshot auswählen' : 'Verlaufsdaten auswählen'} files={courseFiles} onFiles={(files) => handleFiles(files, 'course')} />}</>}
          </SourceCard>

          <SourceCard number="2" title="Aktuelle KIS-Kodierung übernehmen" description="Der Grouper startet immer mit der tatsächlich im KIS vorhandenen HD, den ND und OPS." ready={codingReady}>
            {batchRecord && codingReady && !codingReplaceOpen ? <ExistingSourceSummary title="KIS-Ausgangskodierung bereits übernommen" detail={batchRecord.codingSummary} onReplace={() => { setCodingFiles([]); setCodingMethod('datenimport'); setCodingReplaceOpen(true) }} /> : <><div className="source-methods" role="group" aria-label="Quelle für KIS-Ausgangskodierung">
              <MethodButton active={codingMethod === 'datenimport'} icon={<Upload aria-hidden="true" />} label="Datenexport" onClick={() => setCodingMethod('datenimport')} />
              <MethodButton active={codingMethod === 'screenshot'} icon={<Image aria-hidden="true" />} label="Screenshot" onClick={() => setCodingMethod('screenshot')} />
              <MethodButton active={codingMethod === 'manuell'} icon={<FileCode2 aria-hidden="true" />} label="Manuell" onClick={() => setCodingMethod('manuell')} />
            </div>
            {codingMethod === 'manuell' ? <ManualGrouperCoding rows={manualCodingRows} validation={parsedCoding} importValue={manualImport} importErrors={manualImportErrors} onImportValue={(value) => { setManualImport(value); setManualImportErrors([]) }} onImport={importManualCoding} onAdd={addManualCodingRow} onUpdate={updateManualCodingRow} onRemove={(id) => setManualCodingRows((current) => current.filter((row) => row.id !== id))} /> : <UploadField label={codingMethod === 'screenshot' ? 'Screenshot der Kodierung auswählen' : 'KIS-Kodierexport auswählen'} files={codingFiles} onFiles={(files) => handleFiles(files, 'coding')} />}</>}
          </SourceCard>
          {touched && (!courseReady || !codingReady) && <p className="error-text">Für den nächsten Schritt werden sowohl ein Behandlungsverlauf als auch die aktuelle KIS-Kodierung benötigt.</p>}
        </section>
      )}

      {step === 3 && (
        <section className="panel review-panel" aria-labelledby="review-title">
          <div className="section-heading"><Check aria-hidden="true" /><div><h2 id="review-title">Beide Ausgangsstände sind vorhanden</h2><p>Im nächsten Screen können Verlauf und Grouper-Ausgangsstand korrigiert und gemeinsam bestätigt werden.</p></div></div>
          <dl className="review-list">
            <div><dt>KIS-Fall</dt><dd>{caseNumber} · {hospital?.name}</dd></div>
            <div><dt>Behandlungsverlauf</dt><dd>{courseMethod === 'manuell' ? `${manualEvents.length} manuelle Ereignisse` : `${courseFiles.length} Quelle(n) · ${methodLabel(courseMethod)}`}</dd></div>
            <div><dt>Ausgangskodierung</dt><dd>{codingMethod === 'manuell' ? `${parsedCoding.entries.length} Kodes manuell` : `${codingFiles.length} Quelle(n) · ${methodLabel(codingMethod)}`}</dd></div>
            <div><dt>Automatisch erkannt</dt><dd>{inferredCareForm} · {inferredScenario === 'pulmo-onko' ? 'erhöhte Prüftiefe' : 'standardnah'}</dd></div>
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

function ExistingSourceSummary({ title, detail, onReplace }: { title: string; detail: string; onReplace: () => void }) {
  return <div className="existing-source-summary"><span><Check aria-hidden="true" /></span><span><strong>{title}</strong><small>{detail}</small><em>Die vorhandene Quelle wird verwendet. Wähle „Ersetzen“ nur, wenn der KIS-Ausgangsstand nicht stimmt.</em></span><button className="button secondary" type="button" onClick={onReplace}>Quelle ersetzen</button></div>
}

function UploadField({ label, files, onFiles }: { label: string; files: string[]; onFiles: (files: FileList | null) => void }) {
  return <div className="compact-upload"><label><Upload aria-hidden="true" /><span><strong>{label}</strong><small>PDF, Bild, TXT, CSV oder XLSX</small></span><input className="sr-only" type="file" multiple accept=".pdf,.txt,.png,.jpg,.jpeg,.xls,.xlsx,.csv" onChange={(event) => onFiles(event.target.files)} /></label>{files.length > 0 && <div className="source-file-list">{files.map((file) => <span key={file}><Check aria-hidden="true" />{file}</span>)}</div>}</div>
}

interface ManualCodingValidation {
  ready: boolean
  entries: Array<{ type: CodingEntryType; code: string; description: string }>
  errors: string[]
  rowErrors: Record<string, string>
}

function ManualGrouperCoding({ rows, validation, importValue, importErrors, onImportValue, onImport, onAdd, onUpdate, onRemove }: {
  rows: ManualCodingRow[]
  validation: ManualCodingValidation
  importValue: string
  importErrors: string[]
  onImportValue: (value: string) => void
  onImport: () => void
  onAdd: (type: CodingEntryType) => void
  onUpdate: (id: string, change: Partial<ManualCodingRow>) => void
  onRemove: (id: string) => void
}) {
  const diagnoses = rows.filter((row) => row.type !== 'OPS')
  const procedures = rows.filter((row) => row.type === 'OPS')

  return (
    <div className="manual-course-builder" aria-label="Manuelle Grouper-Kodierung">
      <div><strong>Diagnosen</strong><small>Genau eine HD, weitere Diagnosen als ND.</small></div>
      {diagnoses.map((row, index) => <ManualCodingEditorRow key={row.id} row={row} index={index} error={validation.rowErrors[row.id]} onUpdate={onUpdate} onRemove={onRemove} />)}
      {!rows.some((row) => row.type === 'HD') && <button className="button secondary" type="button" onClick={() => onAdd('HD')}><ListPlus aria-hidden="true" /> Hauptdiagnose ergänzen</button>}
      <button className="button secondary" type="button" onClick={() => onAdd('ND')}><ListPlus aria-hidden="true" /> Diagnose ergänzen</button>

      <div><strong>Prozeduren</strong><small>OPS werden getrennt von den Diagnosen geführt.</small></div>
      {procedures.length ? procedures.map((row, index) => <ManualCodingEditorRow key={row.id} row={row} index={index} error={validation.rowErrors[row.id]} onUpdate={onUpdate} onRemove={onRemove} />) : <small>Noch keine OPS übernommen.</small>}
      <button className="button secondary" type="button" onClick={() => onAdd('OPS')}><ListPlus aria-hidden="true" /> OPS ergänzen</button>

      <details className="quiet-details">
        <summary>Kodes aus Zwischenablage übernehmen</summary>
        <label className="manual-code-entry">HD, ND oder OPS je Zeile
          <textarea aria-label="Kodes aus Zwischenablage" value={importValue} onChange={(event) => onImportValue(event.target.value)} rows={4} placeholder="HD S72.00 Schenkelhalsfraktur&#10;OPS 5-790.5 Osteosynthese" />
          <small>Auch „Hauptdiagnose“, „Nebendiagnose“ und „Prozedur“ werden erkannt.</small>
        </label>
        {importErrors.length > 0 && <div className="error-text" role="alert">{importErrors.map((error) => <div key={error}>{error}</div>)}</div>}
        <button className="button secondary" type="button" disabled={!importValue.trim()} onClick={onImport}><Upload aria-hidden="true" /> In Grouperzeilen übernehmen</button>
      </details>

      {validation.ready ? <div className="change-confirmation" role="status"><Check aria-hidden="true" />Technisch vollständig · {validation.entries.length} Kodes</div> : <div className="error-text" role="status">{validation.errors[0] ?? 'Kodierung vervollständigen.'}</div>}
    </div>
  )
}

function ManualCodingEditorRow({ row, index, error, onUpdate, onRemove }: {
  row: ManualCodingRow
  index: number
  error?: string
  onUpdate: (id: string, change: Partial<ManualCodingRow>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="manual-course-builder">
      <div className="form-grid compact">
        <label>Typ<select aria-label={`Kodetyp ${row.id}`} value={row.type} onChange={(event) => onUpdate(row.id, { type: event.target.value as CodingEntryType })}><option value="HD">HD</option><option value="ND">ND</option><option value="OPS">OPS</option></select></label>
        <label>Kode<input aria-label={`${row.type}-Kode ${index + 1}`} value={row.code} onChange={(event) => onUpdate(row.id, { code: event.target.value.toUpperCase() })} placeholder={row.type === 'OPS' ? 'z. B. 5-790.5' : 'z. B. S72.00'} autoComplete="off" /></label>
        <label>Bezeichnung <span>(optional)</span><input aria-label={`Bezeichnung ${row.id}`} value={row.description} onChange={(event) => onUpdate(row.id, { description: event.target.value })} /></label>
      </div>
      {error && <small className="error-text" role="alert">{error}</small>}
      <button className="button secondary" type="button" aria-label={`${row.type}-Zeile entfernen`} onClick={() => onRemove(row.id)}><Trash2 aria-hidden="true" /> Entfernen</button>
    </div>
  )
}

function validateManualCoding(rows: ManualCodingRow[]): ManualCodingValidation {
  const rowErrors: Record<string, string> = {}
  const populatedRows = rows.filter((row) => row.code.trim() || row.description.trim())

  for (const row of populatedRows) {
    const code = row.code.trim().toUpperCase()
    if (!code) rowErrors[row.id] = 'Kode fehlt.'
    else if (row.type === 'OPS' ? !isOpsCode(code) : !isIcdCode(code)) rowErrors[row.id] = row.type === 'OPS' ? 'Kein gültiges OPS-Format.' : 'Kein gültiges ICD-10-GM-Format.'
  }

  const validRows = populatedRows.filter((row) => !rowErrors[row.id])
  const mainDiagnoses = validRows.filter((row) => row.type === 'HD')
  const errors: string[] = []
  if (mainDiagnoses.length === 0) errors.push('Eine Hauptdiagnose fehlt.')
  if (mainDiagnoses.length > 1) errors.push('Es darf nur eine Hauptdiagnose geben.')
  if (Object.keys(rowErrors).length) errors.push('Mindestens eine Grouperzeile ist unvollständig.')

  const entries = validRows.map((row) => ({
    type: row.type,
    code: row.code.trim().toUpperCase(),
    description: row.description.trim() || 'Manuell aus dem KIS übernommen',
  }))
  return { ready: entries.length > 0 && errors.length === 0, entries, errors, rowErrors }
}

function parseManualCodingImport(value: string): { rows: ManualCodingRow[]; errors: string[] } {
  const rows: ManualCodingRow[] = []
  const errors: string[] = []
  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    const match = line.match(/^(HD|ND|OPS|Hauptdiagnose|Nebendiagnose|Prozedur)\s*(?:(?:[:;,\t]|-\s+)\s*)?([^\s;,\t]+)\s*(.*)$/i)
    if (!match) {
      errors.push(`Zeile ${index + 1}: Typ und Kode konnten nicht erkannt werden.`)
      return
    }
    const normalizedType = match[1].toLowerCase()
    const type: CodingEntryType = ['hd', 'hauptdiagnose'].includes(normalizedType) ? 'HD' : ['nd', 'nebendiagnose'].includes(normalizedType) ? 'ND' : 'OPS'
    rows.push({
      id: `manual-import-${Date.now()}-${index}`,
      type,
      code: match[2].toUpperCase(),
      description: match[3].replace(/^[-;:]\s*/, ''),
    })
  })
  return { rows, errors }
}

function isIcdCode(value: string) {
  return /^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,5})?[+*!]?$/.test(value)
}

function isOpsCode(value: string) {
  return /^[0-9]-[0-9A-Z]{3}(?:\.[0-9A-Z]{1,6})?$/.test(value)
}

function numericInputValue(value: string): NumericInput {
  return value === '' ? '' : Number(value)
}

function inferScenario(method: CourseMethod, events: TreatmentEvent[], files: string[]): NewCaseInput['scenario'] {
  if (method === 'manuell') {
    const departments = new Set(events.map((event) => event.department.trim().toLowerCase()).filter(Boolean))
    return events.some((event) => event.type === 'Intensiv') || departments.size > 1 || events.length >= 4 ? 'pulmo-onko' : 'standard'
  }
  const sourceText = files.join(' ').toLowerCase()
  return /(intensiv|onkolog|tumor|komplex)/.test(sourceText) ? 'pulmo-onko' : 'standard'
}

function sourceEntries(kind: CourseMethod | CodingMethod | 'kodierung', values: string[], prefix: string, addedAt: string): IntakeSource[] {
  return values.map((value, index) => ({ id: `source-${prefix}-${index}-${Date.now()}`, kind, label: value, status: kind === 'manuell' ? 'bestätigt' : 'erkannt', detail: `${prefix} wurde über ${methodLabel(kind)} übernommen.`, addedAt }))
}

function methodLabel(method: CourseMethod | CodingMethod | 'kodierung') {
  return { arztbrief: 'Arztbrief', screenshot: 'Screenshot', datenimport: 'Datenimport', kodierung: 'KIS-Datenexport', manuell: 'manuelle Eingabe' }[method]
}
