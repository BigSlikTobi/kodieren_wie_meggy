import { Activity, CalendarDays, FileCode2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CodingCase, CodingEntry, CodingEntryType, TechnicalCaseValue } from '../types'

interface GrouperBaselineEditorProps {
  codingCase: CodingCase
  onChange: (next: CodingCase) => void
}

type EditorTab = 'case' | 'diagnoses' | 'procedures'

export function GrouperBaselineEditor({ codingCase, onChange }: GrouperBaselineEditorProps) {
  const [tab, setTab] = useState<EditorTab>('case')
  const [ageInput, setAgeInput] = useState(String(codingCase.age))
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const diagnoses = activeEntries.filter((entry) => entry.type !== 'OPS')
  const procedures = activeEntries.filter((entry) => entry.type === 'OPS')
  const currentRun = codingCase.grouperRuns.at(-1)
  const ventilation = codingCase.technicalValues.find((value) => value.kind === 'beatmung')

  const publishEntries = (entries: CodingEntry[]) => {
    const main = entries.find((entry) => entry.active && entry.type === 'HD')
    const ops = entries.filter((entry) => entry.active && entry.type === 'OPS')
    onChange({
      ...codingCase,
      codingEntries: entries,
      currentMainDiagnosis: main ? `${main.code} · ${main.description}` : 'Keine aktive Hauptdiagnose',
      currentProcedures: ops.length ? ops.map((entry) => `${entry.code} · ${entry.description}`) : ['Keine aktive OPS-Kodierung'],
    })
  }

  const updateEntry = (id: string, patch: Partial<CodingEntry>) => {
    publishEntries(codingCase.codingEntries.map((entry) => entry.id === id ? { ...entry, ...patch, change: 'unchanged' } : entry))
  }

  const removeEntry = (id: string) => publishEntries(codingCase.codingEntries.filter((entry) => entry.id !== id))

  const addEntry = (type: CodingEntryType) => {
    const event = type === 'OPS'
      ? codingCase.timeline.find((item) => item.type === 'Eingriff')
      : codingCase.timeline.find((item) => item.type === 'Aufnahme')
    publishEntries([...codingCase.codingEntries, {
      id: `baseline-${type.toLowerCase()}-${Date.now()}`,
      type,
      code: '',
      description: '',
      change: 'unchanged',
      origin: 'manuell',
      reviewStatus: 'ungeprüft',
      active: true,
      source: 'Korrigierte Arbeitsbasis',
      treatmentEventId: event?.id,
      serviceDate: type === 'OPS' && event ? dateForDay(codingCase.admissionDate, event.day) : undefined,
      serviceTime: type === 'OPS' ? event?.time : undefined,
      department: event?.department,
      assessedIteration: currentRun?.iteration ?? 1,
    }])
  }

  const setVentilation = (raw: string) => {
    const hours = raw === '' ? undefined : Math.max(0, Number(raw))
    const nextValue: TechnicalCaseValue = ventilation ? {
      ...ventilation,
      aggregateValue: hours,
      status: ventilation.status === 'importiert' ? 'korrigiert' : ventilation.status,
    } : {
      id: `technical-ventilation-${Date.now()}`,
      kind: 'beatmung',
      label: 'Beatmungszeit',
      aggregateValue: hours,
      unit: 'Stunden',
      intervals: [],
      source: 'Manuelle Fallbasis',
      status: 'korrigiert',
      groupingRelevant: true,
      documentRequired: true,
      note: 'Aus Intensivdokumentation beziehungsweise KIS-Falldaten zu bestätigen.',
    }
    onChange({
      ...codingCase,
      technicalValues: ventilation
        ? codingCase.technicalValues.map((value) => value.id === ventilation.id ? nextValue : value)
        : [...codingCase.technicalValues, nextValue],
    })
  }

  return (
    <div className="baseline-grouper-editor">
      <div className="baseline-grouper-result" aria-label="Aktuelles Groupingergebnis">
        <span><small>Arbeits-DRG</small><strong>{currentRun?.drg ?? 'offen'}</strong></span>
        <span><small>MDC</small><strong>{currentRun?.mdc ?? inferMdc(currentRun?.drg)}</strong></span>
        <span><small>Partition</small><strong>{partitionLabel(currentRun?.partition)}</strong></span>
        <span><small>PCCL</small><strong>{currentRun?.pccL ?? '–'}</strong></span>
        <span><small>VWD</small><strong>{codingCase.stayDays} Tage</strong></span>
      </div>

      <div className="baseline-editor-tabs" role="tablist" aria-label="Grouperbereiche">
        <button type="button" role="tab" aria-selected={tab === 'case'} className={tab === 'case' ? 'active' : ''} onClick={() => setTab('case')}>Falldaten</button>
        <button type="button" role="tab" aria-selected={tab === 'diagnoses'} className={tab === 'diagnoses' ? 'active' : ''} onClick={() => setTab('diagnoses')}>Diagnosen <b>{diagnoses.length}</b></button>
        <button type="button" role="tab" aria-selected={tab === 'procedures'} className={tab === 'procedures' ? 'active' : ''} onClick={() => setTab('procedures')}>Prozeduren <b>{procedures.length}</b></button>
      </div>

      {tab === 'case' && <div className="baseline-case-grid" role="tabpanel">
        <label><span>Aufnahmegrund</span><input value={codingCase.grouperAdministrativeData.admissionReasonCode} onChange={(event) => onChange({ ...codingCase, grouperAdministrativeData: { ...codingCase.grouperAdministrativeData, admissionReasonCode: event.target.value } })} /><small>{codingCase.grouperAdministrativeData.admissionReasonLabel}</small></label>
        <label><span>Entlassungsgrund</span><input value={codingCase.grouperAdministrativeData.dischargeReasonCode} onChange={(event) => onChange({ ...codingCase, grouperAdministrativeData: { ...codingCase.grouperAdministrativeData, dischargeReasonCode: event.target.value } })} /><small>{codingCase.grouperAdministrativeData.dischargeReasonLabel}</small></label>
        <label><span>Alter</span><input type="number" min="0" value={ageInput} onChange={(event) => setAgeInput(event.target.value)} onBlur={() => { if (ageInput !== '') onChange({ ...codingCase, age: Number(ageInput) }) }} /><small>Jahre bei Aufnahme</small></label>
        <label><span>Aufnahmegewicht</span><input type="number" min="0" value={codingCase.grouperAdministrativeData.admissionWeightGrams ?? ''} onChange={(event) => onChange({ ...codingCase, grouperAdministrativeData: { ...codingCase.grouperAdministrativeData, admissionWeightGrams: event.target.value === '' ? undefined : Number(event.target.value) } })} /><small>Gramm, falls erforderlich</small></label>
        <label><span>Beatmungszeit</span><input type="number" min="0" value={ventilation?.aggregateValue ?? ''} onChange={(event) => setVentilation(event.target.value)} /><small>Stunden · aus Intensivmedizin</small></label>
        <div className="baseline-derived-field"><CalendarDays aria-hidden="true" /><span><small>Aufenthalt</small><strong>{codingCase.stayDays} Tage</strong><em>{formatDate(codingCase.admissionDate)}–{formatDate(codingCase.dischargeDate)}</em></span></div>
        <div className="baseline-derived-field"><Activity aria-hidden="true" /><span><small>Aus Verlauf erkannt</small><strong>{codingCase.careForm}</strong><em>{codingCase.complexity}</em></span></div>
      </div>}

      {tab === 'diagnoses' && <CodeTable entries={diagnoses} kind="diagnosis" codingCase={codingCase} onUpdate={updateEntry} onRemove={removeEntry} onAdd={() => addEntry(diagnoses.some((entry) => entry.type === 'HD') ? 'ND' : 'HD')} />}
      {tab === 'procedures' && <CodeTable entries={procedures} kind="procedure" codingCase={codingCase} onUpdate={updateEntry} onRemove={removeEntry} onAdd={() => addEntry('OPS')} />}

      <details className="baseline-snapshot">
        <summary>KIS-Import vergleichen · {codingCase.kisBaselineEntries?.length ?? activeEntries.length} Kodes</summary>
        <div>{(codingCase.kisBaselineEntries ?? activeEntries).filter((entry) => entry.active).map((entry) => <span key={entry.id}><b>{entry.type}</b><code>{entry.code}</code><small>{entry.description}</small></span>)}</div>
      </details>
    </div>
  )
}

