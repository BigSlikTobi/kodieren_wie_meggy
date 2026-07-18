import { Check, FileCheck2, Hospital, Route, Send } from 'lucide-react'

export type CaseJourneyPhase = 'kis' | 'basis' | 'hypothesis' | 'handoff'

interface CaseJourneyProps {
  active: CaseJourneyPhase
}

const phases: Array<{ id: CaseJourneyPhase; label: string; short: string; icon: typeof Hospital }> = [
  { id: 'kis', label: 'Fall im KIS öffnen', short: 'KIS-Start', icon: Hospital },
  { id: 'basis', label: 'Fallbasis bestätigen', short: 'Fallbasis', icon: FileCheck2 },
  { id: 'hypothesis', label: 'DRG gezielt prüfen', short: 'Prüfpfad', icon: Route },
  { id: 'handoff', label: 'Im KIS abschließen', short: 'KIS-Abschluss', icon: Send },
]

export function CaseJourney({ active }: CaseJourneyProps) {
  const activeIndex = phases.findIndex((phase) => phase.id === active)

  return (
    <nav className="case-journey" aria-label="Arbeitsweg vom KIS zum Fallabschluss">
      <ol>
        {phases.map((phase, index) => {
          const Icon = phase.icon
          const done = index < activeIndex
          const current = index === activeIndex
          return (
            <li className={done ? 'done' : current ? 'current' : ''} aria-current={current ? 'step' : undefined} key={phase.id}>
              <span className="case-journey-node">{done ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
              <span><small>{phase.short}</small><strong>{phase.label}</strong></span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
