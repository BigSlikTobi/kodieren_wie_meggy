import type { CSSProperties } from 'react'
import { Activity, Cross, Microscope, Pill, Scissors, ShieldAlert } from 'lucide-react'
import type { CodingCase, TreatmentEvent } from '../types'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
}

const departmentColors: Record<string, string> = {
  Pneumologie: 'var(--department-1)',
  Intensivmedizin: 'var(--department-2)',
  Onkologie: 'var(--department-3)',
  Radiologie: 'var(--department-4)',
  Pathologie: 'var(--department-5)',
}

export function TreatmentRibbon({ codingCase, compact = false }: TreatmentRibbonProps) {
  const transitions = codingCase.timeline
    .slice()
    .sort((a, b) => a.day - b.day)
    .filter((event, index, events) => index === 0 || event.department !== events[index - 1].department)
  const segments = transitions.map((event, index) => ({
    department: event.department,
    start: event.day,
    end: Math.max(event.day, (transitions[index + 1]?.day ?? codingCase.stayDays + 1) - 1),
    intensive: event.type === 'Intensiv' || event.department === 'Intensivmedizin',
  }))
  const markers = codingCase.timeline.filter((event) => ['Diagnostik', 'Eingriff', 'Therapie', 'Intensiv'].includes(event.type))

  return (
    <div className={`treatment-ribbon ${compact ? 'is-compact' : ''}`} role="img" aria-label={ribbonDescription(codingCase)}>
      <div className="ribbon-axis"><span>Tag 1</span><strong>Behandlungsverlauf</strong><span>Tag {codingCase.stayDays}</span></div>
      <div className="ribbon-track">
        {segments.map((segment, index) => {
          const left = ((segment.start - 1) / codingCase.stayDays) * 100
          const width = ((segment.end - segment.start + 1) / codingCase.stayDays) * 100
          const style = { left: `${left}%`, width: `${width}%`, '--department-color': departmentColors[segment.department] ?? 'var(--department-neutral)' } as CSSProperties
          return <div className={`ribbon-segment ${segment.intensive ? 'is-intensive' : ''}`} style={style} key={`${segment.department}-${index}`}><span>{segment.department}</span></div>
        })}
        {markers.map((event) => <div className={`ribbon-marker marker-${event.type.toLowerCase()}`} style={{ left: `${Math.min(97, ((event.day - 1) / codingCase.stayDays) * 100)}%` }} key={event.id} aria-hidden="true"><EventIcon event={event} /><span>{event.label}</span></div>)}
      </div>
      {codingCase.technicalValues.length > 0 && (
        <div className="ribbon-technical" aria-label="Importierte technische Leistungen">
          {codingCase.technicalValues.map((value) => <span key={value.id}><ShieldAlert aria-hidden="true" />{value.code ?? value.label}{value.aggregateValue ? ` · ${value.aggregateValue} ${value.unit}` : ''}</span>)}
        </div>
      )}
      {!compact && <div className="ribbon-legend">{segments.map((segment) => <span key={segment.department}><i style={{ background: departmentColors[segment.department] ?? 'var(--department-neutral)' }} />{segment.department}{segment.intensive ? ' · Intensiv' : ''}</span>)}</div>}
    </div>
  )
}

function EventIcon({ event }: { event: TreatmentEvent }) {
  if (event.type === 'Eingriff') return <Scissors aria-hidden="true" />
  if (event.type === 'Diagnostik') return <Microscope aria-hidden="true" />
  if (event.type === 'Therapie') return <Pill aria-hidden="true" />
  if (event.type === 'Intensiv') return <Activity aria-hidden="true" />
  return <Cross aria-hidden="true" />
}

function ribbonDescription(codingCase: CodingCase) {
  return codingCase.timeline.map((event) => `Tag ${event.day}${event.endDay ? ` bis ${event.endDay}` : ''}: ${event.label}, ${event.department}`).join('. ')
}
