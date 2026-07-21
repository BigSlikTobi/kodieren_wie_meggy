import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FilePenLine,
  FilePlus2,
  Inbox,
  ListFilter,
  MessageCircleReply,
  Search,
  Sparkles,
  Stethoscope,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { BatchCaseRecord, CodingCase, HospitalProfile } from '../types'
import { CaseJourney } from './CaseJourney'
import './CasePool.v28.css'

interface CasePoolProps {
  cases: BatchCaseRecord[]
  codingCases: CodingCase[]
  hospitals: HospitalProfile[]
  onOpen: (record: BatchCaseRecord) => void
  onCreate: () => void
}

type WorklistKey = 'all' | 'quick' | 'consult-answer' | 'consult-waiting' | 'basis' | 'active' | 'kis-ready' | 'completed'

interface PoolItem {
  record: BatchCaseRecord
  codingCase?: CodingCase
}

interface PoolSignals {
  completed: boolean
  consultAnswered: boolean
  consultWaiting: boolean
  basisMissing: boolean
  quick: boolean
  active: boolean
  readyForKis: boolean
}

const worklists: Array<{
  key: WorklistKey
  label: string
  shortLabel: string
  icon: typeof Inbox
}> = [
  { key: 'all', label: 'Alle Fälle', shortLabel: 'Alle', icon: Inbox },
  { key: 'quick', label: 'Schnell abschließbar', shortLabel: 'Schnell abschließbar', icon: Sparkles },
  { key: 'consult-answer', label: 'Konsilantwort eingegangen', shortLabel: 'Konsilantwort', icon: MessageCircleReply },
  { key: 'consult-waiting', label: 'Wartet auf Konsil', shortLabel: 'Wartet auf Konsil', icon: Clock3 },
  { key: 'basis', label: 'Fallbasis ergänzen', shortLabel: 'Fallbasis ergänzen', icon: FilePenLine },
  { key: 'active', label: 'In Bearbeitung', shortLabel: 'In Bearbeitung', icon: ListFilter },
  { key: 'kis-ready', label: 'Bereit für KIS-Übernahme', shortLabel: 'Bereit für KIS', icon: FileCheck2 },
  { key: 'completed', label: 'Abgeschlossen', shortLabel: 'Abgeschlossen', icon: CheckCircle2 },
]

