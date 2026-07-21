import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { createDemoCase } from '../data/demo'
import { CollaborationDrawer } from './CollaborationDrawer'

describe('CollaborationDrawer document handoff', () => {
  afterEach(() => cleanup())

  it('übergibt genau das ausgewählte sichtbare Dokument an die Kodierung', async () => {
    const user = userEvent.setup()
    const codingCase = createDemoCase({
      caseNumber: 'P-2026-008817',
      hospitalId: 'h-marien',
      siteId: 'marien-mitte',
      year: 2026,
      age: 67,
      stayDays: 12,
      careForm: 'Normalstation',
      scenario: 'pulmo-onko',
      files: [],
    })
    const decision = codingCase.decisions[0]
    const template = codingCase.documentMap.find((document) => document.linkedDecisionId === decision.id)
      ?? codingCase.documentMap[0]
    codingCase.documentMap = [
      ...codingCase.documentMap.filter((document) => document.linkedDecisionId !== decision.id),
      { ...template, id: 'evidence-a', title: 'Entlassungsbericht', linkedDecisionId: decision.id, availability: 'vorhanden', priority: 'jetzt' },
      { ...template, id: 'evidence-b', title: 'Interventionsbericht', linkedDecisionId: decision.id, availability: 'vorhanden', priority: 'später' },
    ]
    codingCase.wikiThreads = [{
      id: 'wiki-test',
      decisionId: decision.id,
      title: decision.title,
      createdAt: '2026-07-21T08:00:00.000Z',
      messages: [{ id: 'message-test', author: 'Wiki-Assistent', text: 'Regelhinweis', createdAt: '2026-07-21T08:00:00.000Z' }],
    }]
    const onOpenCoding = vi.fn()

    render(<CollaborationDrawer
      mode="wiki"
      codingCase={codingCase}
      decision={decision}
      onClose={vi.fn()}
      onCreateConsultation={vi.fn()}
      onCompleteConsultation={vi.fn()}
      onSendWikiMessage={vi.fn()}
      onOpenCoding={onOpenCoding}
      focusDocumentId="evidence-a"
    />)

    await user.selectOptions(screen.getByLabelText(/Dokumentgrundlage auswählen/i), 'evidence-b')
    await user.click(screen.getByLabelText(/Hinweis und Dokumentation geprüft/i))
    await user.click(screen.getByRole('button', { name: /Zur Kodierentscheidung/i }))

    expect(onOpenCoding).toHaveBeenCalledWith('evidence-b')
  })
})
