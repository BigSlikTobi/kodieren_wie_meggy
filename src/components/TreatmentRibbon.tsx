import { Activity, ArrowRight, Building2, Cross, FileCheck2, FileCode2, Microscope, NotebookText, Pill, Scissors, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CodingCase, DocumentMapItem, TreatmentEvent } from '../types'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
  onOpenEvent?: (eventId: string) => void
  onOpenDepartment?: (eventId: string, documentId?: string) => void
}

interface DepartmentStay {
  department: string
  start: number
  end: number
  intensive: boolean
}

type ActivityLaneKey = 'diagnostic-non-invasive' | 'diagnostic-invasive' | 'intervention' | 'therapy' | 'complex'

const laneConfig: Array<{ key: ActivityLaneKey; label: string; shortLabel: string }> = [
  { key: 'diagnostic-non-invasive', label: 'Nicht-invasive Diagnostik', shortLabel: 'Nicht-invasiv' },
  { key: 'diagnostic-invasive', label: 'Invasive Diagnostik', shortLabel: 'Invasiv' },
  { key: 'intervention', label: 'Interventionen und Operationen', shortLabel: 'Eingriffe' },
  { key: 'therapy', label: 'Konservative und medikamentöse Therapie', shortLabel: 'Therapie' },
  { key: 'complex', label: 'Komplex- und Intensivbehandlung', shortLabel: 'Komplex' },
]

