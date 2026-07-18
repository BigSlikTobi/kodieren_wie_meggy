import { useEffect, useMemo, useState } from 'react'
import { Building2, FileCheck2, RotateCcw, Route, Scale, ShieldCheck } from 'lucide-react'
import { CaseCockpit } from './components/CaseCockpit'
import { CaseIntake } from './components/CaseIntake'
import { CasePool } from './components/CasePool'
import { CaseStart } from './components/CaseStart'
import { HospitalsView } from './components/HospitalsView'
import { RulesView } from './components/RulesView'
import { createDemoCase } from './data/demo'
import { MockGrouperClient } from './services/grouper'
import { usePersistentData } from './store'
import type { AppData, BatchCaseRecord, IntakeSource, NewCaseInput, TreatmentEvent, View } from './types'

const grouperClient = new MockGrouperClient()

export default function App() {
  const { data, setData, reset } = usePersistentData()
  const [view, setView] = useState<View>(() => {
    const current = data.cases.find((codingCase) => codingCase.id === data.currentCaseId)
    return current ? (current.intakeConfirmed ? 'case' : 'intake') : 'worklist'
  })
  const [resetOpen, setResetOpen] = useState(false)
  const currentCase = useMemo(
    () => data.cases.find((codingCase) => codingCase.id === data.currentCaseId),
    [data.cases, data.currentCaseId],
  )

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const startCase = (input: NewCaseInput) => {
    const codingCase = createDemoCase(input)
    setData((current) => ({
      ...current,
      cases: [...current.cases, codingCase],
      currentCaseId: codingCase.id,
    }))
    setView('intake')
  }

  const openBatchCase = (record: BatchCaseRecord) => {
    const existing = data.cases.find((codingCase) => codingCase.caseNumber === record.caseNumber)
    if (existing) {
      setData((current) => ({ ...current, currentCaseId: existing.id }))
      setView(existing.intakeConfirmed ? 'case' : 'intake')
      return
    }
    const stayDays = Math.max(1, Math.round((new Date(`${record.dischargeDate}T12:00:00`).getTime() - new Date(`${record.admissionDate}T12:00:00`).getTime()) / 86_400_000) + 1)
    const batchSource: IntakeSource = { id: `source-${record.id}`, kind: 'batch', label: 'Krankenhaus-Batch', status: 'importiert', detail: 'Fallnummer, Aufnahme, Entlassung, Vorkodierung und technische Werte wurden strukturiert übernommen.', addedAt: new Date().toISOString() }
    const codingCase = createDemoCase({ caseNumber: record.caseNumber, hospitalId: record.hospitalId, siteId: record.siteId, year: record.year, admissionDate: record.admissionDate, dischargeDate: record.dischargeDate, age: record.age, stayDays, careForm: record.careForm, scenario: record.scenario, files: [], technicalValues: record.technicalValues, intakeSources: [batchSource] })
    setData((current) => ({
      ...current,
      cases: [...current.cases, codingCase],
      batchCases: current.batchCases.map((item) => item.id === record.id ? { ...item, importStatus: 'geöffnet' } : item),
      currentCaseId: codingCase.id,
    }))
    setView('intake')
  }

  const updateData = (updater: (current: AppData) => AppData) => setData(updater)

  const newCase = () => {
    setData((current) => ({ ...current, currentCaseId: undefined }))
    setView('worklist')
  }

  const mutateCurrentCase = (updater: (codingCase: NonNullable<typeof currentCase>) => NonNullable<typeof currentCase>) => {
    if (!currentCase) return
    setData((current) => ({ ...current, cases: current.cases.map((item) => item.id === currentCase.id ? updater(item) : item) }))
  }

  const goToFallHome = () => setView(currentCase ? (currentCase.intakeConfirmed ? 'case' : 'intake') : 'worklist')

  const confirmReset = () => {
    reset()
    setResetOpen(false)
    setView('start')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={goToFallHome}>
          <span className="brand-mark"><Route aria-hidden="true" /></span>
          <span>Kodierpfad <small>Machbarkeitsprototyp</small></span>
        </button>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <button className={['worklist', 'start', 'intake', 'case'].includes(view) ? 'active' : ''} type="button" onClick={goToFallHome}>
            <FileCheck2 aria-hidden="true" /> Fall
          </button>
          <button className={view === 'hospitals' ? 'active' : ''} type="button" onClick={() => setView('hospitals')}>
            <Building2 aria-hidden="true" /> Häuser
          </button>
          <button className={view === 'rules' ? 'active' : ''} type="button" onClick={() => setView('rules')}>
            <Scale aria-hidden="true" /> Regeln
          </button>
        </nav>
        <div className="header-actions">
          <span className="demo-label"><ShieldCheck aria-hidden="true" /> Nur Demodaten</span>
          <button className="icon-button" type="button" aria-label="Demodaten zurücksetzen" onClick={() => setResetOpen(true)}>
            <RotateCcw aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        {view === 'worklist' && <CasePool cases={data.batchCases} hospitals={data.hospitals} onOpen={openBatchCase} onCreate={() => setView('start')} />}
        {view === 'start' && <CaseStart hospitals={data.hospitals} onStart={startCase} />}
        {view === 'intake' && currentCase && (
          <CaseIntake
            codingCase={currentCase}
            hospitals={data.hospitals}
            onBack={() => { setData((current) => ({ ...current, currentCaseId: undefined })); setView('worklist') }}
            onAddSource={(source) => mutateCurrentCase((codingCase) => ({ ...codingCase, intakeSources: [...codingCase.intakeSources, source] }))}
            onAddEvent={(event: TreatmentEvent) => mutateCurrentCase((codingCase) => ({ ...codingCase, timeline: [...codingCase.timeline, event].sort((a, b) => a.day - b.day) }))}
            onConfirm={() => { mutateCurrentCase((codingCase) => ({ ...codingCase, intakeConfirmed: true, intakeSources: codingCase.intakeSources.map((source) => source.status === 'widersprüchlich' ? source : { ...source, status: 'bestätigt' }) })); setView('case') }}
          />
        )}
        {view === 'case' && currentCase && (
          <CaseCockpit
            codingCase={currentCase}
            hospitals={data.hospitals}
            grouperClient={grouperClient}
            onDataChange={updateData}
            onNewCase={newCase}
          />
        )}
        {view === 'case' && !currentCase && <CasePool cases={data.batchCases} hospitals={data.hospitals} onOpen={openBatchCase} onCreate={() => setView('start')} />}
        {view === 'hospitals' && <HospitalsView data={data} onDataChange={updateData} />}
        {view === 'rules' && <RulesView data={data} onDataChange={updateData} />}
      </main>

      {resetOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setResetOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="reset-title">Demodaten zurücksetzen?</h2>
            <p>Alle lokal angelegten Fälle, Uploads und Regelentwürfe werden entfernt.</p>
            <div className="button-row end">
              <button className="button secondary" type="button" onClick={() => setResetOpen(false)}>Abbrechen</button>
              <button className="button danger" type="button" onClick={confirmReset}>Zurücksetzen</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