function CodeTable({ entries, kind, codingCase, onUpdate, onRemove, onAdd }: {
  entries: CodingEntry[]
  kind: 'diagnosis' | 'procedure'
  codingCase: CodingCase
  onUpdate: (id: string, patch: Partial<CodingEntry>) => void
  onRemove: (id: string) => void
  onAdd: () => void
}) {
  return <div className="baseline-code-panel" role="tabpanel">
    <div className="baseline-code-head"><span><FileCode2 aria-hidden="true" /><strong>{kind === 'diagnosis' ? 'ICD-Haupt- und Nebendiagnosen' : 'OPS mit Leistungszeitpunkt'}</strong></span><button className="button secondary" type="button" onClick={onAdd}><Plus aria-hidden="true" /> {kind === 'diagnosis' ? 'Diagnose' : 'OPS'} ergänzen</button></div>
    <div className="baseline-code-table">
      {entries.map((entry) => {
        const event = codingCase.timeline.find((item) => item.id === entry.treatmentEventId)
        const isOps = entry.type === 'OPS'
        const missingRequired = isOps && (!entry.serviceDate || !entry.serviceTime)
        return <div className={`baseline-code-row ${missingRequired || !entry.code.trim() ? 'has-error' : ''}`} key={entry.id}>
          <select aria-label="Kodetyp" value={entry.type} onChange={(eventChange) => onUpdate(entry.id, { type: eventChange.target.value as CodingEntryType })}>
            <option value="HD">HD</option><option value="ND">ND</option>{isOps && <option value="OPS">OPS</option>}
          </select>
          <label><span>Kode</span><input value={entry.code} onChange={(eventChange) => onUpdate(entry.id, { code: eventChange.target.value.toUpperCase() })} /></label>
          <label className="wide"><span>Beschreibung</span><input value={entry.description} onChange={(eventChange) => onUpdate(entry.id, { description: eventChange.target.value })} /></label>
          {isOps && <label><span>Datum</span><input type="date" value={entry.serviceDate ?? ''} min={codingCase.admissionDate} max={codingCase.dischargeDate} onChange={(eventChange) => onUpdate(entry.id, { serviceDate: eventChange.target.value })} /></label>}
          {isOps && <label><span>Uhrzeit</span><input type="time" value={entry.serviceTime ?? event?.time ?? ''} onChange={(eventChange) => onUpdate(entry.id, { serviceTime: eventChange.target.value })} /></label>}
          <label><span>Lokalisation</span><select value={entry.laterality ?? 'keine'} onChange={(eventChange) => onUpdate(entry.id, { laterality: eventChange.target.value as NonNullable<CodingEntry['laterality']> })}><option value="keine">keine</option><option value="links">links</option><option value="rechts">rechts</option><option value="beidseits">beidseits</option></select></label>
          <button className="icon-button" type="button" aria-label={`${entry.code || 'Kode'} entfernen`} onClick={() => onRemove(entry.id)}><Trash2 aria-hidden="true" /></button>
          {(missingRequired || !entry.code.trim()) && <small className="baseline-row-error">{!entry.code.trim() ? 'Kode fehlt' : 'OPS benötigt Datum und Uhrzeit'}</small>}
        </div>
      })}
    </div>
  </div>
}

function dateForDay(admissionDate: string | undefined, day: number) {
  if (!admissionDate) return undefined
  const date = new Date(`${admissionDate}T12:00:00`)
  date.setDate(date.getDate() + day - 1)
  return date.toISOString().slice(0, 10)
}

function formatDate(value?: string) {
  if (!value) return 'offen'
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function inferMdc(drg?: string) {
  const major = drg?.trim().charAt(0).toUpperCase()
  return ({ A: 'Prä-MDC', B: '01', E: '04', F: '05', G: '06', I: '08', L: '11', T: '18B' } as Record<string, string>)[major ?? ''] ?? 'offen'
}

function partitionLabel(partition?: 'O' | 'A' | 'M') {
  return partition === 'O' ? 'O · operativ' : partition === 'A' ? 'A · andere' : partition === 'M' ? 'M · medizinisch' : 'offen'
}