export function TreatmentRibbon({ codingCase, compact = false, onOpenEvent, onOpenDepartment }: TreatmentRibbonProps) {
  const events = [...codingCase.timeline].sort((a, b) => a.day - b.day || (a.time ?? '').localeCompare(b.time ?? ''))
  const departments = getDepartmentStays(events, codingCase.stayDays)
  const documents = codingCase.documentMap ?? []
  const courseDocuments = documents.filter((item) => item.kind === 'verlaufsbericht')
  const eventDocuments = documents.filter((item) => item.kind === 'ereignisbericht')
  const proofDocuments = documents.filter((item) => item.kind === 'nachweis')
  const leadingStay = departments.reduce<DepartmentStay | undefined>((longest, stay) => !longest || duration(stay) > duration(longest) ? stay : longest, undefined)
  const intensiveDays = departments.filter((stay) => stay.intensive).reduce((sum, stay) => sum + duration(stay), 0)
  const transitionCount = Math.max(0, departments.length - 1)
  const relevantEvents = events.filter((event) => !['Aufnahme', 'Verlegung', 'Entlassung'].includes(event.type))

  return (
    <section className={`treatment-ribbon treatment-overview ${compact ? 'is-compact' : ''}`} aria-label="Behandlungsverlauf">
      <header className="treatment-overview-head">
        <div>
          <span className="ribbon-eyebrow">Fallverständnis auf einen Blick</span>
          <strong>{departments.length} Teilaufenthalt{departments.length === 1 ? '' : 'e'} · {codingCase.stayDays} Tage</strong>
          <small>{transitionCount} Wechsel · {intensiveDays ? `${intensiveDays} Intensivtag${intensiveDays === 1 ? '' : 'e'}` : 'kein Intensivaufenthalt'} · führend: {leadingStay?.department ?? 'ungeklärt'}</small>
        </div>
        <div className="treatment-overview-facts" aria-label="Zusammenfassung relevanter Leistungen">
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'diagnostic-non-invasive').length}</b> nicht-invasiv</span>
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'diagnostic-invasive').length}</b> invasiv</span>
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'intervention').length}</b> Eingriffe</span>
          <span><b>{relevantEvents.filter((event) => ['therapy', 'complex'].includes(getActivityLane(event))).length}</b> Therapien</span>
        </div>
      </header>

      <div className="stay-map">
        <div className="ribbon-axis">
          <span>{formatDay(codingCase, 1)}</span>
          <strong>Teilaufenthalte · Breite entspricht Dauer</strong>
          <span>{formatDay(codingCase, codingCase.stayDays)}</span>
        </div>
        <div className="department-route proportional-stays" aria-label="Fachabteilungen im Fall">
          {departments.map((stay, index) => {
            const courseDocs = courseDocuments.filter((item) => item.department === stay.department && rangesOverlap(stay.start, stay.end, item.startDay, item.endDay ?? item.startDay))
            const firstEvent = events.find((event) => event.department === stay.department && event.day >= stay.start && event.day <= stay.end)
            const days = duration(stay)
            const percent = Math.round((days / codingCase.stayDays) * 100)
            const leading = stay === leadingStay
            const content = (
              <>
                <span className="department-stay-icon">{stay.intensive ? <Activity aria-hidden="true" /> : <Building2 aria-hidden="true" />}</span>
                <span className="department-stay-copy">
                  <strong>{stay.department}</strong>
                  <small>{formatDay(codingCase, stay.start)}–{formatDay(codingCase, stay.end)} · {days} Tag{days === 1 ? '' : 'e'} · {percent}%</small>
                </span>
                <span className={`stay-role ${stay.intensive ? 'intensive' : leading ? 'leading' : days <= 2 ? 'short' : ''}`}>{stay.intensive ? 'Intensivphase' : leading ? 'führend' : days <= 2 ? 'kurz' : 'Teilaufenthalt'}</span>
                <span className={`department-document-count ${courseDocs.some((item) => item.availability === 'fehlend') ? 'has-missing' : ''}`} title={`${courseDocs.length} Verlaufsdokumente`}><NotebookText aria-hidden="true" /><b>{courseDocs.length}</b></span>
                {onOpenDepartment && firstEvent && <ArrowRight className="department-stay-arrow" aria-hidden="true" />}
              </>
            )
            const style = { width: `${(days / codingCase.stayDays) * 100}%` }
            const label = `${index + 1}. Teilaufenthalt: ${stay.department}, ${formatDay(codingCase, stay.start)} bis ${formatDay(codingCase, stay.end)}, ${days} Tage, ${percent} Prozent des Falls, ${courseDocs.length} Verlaufsdokument${courseDocs.length === 1 ? '' : 'e'}${leading ? ', führender Aufenthalt' : ''}`
            return onOpenDepartment && firstEvent ? (
              <button className={`department-stay ${stay.intensive ? 'is-intensive' : ''} ${leading ? 'is-leading' : ''}`} style={style} type="button" key={`${stay.department}-${stay.start}`} aria-label={`${label}. Verlaufsdokumente öffnen.`} onClick={() => onOpenDepartment(firstEvent.id, courseDocs.length === 1 ? courseDocs[0].id : undefined)}>{content}</button>
            ) : (
              <div className={`department-stay ${stay.intensive ? 'is-intensive' : ''} ${leading ? 'is-leading' : ''}`} style={style} key={`${stay.department}-${stay.start}`} aria-label={label}>{content}</div>
            )
          })}
        </div>
      </div>

      <div className="document-grammar" aria-label="Dokumenttypen im Behandlungsverlauf">
        <DocumentGrammarCard icon={<NotebookText aria-hidden="true" />} title="Verlaufsdokumentation" count={courseDocuments.length} detail="Zeitraum · meist ICD und grobe OPS" className="course" />
        <DocumentGrammarCard icon={<FileCheck2 aria-hidden="true" />} title="Ereignisdokumentation" count={eventDocuments.length} detail="Zeitpunkt · gezielte ICD oder OPS" className="event" />
        <DocumentGrammarCard icon={<ShieldCheck aria-hidden="true" />} title="Leistungsnachweise" count={proofDocuments.length} detail="Zeitraum/Punkt · OPS, ZE oder NUB" className="proof" />
      </div>

      {courseDocuments.length > 0 && (
        <div className="course-document-lane">
          <span className="activity-lane-label"><NotebookText aria-hidden="true" /><span><strong>Verlaufsberichte</strong><small>spannen einen oder mehrere Aufenthaltsteile auf</small></span></span>
          <div className="course-document-track" aria-label="Verlaufsdokumente über der Zeitachse">
            {courseDocuments.map((document) => {
              const start = ((document.startDay - 1) / codingCase.stayDays) * 100
              const width = (((document.endDay ?? document.startDay) - document.startDay + 1) / codingCase.stayDays) * 100
              const linkedEvent = events.find((event) => event.linkedDocumentIds?.includes(document.id)) ?? events.find((event) => event.department === document.department)
              const label = `${document.title}, ${formatDay(codingCase, document.startDay)} bis ${formatDay(codingCase, document.endDay ?? document.startDay)}`
              return onOpenDepartment && linkedEvent ? (
                <button key={document.id} className="course-document-band" style={{ left: `${start}%`, width: `${Math.max(width, 8)}%` }} type="button" title={label} aria-label={`${label}. Zugeordnetes Dokument öffnen.`} onClick={() => onOpenDepartment(linkedEvent.id, document.id)}><span>{document.title}</span></button>
              ) : <span key={document.id} className="course-document-band" style={{ left: `${start}%`, width: `${Math.max(width, 8)}%` }} title={label}><span>{document.title}</span></span>
            })}
          </div>
        </div>
      )}

      <div className="activity-lanes" aria-label="Medizinisch relevante Ereignisse nach Art">
        {laneConfig.map((lane) => {
          const laneEvents = relevantEvents.filter((event) => getActivityLane(event) === lane.key)
          if (laneEvents.length === 0) return null
          const labels = laneEvents.map((event) => event.label)
          return (
            <div className={`activity-lane lane-${lane.key}`} key={lane.key}>
              <span className="activity-lane-label"><LaneIcon lane={lane.key} /><span><strong>{lane.label}</strong><small>{summarizeLabels(labels)}</small></span><b>{laneEvents.length}</b></span>
              <div className="activity-lane-track" aria-label={`${lane.label}: ${labels.join(', ')}`}>
                {groupEventsByDay(laneEvents).map((group) => {
                  const event = group.events[0]
                  const position = codingCase.stayDays <= 1 ? 0 : ((event.day - 1) / (codingCase.stayDays - 1)) * 100
                  const linkedDocs = group.events.flatMap((item) => documents.filter((document) => item.linkedDocumentIds?.includes(document.id)))
                  const eventDocCount = linkedDocs.filter((document) => document.kind === 'ereignisbericht').length
                  const proofDocCount = linkedDocs.filter((document) => document.kind === 'nachweis').length
                  const codeCount = group.events.reduce((sum, item) => sum + codingCase.codingEntries.filter((entry) => entry.treatmentEventId === item.id).length, 0)
                  const markerLabel = `${formatDay(codingCase, event.day)}: ${group.events.map((item) => item.label).join(', ')}. ${eventDocCount} Ereignisdokumente, ${proofDocCount} Nachweise, ${codeCount} Kodes.`
                  const marker = (
                    <>
                      <span className="activity-marker-icon"><EventIcon event={event} /></span>
                      {group.events.length > 1 && <b>{group.events.length}</b>}
                      <span className="activity-marker-date">{formatDay(codingCase, event.day)}</span>
                      {(eventDocCount > 0 || proofDocCount > 0) && <span className="marker-document-shapes" aria-hidden="true"><i className={eventDocCount ? 'event-document-dot' : ''} /><i className={proofDocCount ? 'proof-document-square' : ''} /></span>}
                    </>
                  )
                  return onOpenEvent ? (
                    <button className="activity-marker" style={{ left: `${position}%` }} type="button" key={`${lane.key}-${event.day}`} title={markerLabel} aria-label={`${markerLabel} Falllandkarte öffnen.`} onClick={() => onOpenEvent(event.id)}>{marker}</button>
                  ) : <span className="activity-marker" style={{ left: `${position}%` }} key={`${lane.key}-${event.day}`} title={markerLabel}>{marker}</span>
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="timeline-legend" aria-label="Legende der Behandlungsübersicht">
        <span><i className="legend-course" />Band = zusammenfassender Verlauf</span>
        <span><i className="legend-event" />Punkt = Ereignisbericht</span>
        <span><i className="legend-proof" />Quadrat = Leistungsnachweis</span>
        <span><FileCode2 aria-hidden="true" />Klick öffnet die passende Stelle der Dokumentenlandkarte</span>
      </div>

      {codingCase.technicalValues.length > 0 && (
        <div className="ribbon-technical" aria-label="Importierte technische Leistungen">
          {codingCase.technicalValues.map((value) => <span key={value.id}><ShieldAlert aria-hidden="true" />{value.code ?? value.label}{value.aggregateValue ? ` · ${value.aggregateValue} ${value.unit}` : ''}</span>)}
        </div>
      )}
    </section>
  )
}

function DocumentGrammarCard({ icon, title, count, detail, className }: { icon: ReactNode; title: string; count: number; detail: string; className: string }) {
  return <div className={`document-grammar-card grammar-${className}`}>{icon}<span><strong>{title}</strong><small>{detail}</small></span><b>{count}</b></div>
}

function LaneIcon({ lane }: { lane: ActivityLaneKey }) {
  if (lane === 'diagnostic-non-invasive' || lane === 'diagnostic-invasive') return <Microscope aria-hidden="true" />
  if (lane === 'intervention') return <Scissors aria-hidden="true" />
  if (lane === 'complex') return <Activity aria-hidden="true" />
  return <Pill aria-hidden="true" />
}

export function EventIcon({ event }: { event: TreatmentEvent }) {
  if (event.type === 'Eingriff') return <Scissors aria-hidden="true" />
  if (event.type === 'Diagnostik') return <Microscope aria-hidden="true" />
  if (event.type === 'Therapie') return <Pill aria-hidden="true" />
  if (event.type === 'Intensiv') return <Activity aria-hidden="true" />
  return <Cross aria-hidden="true" />
}

export function dateForEvent(codingCase: CodingCase, event: TreatmentEvent) {
  return codingCase.admissionDate ? addDays(codingCase.admissionDate, event.day - 1) : undefined
}

export function formatDay(codingCase: CodingCase, day: number) {
  if (!codingCase.admissionDate) return `Tag ${day}`
  return new Date(`${addDays(codingCase.admissionDate, day - 1)}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDepartmentStays(events: TreatmentEvent[], stayDays: number): DepartmentStay[] {
  const admission = events.find((event) => event.type === 'Aufnahme') ?? events[0]
  if (!admission) return []
  const transitions = events.filter((event) => event.type === 'Verlegung' || event.type === 'Intensiv').sort((a, b) => a.day - b.day)
  const stays: DepartmentStay[] = []
  let currentDepartment = admission.department
  let currentStart = 1

  transitions.forEach((event, index) => {
    if (event.day > currentStart) stays.push({ department: currentDepartment, start: currentStart, end: event.day - 1, intensive: currentDepartment === 'Intensivmedizin' })
    if (event.type === 'Intensiv') {
      const intensiveEnd = Math.min(stayDays, event.endDay ?? event.day)
      stays.push({ department: event.department, start: event.day, end: intensiveEnd, intensive: true })
      currentStart = intensiveEnd + 1
      const nextTransition = transitions[index + 1]
      if (!nextTransition || nextTransition.day > currentStart) currentDepartment = admission.department
    } else {
      currentDepartment = event.department
      currentStart = event.day
    }
  })

  if (currentStart <= stayDays) stays.push({ department: currentDepartment, start: currentStart, end: stayDays, intensive: currentDepartment === 'Intensivmedizin' })
  return stays.filter((stay) => stay.end >= stay.start)
}

function getActivityLane(event: TreatmentEvent): ActivityLaneKey {
  const label = event.label.toLowerCase()
  if (event.type === 'Intensiv' || /komplex|palliativ|organersatz|beatmung/.test(label)) return 'complex'
  if (event.type === 'Eingriff' && /bronchos|biops|punktion|gewebe|endoson|diagnost/.test(label)) return 'diagnostic-invasive'
  if (event.type === 'Eingriff') return 'intervention'
  if (event.type === 'Diagnostik' && /bronchos|biops|punktion|endoson|invasiv/.test(label)) return 'diagnostic-invasive'
  if (event.type === 'Diagnostik') return 'diagnostic-non-invasive'
  return 'therapy'
}

function groupEventsByDay(events: TreatmentEvent[]) {
  const groups = new Map<number, TreatmentEvent[]>()
  events.forEach((event) => groups.set(event.day, [...(groups.get(event.day) ?? []), event]))
  return [...groups.entries()].sort(([dayA], [dayB]) => dayA - dayB).map(([day, groupedEvents]) => ({ day, events: groupedEvents }))
}

function summarizeLabels(labels: string[]) {
  if (labels.length <= 2) return labels.join(' · ')
  return `${labels.slice(0, 2).join(' · ')} · +${labels.length - 2} weitere`
}

function duration(stay: DepartmentStay) {
  return stay.end - stay.start + 1
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA <= endB && startB <= endA
}
