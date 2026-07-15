import { useMemo, useState } from 'react'
import { Building2, FileCheck2, RotateCcw, Route, Scale, ShieldCheck } from 'lucide-react'
import { CaseCockpit } from './components/CaseCockpit'
import { CaseStart } from './components/CaseStart'
import { HospitalsView } from './components/HospitalsView'
import { RulesView } from './components/RulesView'
import { createDemoCase } from './data/demo'
import { MockGrouperClient } from './services/grouper'
import { usePersistentData } from './store'
import type { AppData, NewCaseInput, View } from './types'

const grouperClient = new MockGrouperClient()

export default function App() {
  const { data, setData, reset } = usePersistentData()
  const [view, setView] = useState<View>(() => (data.currentCaseId ? 'case' : 'start'))
  const [resetOpen, setResetOpen] = useState(false)
  const currentCase = useMemo(
    () => data.cases.find((codingCase) => codingCase.id === data.currentCaseId),
    [data.cases, data.currentCaseId],
  )

  const startCase = (input: NewCaseInput) => {
    const codingCase = createDemoCase(input)
    setData((current) => ({
      ...current,
      cases: [...current.cases, codingCase],
      currentCaseId: codingCase.id,
    }))
    setView('case')
  }

  const updateData = (updater: (current: AppData) => AppData) => setData(updater)

  const newCase = () => {
    setData((current) => ({ ...current, currentCaseId: undefined }))
    setView('start')
  }

  const confirmReset = () => {
    reset()
    setResetOpen(false)
    setView('start')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => setView(currentCase ? 'case' : 'start')}>
          <span className="brand-mark"><Route aria-hidden="true" /></span>
          <span>Kodierpfad <small>Machbarkeitsprototyp</small></span>
        </button>
        <nav className="main-nav" aria-label="Hauptnavigation">
          <button className={view === 'start' || view === 'case' ? 'active' : ''} type="button" onClick={() => setView(currentCase ? 'case' : 'start')}>
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
        {view === 'start' && <CaseStart hospitals={data.hospitals} onStart={startCase} />}
        {view === 'case' && currentCase && (
          <CaseCockpit
            codingCase={currentCase}
            hospitals={data.hospitals}
            grouperClient={grouperClient}
            onDataChange={updateData}
            onNewCase={newCase}
          />
        )}
        {view === 'case' && !currentCase && <CaseStart hospitals={data.hospitals} onStart={startCase} />}
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
