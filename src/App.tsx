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
import type { AppData, BatchCaseRecord, NewCaseInput, TreatmentEvent, View } from './types'

const grouperClient = new MockGrouperClient()

export default function App() {
  const { data, setData, reset } = usePersistentData()
  const [view, setView] = useState<View>(() => {
    const current = data.cases.find((codingCase) => codingCase.id === data.currentCaseId)
    return current ? (current.intakeConfirmed ? 'case' : 'intake') : 'worklist'
  })
  const [resetOpen, setResetOpen] = useState(false)
  const [pendingBatchRecord, setPendingBatchRecord] = useState<BatchCaseRecord>()
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
      batchCases: pendingBatchRecord ? current.batchCases.map((item) => item.id === pendingBatchRecord.id ? { ...item, importStatus: 'geöffnet' } : item) : current.batchCases,
      currentCaseId: codingCase.id,
    }))
    setPendingBatchRecord(undefined)
    setView('intake')
  }

  const openBatchCase = (record: BatchCaseRecord) => {
    const existing = data.cases.find((codingCase) => (
      codingCase.caseNumber === record.caseNumber
      && codingCase.hospitalId === record.hospitalId
      && codingCase.siteId === record.siteId
      && codingCase.year === record.year
    ))
    if (existing) {
      setData((current) => ({ ...current, currentCaseId: existing.id }))
      setView(existing.intakeConfirmed ? 'case' : 'intake')
      return
    }
    setData((current) => ({ ...current, currentCaseId: undefined }))
    setPendingBatchRecord(record)
    setView('start')
  }

  const createNewCase = () => {
    setPendingBatchRecord(undefined)
    setData((current) => ({ ...current, currentCaseId: undefined }))
    setView('start')
  }

  const updateData = (updater: (current: AppData) => AppData) => setData(updater)

  const newCase = () => {
    setPendingBatchRecord(undefined)
    setData((current) => ({ ...current, currentCaseId: undefined }))
    setView('worklist')
  }

  const mutateCurrentCase = (updater: (codingCase: NonNullable<typeof currentCase>) => NonNullable<typeof currentCase>) => {
    if (!currentCase) return
    setData((current) => ({ ...current, cases: current.cases.map((item) => item.id === currentCase.id ? updater(item) : item) }))
  }

  const confirmIntake = async () => {
    if (!currentCase) return
    const confirmedCase = {
      ...currentCase,
      intakeConfirmed: true,
      intakeSources: currentCase.intakeSources.map((source) => source.status === 'widersprüchlich' ? source : { ...source, status: 'bestätigt' as const }),
    }
    const run = await grouperClient.group(confirmedCase, 'Fallbasis bestätigt')
    setData((current) => ({
      ...current,
      cases: current.cases.map((item) => item.id === confirmedCase.id ? { ...confirmedCase, grouperRuns: [...confirmedCase.grouperRuns, run] } : item),
    }))
    setView('case')
  }

  const goToFallHome = () => setView(currentCase ? (currentCase.intakeConfirmed ? 'case' : 'intake') : 'worklist')

  const confirmReset = () => {
    reset()
    setPendingBatchRecord(undefined)
    setResetOpen(false)
    setView('start')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={goToFallHome}>
          <span className="brand-mark"><Route aria-hidden="true" /></span>
          <span>Kodierpfad <small>Version 28 · Hypothesenarbeitsplatz</small></span>
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
        {view === 'worklist' && <CasePool cases={data.batchCases} codingCases={data.cases} hospitals={data.hospitals} onOpen={openBatchCase} onCreate={createNewCase} />}
        {view === 'start' && <CaseStart key={pendingBatchRecord?.id ?? 'new-case'} hospitals={data.hospitals} batchRecord={pendingBatchRecord} onStart={startCase} onCancel={newCase} />}
        {view === 'intake' && currentCase && (
          <CaseIntake
            codingCase={currentCase}
            hospitals={data.hospitals}
            onBack={() => { setData((current) => ({ ...current, currentCaseId: undefined })); setView('worklist') }}
            onAddSource={(source) => mutateCurrentCase((codingCase) => ({ ...codingCase, intakeSources: [...codingCase.intakeSources, source] }))}
            onAddEvent={(event: TreatmentEvent) => mutateCurrentCase((codingCase) => ({ ...codingCase, timeline: [...codingCase.timeline, event].sort((a, b) => a.day - b.day) }))}
            onRemoveEvent={(eventId) => mutateCurrentCase((codingCase) => ({ ...codingCase, timeline: codingCase.timeline.filter((event) => event.id !== eventId) }))}
            onUpdateCase={(next) => mutateCurrentCase(() => next)}
            onConfirm={confirmIntake}
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
        {view === 'case' && !currentCase && <CasePool cases={data.batchCases} codingCases={data.cases} hospitals={data.hospitals} onOpen={openBatchCase} onCreate={createNewCase} />}
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
