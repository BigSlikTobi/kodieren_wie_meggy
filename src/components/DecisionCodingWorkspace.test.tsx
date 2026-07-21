import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import type { CaseDecision } from '../types'
import { DecisionCodingWorkspace, getCollaborationRoute } from './DecisionCodingWorkspace'

const baseDecision: CaseDecision = {
  id: 'decision-test',
  title: 'Gruppierungsrelevante Prozedur',
  description: 'Testentscheidung',
  impact: 'hoch',
  required: true,
  status: 'ungeklärt',
  requestedDocument: 'OP-Bericht',
  effect: 'Kann den DRG-Pfad verändern',
  groupingRelevance: 'relevant',
  knowledge: 'vertraut',
}

describe('Unterstützungsrouting', () => {
  afterEach(() => cleanup())

  it.each([
    ['vertraut', 'self'],
    ['unsicher', 'wiki'],
    ['fremd', 'consult'],
  ] as const)('ordnet %s dem Weg %s zu', (knowledge, expected) => {
    expect(getCollaborationRoute({ ...baseDecision, knowledge }).kind).toBe(expected)
  })

  it('empfiehlt nach dem Kodierwiki bei DRG-Relevanz eine Zweitmeinung', () => {
    const decision = { ...baseDecision, knowledge: 'unsicher' as const }

    render(
      <DecisionCodingWorkspace
        decision={decision}
        entries={[]}
        route={getCollaborationRoute(decision)}
        running={false}
        wikiStarted
        onKnowledgeChange={vi.fn()}
        onManualCoding={vi.fn()}
        onValidatePrecode={vi.fn()}
        onWiki={vi.fn()}
        onConsult={vi.fn()}
        onEvidenceUpload={vi.fn()}
        onComplete={vi.fn()}
        onExclude={vi.fn()}
      />,
    )

    expect(screen.getByText('Zweitmeinung empfohlen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zweitmeinung im Konsil/i })).toHaveClass('recommended')
    expect(screen.getByRole('button', { name: /Kodierwiki weiterfragen/i })).not.toHaveClass('recommended')
  })
})
