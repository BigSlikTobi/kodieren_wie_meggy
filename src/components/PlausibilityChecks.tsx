import { AlertTriangle, Check, CircleHelp, ShieldCheck } from 'lucide-react'
import type { CodingCase } from '../types'

export type PlausibilityStatus = 'passed' | 'warning' | 'blocking'

export interface PlausibilityCheck {
  id: string
  title: string
  detail: string
  status: PlausibilityStatus
}

export function getPlausibilityChecks(codingCase: CodingCase): PlausibilityCheck[] {
  const run = codingCase.grouperRuns.at(-1)
  const active = codingCase.codingEntries.filter((entry) => entry.active)
  const diagnoses = active.filter((entry) => entry.type !== 'OPS')
  const procedures = active.filter((entry) => entry.type === 'OPS')
  const mainCount = diagnoses.filter((entry) => entry.type === 'HD').length
  const incompleteOps = procedures.filter((entry) => !entry.serviceDate || !entry.serviceTime)
  const leadingDepartment = getLeadingDepartment(codingCase)
  const mdcPlausible = isMdcDepartmentPlausible(run?.mdc, leadingDepartment)
  const partition = run?.partition ?? inferPartition(codingCase)
  const hasIntervention = codingCase.timeline.some((event) => event.type === 'Eingriff')
  const hasInvasiveDiagnostics = codingCase.timeline.some((event) => event.type === 'Diagnostik' && /invasiv|biops|katheter|endoskop|bronchoskop/i.test(event.label))
  const partitionPlausible = partition === 'O' ? hasIntervention : partition === 'A' ? hasInvasiveDiagnostics || hasIntervention : !hasIntervention
  const unsupportedOps = procedures.filter((procedure) => !hasSupportingDiagnosis(procedure.description, diagnoses.map((entry) => entry.description)))
  const lower = run?.lengthOfStay.lowerFirstDiscountDay
  const upper = run?.lengthOfStay.upperFirstSurchargeDay
  const inCorridor = (lower === undefined || codingCase.stayDays >= lower) && (upper === undefined || codingCase.stayDays <= upper)

  return [
    {
      id: 'groupable',
      title: 'Technisch gruppierfähig',
      detail: mainCount !== 1 ? 'Genau eine aktive Hauptdiagnose ist erforderlich.' : incompleteOps.length ? `${incompleteOps.length} OPS ohne vollständigen Leistungszeitpunkt.` : 'Pflichtfelder für die Gruppierung sind vollständig.',
      status: mainCount !== 1 || incompleteOps.length > 0 ? 'blocking' : 'passed',
    },
    {
      id: 'ops-diagnosis',
      title: 'OPS und Diagnosen',
      detail: unsupportedOps.length ? `${unsupportedOps.length} OPS benötigen einen klinischen Diagnoseabgleich.` : 'Die aktiven OPS besitzen einen plausiblen Diagnosekontext.',
      status: unsupportedOps.length ? 'warning' : 'passed',
    },
    {
      id: 'mdc-department',
      title: 'MDC und führende Fachabteilung',
      detail: `${run?.mdc ?? 'MDC offen'} · größter Verlaufsanteil: ${leadingDepartment}.`,
      status: mdcPlausible ? 'passed' : 'warning',
    },
    {
      id: 'partition-course',
      title: 'Partition und Behandlungsverlauf',
      detail: `Partition ${partition} · ${hasIntervention ? 'Intervention im Verlauf' : hasInvasiveDiagnostics ? 'invasive Diagnostik im Verlauf' : 'medizinischer Verlauf ohne Eingriff'}.`,
      status: partitionPlausible ? 'passed' : 'warning',
    },
    {
      id: 'length-of-stay',
      title: 'DRG-Verweildauerkorridor',
      detail: `${codingCase.stayDays} Tage · uGVD ${lower ?? '–'} · mVWD ${run?.lengthOfStay.meanDays ?? '–'} · oGVD ${upper ?? '–'}.`,
      status: inCorridor ? 'passed' : 'warning',
    },
    {
      id: 'rules',
      title: 'DKR und Katalogsystematik',
      detail: `${codingCase.dkrMatches.length} fallbezogene Regelhinweise verfügbar; Fachfreigabe erforderlich.`,
      status: codingCase.dkrMatches.length ? 'passed' : 'warning',
    },
  ]
}