export function CasePool({ cases, codingCases, hospitals, onOpen, onCreate }: CasePoolProps) {
  const [query, setQuery] = useState('')
  const [hospitalId, setHospitalId] = useState('all')
  const [activeWorklist, setActiveWorklist] = useState<WorklistKey>('all')

  const items = useMemo<PoolItem[]>(() => {
    const batchKeys = new Set(cases.map(caseIdentityFromRecord))
    const batchItems = cases.map((record) => ({
      record,
      codingCase: codingCases.find((item) => caseIdentityFromCodingCase(item) === caseIdentityFromRecord(record)),
    }))
    const manuallyCreatedItems = codingCases
      .filter((codingCase) => !batchKeys.has(caseIdentityFromCodingCase(codingCase)))
      .map((codingCase) => ({ record: recordFromCodingCase(codingCase), codingCase }))

    return [...batchItems, ...manuallyCreatedItems]
      .sort((a, b) => b.record.dischargeDate.localeCompare(a.record.dischargeDate))
  }, [cases, codingCases])

  const scopedItems = useMemo(() => items.filter(({ record }) => {
    const haystack = `${record.caseNumber} ${record.department} ${record.codingSummary}`.toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase())
    return matchesQuery && (hospitalId === 'all' || record.hospitalId === hospitalId)
  }), [hospitalId, items, query])

  const counts = useMemo(() => Object.fromEntries(worklists.map(({ key }) => [
    key,
    scopedItems.filter((item) => matchesWorklist(item, key)).length,
  ])) as Record<WorklistKey, number>, [scopedItems])

  const filtered = useMemo(
    () => scopedItems.filter((item) => matchesWorklist(item, activeWorklist)),
    [activeWorklist, scopedItems],
  )

  return (
    <div className="page case-pool-page v28-case-pool">
      <CaseJourney active="kis" />

      <div className="pool-heading v28-pool-heading">
        <div>
          <div className="page-kicker">Fallpool · pseudonymisierte Demodaten</div>
          <h1>Was kannst Du als Nächstes erledigen?</h1>
          <p className="lead">Arbeitslisten zeigen zuerst die Fälle, bei denen jetzt eine Entscheidung möglich ist.</p>
        </div>
        <button className="button secondary" type="button" onClick={onCreate}>
          <FilePlus2 aria-hidden="true" /> Einzelfall anlegen
        </button>
      </div>

      <section className="v28-worklists" aria-labelledby="worklists-title">
        <div className="v28-worklists-title">
          <div>
            <span className="v28-section-icon"><ListFilter aria-hidden="true" /></span>
            <span><strong id="worklists-title">Meine Arbeitslisten</strong><small>Ein Klick reduziert den Pool auf eine konkrete nächste Handlung.</small></span>
          </div>
          <span>{scopedItems.length} Fälle im aktuellen Suchbereich</span>
        </div>
        <div className="v28-worklist-tabs" aria-label="Arbeitsliste auswählen">
          {worklists.map(({ key, label, shortLabel, icon: Icon }) => (
            <button
              className={activeWorklist === key ? 'is-active' : ''}
              type="button"
              key={key}
              aria-label={`${label}: ${counts[key]}`}
              aria-pressed={activeWorklist === key}
              onClick={() => setActiveWorklist(key)}
            >
              <Icon aria-hidden="true" />
              <span>{shortLabel}</span>
              <b>{counts[key]}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="pool-search v28-pool-search" aria-labelledby="pool-search-title">
        <h2 id="pool-search-title" className="sr-only">Fall suchen</h2>
        <label className="pool-query">
          <Search aria-hidden="true" />
          <span className="sr-only">Fallnummer, Fachabteilung oder Kodierung</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fallnummer eingeben, Fachabteilung oder Kodierung suchen" />
        </label>
        <label>
          <span>Krankenhaus</span>
          <select value={hospitalId} onChange={(event) => setHospitalId(event.target.value)}>
            <option value="all">Alle Häuser</option>
            {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
          </select>
        </label>
      </section>

      <div className="pool-context v28-pool-context">
        <Database aria-hidden="true" />
        <span>
          <strong>{cases.length} Fälle aus dem Demo-Batch</strong>
          <small>Zusätzlich erscheinen hier manuell angelegte Fälle. Die Zuweisung bleibt im Primärsystem.</small>
        </span>
      </div>

      <section className="case-pool-list v28-case-pool-list" aria-label="Verfügbare Fälle">
        <div className="pool-list-head v28-pool-list-head">
          <span><strong>{filtered.length}</strong> Treffer · {worklists.find((item) => item.key === activeWorklist)?.label}</span>
          <span>Nach Entlassdatum sortiert</span>
        </div>
        {filtered.map(({ record, codingCase }) => {
          const hospital = hospitals.find((item) => item.id === record.hospitalId)
          const profile = hospital?.profiles.find((item) => item.siteId === record.siteId && item.year === record.year)
          const state = getPoolState(record, codingCase)
          const latestRun = codingCase?.grouperRuns.at(-1)
          return (
            <article className={`pool-case v28-pool-case state-${state.tone}`} key={record.id}>
              <div className="pool-case-number v28-pool-case-number">
                <span><Stethoscope aria-hidden="true" /></span>
                <div>
                  <small>Fallnummer</small>
                  <h2>{record.caseNumber}</h2>
                  <span>{record.age} Jahre · {daysBetween(record.admissionDate, record.dischargeDate)} Tage</span>
                </div>
              </div>

              <div className="pool-case-facts v28-pool-case-facts">
                <span><Building2 aria-hidden="true" /> {hospital?.name ?? 'Krankenhaus'} · {profile?.siteName ?? record.siteId}</span>
                <span><CalendarDays aria-hidden="true" /> {formatDate(record.admissionDate)}–{formatDate(record.dischargeDate)}</span>
                <strong>{record.department}</strong>
                <small>{record.codingSummary}</small>
              </div>

              <div className="v28-pool-result" aria-label="Aktueller Bearbeitungsstand">
                <span className={`v28-state-badge tone-${state.tone}`}>{state.label}</span>
                {latestRun && <span><small>Arbeits-DRG</small><strong>{latestRun.drg}</strong></span>}
                {codingCase?.difficulty && <span><small>Fall</small><strong>{codingCase.difficulty}</strong></span>}
                {state.meta && <small className="v28-state-meta">{state.meta}</small>}
              </div>

              <button className={`button ${state.tone === 'waiting' ? 'secondary' : 'primary'}`} type="button" onClick={() => onOpen(record)}>
                {state.action} <ArrowRight aria-hidden="true" />
              </button>
            </article>
          )
        })}
        {filtered.length === 0 && (
          <div className="pool-empty v28-pool-empty">
            <Search aria-hidden="true" />
            <p>In dieser Arbeitsliste gibt es aktuell keinen passenden Fall.</p>
            {activeWorklist !== 'all' && <button type="button" className="button secondary" onClick={() => setActiveWorklist('all')}>Alle Fälle anzeigen</button>}
          </div>
        )}
      </section>
    </div>
  )
}

function getPoolSignals(codingCase?: CodingCase): PoolSignals {
  const completed = Boolean(codingCase && (codingCase.status === 'abgeschlossen' || codingCase.kisTransferConfirmedAt))
  const readyForKis = Boolean(codingCase && !completed && codingCase.status === 'tool-geprüft')
  const unresolvedDecisionIds = new Set(codingCase?.decisions
    .filter((decision) => !['belegt', 'ausgeschlossen'].includes(decision.status))
    .map((decision) => decision.id) ?? [])
  const consultAnswered = Boolean(!completed && !readyForKis && codingCase?.consultations.some((consultation) => (
    consultation.status === 'abgeschlossen' && unresolvedDecisionIds.has(consultation.decisionId)
  )))
  const consultWaiting = Boolean(!completed && !readyForKis && !consultAnswered && codingCase?.consultations.some((consultation) => (
    ['angefragt', 'in Bearbeitung'].includes(consultation.status) && unresolvedDecisionIds.has(consultation.decisionId)
  )))
  const basisMissing = Boolean(!completed && !readyForKis && !consultAnswered && !consultWaiting && (!codingCase || !codingCase.intakeConfirmed))
  const hasBlockingDecision = Boolean(codingCase?.decisions.some((decision) => (
    decision.required
    && !['belegt', 'ausgeschlossen'].includes(decision.status)
  )))
  const hasBlockingTechnicalValue = Boolean(codingCase?.technicalValues.some((value) => (
    value.groupingRelevant && !['bestätigt', 'korrigiert'].includes(value.status)
  )))
  const quick = Boolean(
    codingCase
    && !completed
    && !readyForKis
    && !consultAnswered
    && !consultWaiting
    && codingCase.intakeConfirmed
    && codingCase.difficulty === 'einfach'
    && !hasBlockingDecision
    && !hasBlockingTechnicalValue,
  )
  const active = Boolean(codingCase && !completed && !readyForKis && !consultAnswered && !consultWaiting && !basisMissing && !quick)

  return { completed, consultAnswered, consultWaiting, basisMissing, quick, active, readyForKis }
}

function matchesWorklist(item: PoolItem, worklist: WorklistKey) {
  if (worklist === 'all') return true
  const signals = getPoolSignals(item.codingCase)
  if (worklist === 'quick') return signals.quick
  if (worklist === 'consult-answer') return signals.consultAnswered
  if (worklist === 'consult-waiting') return signals.consultWaiting
  if (worklist === 'basis') return signals.basisMissing
  if (worklist === 'kis-ready') return signals.readyForKis
  if (worklist === 'completed') return signals.completed
  return signals.active
}

function getPoolState(record: BatchCaseRecord, codingCase?: CodingCase) {
  const signals = getPoolSignals(codingCase)
  if (signals.completed) {
    return {
      label: 'Abgeschlossen',
      tone: 'completed',
      action: 'Abschluss ansehen',
      meta: codingCase?.kisTransferConfirmedAt ? `KIS bestätigt · ${formatDateTime(codingCase.kisTransferConfirmedAt)}` : 'Fall abgeschlossen',
    }
  }
  if (signals.consultAnswered) return { label: 'Konsilantwort eingegangen', tone: 'answer', action: 'Konsilantwort prüfen', meta: 'Neue fachliche Entscheidung liegt vor' }
  if (signals.consultWaiting) return { label: 'Wartet auf Konsil', tone: 'waiting', action: 'Konsilstatus ansehen', meta: 'Bearbeitung nach Rückantwort fortsetzen' }
  if (signals.readyForKis) return { label: 'Bereit für KIS-Übernahme', tone: 'kis-ready', action: 'KIS-Übernahme öffnen', meta: 'Prüfung abgeschlossen · Änderungen im KIS bestätigen' }
  if (signals.quick) return { label: 'Schnell abschließbar', tone: 'quick', action: 'Fall abschließen', meta: 'Fallbasis vollständig · einfacher Fall · kein Blocker' }
  if (signals.active) return { label: 'Fallbasis bereits bestätigt', tone: 'active', action: 'Prüfpfad fortsetzen', meta: nextOpenDecision(codingCase) }
  if (codingCase) return { label: 'Fallbasis in Prüfung', tone: 'basis', action: 'Fallbasis fortsetzen', meta: 'Angelegten Fall vervollständigen' }
  if (record.importStatus === 'bereit') return { label: 'Fallbasis vorausgefüllt', tone: 'basis-ready', action: 'Fallbasis prüfen', meta: 'KIS-Daten liegen zur Prüfung bereit' }
  return { label: 'Fallbasis ergänzen', tone: 'basis', action: 'Fallbasis ergänzen', meta: 'Angaben oder Dokumente fehlen' }
}

function nextOpenDecision(codingCase?: CodingCase) {
  const decision = codingCase?.decisions.find((item) => item.required && !['belegt', 'ausgeschlossen'].includes(item.status))
  return decision ? `Nächster Schritt: ${decision.title}` : 'Nächsten Prüfschritt bearbeiten'
}

function recordFromCodingCase(codingCase: CodingCase): BatchCaseRecord {
  const fallbackAdmission = codingCase.admissionDate ?? codingCase.createdAt.slice(0, 10)
  const fallbackDischarge = codingCase.dischargeDate ?? fallbackAdmission
  return {
    id: `manual-${codingCase.id}`,
    caseNumber: codingCase.caseNumber,
    hospitalId: codingCase.hospitalId,
    siteId: codingCase.siteId,
    year: codingCase.year,
    admissionDate: fallbackAdmission,
    dischargeDate: fallbackDischarge,
    age: codingCase.age,
    careForm: codingCase.careForm,
    scenario: codingCase.scenario,
    department: [...new Set(codingCase.timeline.map((event) => event.department))].filter(Boolean).join(' → ') || 'Fachabteilung noch offen',
    codingSummary: codingCase.codingEntries.filter((entry) => entry.active).slice(0, 4).map((entry) => entry.code).join(' · ') || 'Kodierung noch offen',
    importStatus: 'geöffnet',
    technicalValues: codingCase.technicalValues,
  }
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`).getTime()
  const endDate = new Date(`${end}T12:00:00`).getTime()
  return Math.max(1, Math.round((endDate - startDate) / 86_400_000) + 1)
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function caseIdentityFromRecord(record: BatchCaseRecord) {
  return `${record.hospitalId}|${record.siteId}|${record.year}|${record.caseNumber}`
}

function caseIdentityFromCodingCase(codingCase: CodingCase) {
  return `${codingCase.hospitalId}|${codingCase.siteId}|${codingCase.year}|${codingCase.caseNumber}`
}
