import { Activity, ArrowRight, Cross, FileText, Microscope, Pill, Scissors, ShieldAlert } from 'lucide-react'
import type { CodingCase, TreatmentEvent } from '../types'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
  onOpenEvent?: (eventId: string) => void
}

export function TreatmentRibbon({ codingCase, compact = false, onOpenEvent }: TreatmentRibbonProps) {
  const events = [...codingCase.timeline].sort((a, b) => a.day - b.day || (a.time ?? '').localeCompare(b.time ?? ''))
  const departments = getDepartmentStays(events, codingCase.stayDays)

  return (
    <section className={`treatment-ribbon ${compact ? 'is-compact' : ''}`} aria-label="Behandlungsverlauf">
      <div className="ribbon-axis">
        <span>{formatDay(codingCase, 1)}</span>
        <strong>Behandlungskette · {events.length} Ereignisse</strong>
        <span>{formatDay(codingCase, codingCase.stayDays)}</span>
      </div>

      <div className="department-route" aria-label="Fachabteilungen im Fall">
        {departments.map((stay) => (
          <div className={`department-stay ${stay.intensive ? 'is-intensive' : ''}`} key={`${stay.department}-${stay.start}`}>
            <span>{stay.department}</span>
            <small>{formatDay(codingCase, stay.start)}{stay.end !== stay.start ? `–${formatDay(codingCase, stay.end)}` : ''}</small>
          </div>
        ))}
      </div>

      <div className="event-chip-grid" role="list" aria-label="Chronologische Ereignisse">
        {events.map((event) => {
          const documentCount = event.linkedDocumentIds?.length ?? 0
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
                <span><FileText aria-hidden="true" />{documentCount}</span>
                <span>{codeCount} Kode{codeCount === 1 ? '' : 's'}</span>
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
