import { Activity, ArrowRight, Building2, Cross, FileCheck2, FileCode2, Microscope, NotebookText, Pill, Scissors, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { CodingCase, DocumentMapItem, TreatmentEvent } from '../types'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
  onOpenEvent?: (eventId: string) => void
  onOpenDepartment?: (eventId: string, documentId?: string) => void
}

export function TreatmentRibbon({ codingCase, compact = false, onOpenEvent, onOpenDepartment }: TreatmentRibbonProps) {
  const events = [...codingCase.timeline].sort((a, b) => a.day - b.day || (a.time ?? '').localeCompare(b.time ?? ''))
  const departments = getDepartmentStays(events, codingCase.stayDays)
  const documents = codingCase.documentMap ?? []

  return (
    <section className={`treatment-ribbon ${compact ? 'is-compact' : ''}`} aria-label="Behandlungsverlauf">
      <div className="ribbon-axis">
        <span>{formatDay(codingCase, 1)}</span>
        <strong>Behandlungskette · {events.length} Ereignisse</strong>
        <span>{formatDay(codingCase, codingCase.stayDays)}</span>
      </div>

      <div className="document-type-legend" aria-label="Dokumenttypen im Behandlungsverlauf">
        <span className="document-kind kind-course"><NotebookText aria-hidden="true" /> Verlauf</span>
        <span className="document-kind kind-event"><FileCheck2 aria-hidden="true" /> Ereignis</span>
        <span className="document-kind kind-proof"><ShieldCheck aria-hidden="true" /> Nachweis</span>
      </div>

      <div className="department-route" aria-label="Fachabteilungen im Fall">
        {departments.map((stay) => {
          const courseDocuments = documents.filter((item) => item.kind === 'verlaufsbericht' && item.department === stay.department && rangesOverlap(stay.start, stay.end, item.startDay, item.endDay ?? item.startDay))
          const firstEvent = events.find((event) => event.department === stay.department && event.day >= stay.start && event.day <= stay.end)
          const content = (
            <>
              <span className="department-stay-icon">{stay.intensive ? <Activity aria-hidden="true" /> : <Building2 aria-hidden="true" />}</span>
              <span className="department-stay-copy"><strong>{stay.department}</strong><small>{formatDay(codingCase, stay.start)}{stay.end !== stay.start ? `–${formatDay(codingCase, stay.end)}` : ''}</small></span>
              <span className={`department-document-count ${courseDocuments.some((item) => item.availability === 'fehlend') ? 'has-missing' : ''}`}><NotebookText aria-hidden="true" /><b>{courseDocuments.length}</b><span>Verlauf</span></span>
              {onOpenDepartment && firstEvent && <ArrowRight className="department-stay-arrow" aria-hidden="true" />}
            </>
          )
          const style = { flexGrow: stay.end - stay.start + 1 }
          const label = `${stay.department}, ${formatDay(codingCase, stay.start)} bis ${formatDay(codingCase, stay.end)}, ${courseDocuments.length} Verlaufsdokument${courseDocuments.length === 1 ? '' : 'e'}`
          return onOpenDepartment && firstEvent ? (
            <button className={`department-stay ${stay.intensive ? 'is-intensive' : ''}`} style={style} type="button" key={`${stay.department}-${stay.start}`} aria-label={`${label}. Verlaufsdokument öffnen.`} onClick={() => onOpenDepartment(firstEvent.id, courseDocuments.length === 1 ? courseDocuments[0].id : undefined)}>{content}</button>
          ) : (
            <div className={`department-stay ${stay.intensive ? 'is-intensive' : ''}`} style={style} key={`${stay.department}-${stay.start}`} aria-label={label}>{content}</div>
          )
        })}
      </div>

      <div className="event-chip-grid" role="list" aria-label="Chronologische Ereignisse">
        {events.map((event) => {
          const linkedDocuments = documents.filter((item) => event.linkedDocumentIds?.includes(item.id))
          const codeCount = codingCase.codingEntries.filter((entry) => entry.treatmentEventId === event.id).length
          const content = (
            <>
              <span className={`event-chip-icon event-${event.type.toLowerCase()}`}><EventIcon event={event} /></span>
              <span className="event-chip-copy">
                <small>{formatDay(codingCase, event.day)}{event.time ? ` · ${event.time}` : ''}{event.endDay ? ` – ${formatDay(codingCase, event.endDay)}` : ''}</small>
                <strong>{event.label}</strong>
                <span>{event.department}</span>
              </span>
              <span className="event-chip-links">
                <DocumentKindCount kind="verlaufsbericht" documents={linkedDocuments} />
                <DocumentKindCount kind="ereignisbericht" documents={linkedDocuments} />
                <DocumentKindCount kind="nachweis" documents={linkedDocuments} />
                <span className="event-code-count"><FileCode2 aria-hidden="true" />{codeCount} Kode{codeCount === 1 ? '' : 's'}</span>
              </span>
              {onOpenEvent && <ArrowRight className="event-chip-arrow" aria-hidden="true" />}
            </>
          )
          return onOpenEvent ? (
            <button className="event-chip" type="button" role="listitem" key={event.id} onClick={() => onOpenEvent(event.id)} aria-label={`${formatDay(codingCase, event.day)}: ${event.label}. Falllandkarte öffnen.`}>
              {content}
            </button>
          ) : (
            <div className="event-chip" role="listitem" key={event.id}>{content}</div>
          )
        })}
      </div>

      {codingCase.technicalValues.length > 0 && (
        <div className="ribbon-technical" aria-label="Importierte technische Leistungen">
          {codingCase.technicalValues.map((value) => <span key={value.id}><ShieldAlert aria-hidden="true" />{value.code ?? value.label}{value.aggregateValue ? ` · ${value.aggregateValue} ${value.unit}` : ''}</span>)}
        </div>
      )}
    </section>
  )
}

function DocumentKindCount({ kind, documents }: { kind: Extract<DocumentMapItem['kind'], 'verlaufsbericht' | 'ereignisbericht' | 'nachweis'>; documents: DocumentMapItem[] }) {
  const count = documents.filter((item) => item.kind === kind).length
  if (!count) return null
  const config = {
    verlaufsbericht: { singular: 'Verlauf', plural: 'Verläufe', className: 'kind-course', icon: <NotebookText aria-hidden="true" /> },
    ereignisbericht: { singular: 'Ereignis', plural: 'Ereignisse', className: 'kind-event', icon: <FileCheck2 aria-hidden="true" /> },
    nachweis: { singular: 'Nachweis', plural: 'Nachweise', className: 'kind-proof', icon: <ShieldCheck aria-hidden="true" /> },
  }[kind]
  const label = count === 1 ? config.singular : config.plural
  return <span className={`document-kind ${config.className}`} aria-label={`${count} ${label}`} title={`${count} ${label}`}>{config.icon}<b>{count}</b><span>{label}</span></span>
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

function getDepartmentStays(events: TreatmentEvent[], stayDays: number) {
  const transitions = events.filter((event, index) => index === 0 || event.type === 'Verlegung' || event.type === 'Intensiv')
  return transitions.map((event, index) => ({
    department: event.department,
    start: event.day,
    end: Math.max(event.day, Math.min(stayDays, (transitions[index + 1]?.day ?? stayDays + 1) - 1)),
    intensive: event.type === 'Intensiv' || event.department === 'Intensivmedizin',
  })).filter((stay, index, stays) => index === 0 || stay.department !== stays[index - 1].department || stay.start !== stays[index - 1].start)
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA <= endB && startB <= endA
}