export function PlausibilityChecks({ codingCase }: { codingCase: CodingCase }) {
  const checks = getPlausibilityChecks(codingCase)
  const passed = checks.filter((check) => check.status === 'passed').length
  const warnings = checks.filter((check) => check.status === 'warning').length
  const blockers = checks.filter((check) => check.status === 'blocking').length

  return <section className="plausibility-checks" aria-labelledby="plausibility-checks-title">
    <header><span><ShieldCheck aria-hidden="true" /></span><div><small>Strukturierte Gegenprüfung</small><h3 id="plausibility-checks-title">{passed} plausibel · {warnings} Hinweise · {blockers} Blocker</h3></div></header>
    <div className="plausibility-check-list">
      {checks.map((check) => <article className={`plausibility-check status-${check.status}`} key={check.id}>
        <span>{check.status === 'passed' ? <Check aria-hidden="true" /> : check.status === 'blocking' ? <AlertTriangle aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}</span>
        <div><strong>{check.title}</strong><small>{check.detail}</small></div>
        <b>{check.status === 'passed' ? 'plausibel' : check.status === 'blocking' ? 'blockierend' : 'prüfen'}</b>
      </article>)}
    </div>
  </section>
}

function getLeadingDepartment(codingCase: CodingCase) {
  const scores = new Map<string, number>()
  for (const event of codingCase.timeline) {
    if (['Aufnahme', 'Entlassung'].includes(event.type)) continue
    scores.set(event.department, (scores.get(event.department) ?? 0) + Math.max(1, (event.endDay ?? event.day) - event.day + 1))
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? codingCase.timeline[0]?.department ?? 'offen'
}

function inferPartition(codingCase: CodingCase): 'O' | 'A' | 'M' {
  if (codingCase.timeline.some((event) => event.type === 'Eingriff')) return 'O'
  if (codingCase.timeline.some((event) => event.type === 'Diagnostik' && /invasiv|biops|katheter|endoskop/i.test(event.label))) return 'A'
  return 'M'
}

function isMdcDepartmentPlausible(mdc: string | undefined, department: string) {
  if (!mdc) return true
  const value = `${mdc} ${department}`.toLowerCase()
  if (/04|atmung/.test(mdc)) return /pneumo|thorax|onko|intensiv/.test(value)
  if (/05|kreislauf/.test(mdc)) return /kardio|herz|intensiv/.test(value)
  if (/08|muskel/.test(mdc)) return /unfall|ortho|geriatr/.test(value)
  if (/01|nerven/.test(mdc)) return /neuro|stroke|intensiv/.test(value)
  if (/11|harn/.test(mdc)) return /uro|nephro/.test(value)
  return true
}

function hasSupportingDiagnosis(procedure: string, diagnoses: string[]) {
  const haystack = diagnoses.join(' ').toLowerCase()
  const value = procedure.toLowerCase()
  if (/broncho|thorax|beatmung/.test(value)) return /pneumo|bronch|respir|lunge|karzinom/.test(haystack)
  if (/koronar|herz|stent|klappe/.test(value)) return /herz|koronar|aorten|insuffizienz/.test(haystack)
  if (/fraktur|hüft|osteosynth/.test(value)) return /fraktur|schenkel|osteopor/.test(haystack)
  if (/append/.test(value)) return /append/.test(haystack)
  if (/stein|harn|uro/.test(value)) return /stein|harn|niere/.test(haystack)
  return diagnoses.length > 0
}
