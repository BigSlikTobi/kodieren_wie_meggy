import { ArrowRight, Building2, CalendarDays, Database, FilePlus2, Search, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { BatchCaseRecord, CodingCase, HospitalProfile } from '../types'
import { CaseJourney } from './CaseJourney'

interface CasePoolProps {
  cases: BatchCaseRecord[]
  codingCases: CodingCase[]
  hospitals: HospitalProfile[]
  onOpen: (record: BatchCaseRecord) => void
  onCreate: () => void
}

export function CasePool({ cases, codingCases, hospitals, onOpen, onCreate }: CasePoolProps) {
  const [query, setQuery] = useState('')
  const [hospitalId, setHospitalId] = useState('all')
  const filtered = useMemo(() => cases.filter((record) => {
    const matchesQuery = !query.trim() || `${record.caseNumber} ${record.department} ${record.codingSummary}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery && (hospitalId === 'all' || record.hospitalId === hospitalId)
  }), [cases, hospitalId, query])

  return (
    <div className="page case-pool-page">
      <CaseJourney active="kis" />
      <div className="pool-heading">
        <div><div className="page-kicker">Fallpool · pseudonymisierte Demodaten</div><h1>Welchen Fall bearbeitest Du?</h1><p className="lead">Die Zuweisung bleibt in der bestehenden Anwendung. Hier öffnest Du den Fall über seine Fallnummer.</p></div>
        <button className="button secondary" type="button" onClick={onCreate}><FilePlus2 aria-hidden="true" /> Einzelfall anlegen</button>
      </div>

      <section className="pool-search" aria-labelledby="pool-search-title">
        <h2 id="pool-search-title" className="sr-only">Fall suchen</h2>
        <label className="pool-query"><Search aria-hidden="true" /><span className="sr-only">Fallnummer oder Fachabteilung</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fallnummer eingeben, z. B. P-2026-004218" /></label>
        <label>Krankenhaus<select value={hospitalId} onChange={(event) => setHospitalId(event.target.value)}><option value="all">Alle Häuser</option>{hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}</select></label>
      </section>

      <div className="pool-context"><Database aria-hidden="true" /><span><strong>{cases.length} Fälle aus dem Demo-Batch</strong><small>Aufnahme, Entlassung und Vorkodierung wurden vorab eingespielt. Keine Zuweisungslogik im Prototyp.</small></span></div>

      <section className="case-pool-list" aria-label="Verfügbare Fälle">
        <div className="pool-list-head"><span>{filtered.length} Treffer</span><span>Nach Entlassdatum sortiert</span></div>
        {filtered.map((record) => {
          const hospital = hospitals.find((item) => item.id === record.hospitalId)
          const profile = hospital?.profiles.find((item) => item.siteId === record.siteId && item.year === record.year)
          const codingCase = codingCases.find((item) => item.caseNumber === record.caseNumber)
          const state = codingCase?.intakeConfirmed
            ? { label: 'Fallbasis bereits bestätigt', className: 'belegt', action: 'Prüfpfad fortsetzen' }
            : codingCase
              ? { label: 'Fallbasis in Prüfung', className: 'ungeklärt', action: 'Fallbasis fortsetzen' }
              : record.importStatus === 'bereit'
                ? { label: 'Fallbasis vorausgefüllt', className: 'belegt', action: 'Fallbasis prüfen' }
                : { label: 'Fallbasis ergänzen', className: 'ungeklärt', action: 'Fallbasis ergänzen' }
          return (
            <article className="pool-case" key={record.id}>
              <div className="pool-case-number"><span><Stethoscope aria-hidden="true" /></span><div><small>Fallnummer</small><strong>{record.caseNumber}</strong></div></div>
              <div className="pool-case-facts">
                <span><Building2 aria-hidden="true" /> {hospital?.name} · {profile?.siteName}</span>
                <span><CalendarDays aria-hidden="true" /> {formatDate(record.admissionDate)}–{formatDate(record.dischargeDate)}</span>
                <strong>{record.department}</strong>
                <small>{record.codingSummary}</small>
              </div>
              <div className="pool-case-state">
                <span className={`status-pill status-${state.className}`}>{state.label}</span>
                <small>{record.technicalValues.length} technische Werte</small>
              </div>
              <button className="button primary" type="button" onClick={() => onOpen(record)}>{state.action} <ArrowRight aria-hidden="true" /></button>
            </article>
          )
        })}
        {filtered.length === 0 && <div className="pool-empty"><Search aria-hidden="true" /><p>Kein Fall passt zu dieser Suche.</p></div>}
      </section>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
