import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { createDemoCase } from '../data/demo'
import { KisTransferMode } from './KisTransferMode'

describe('KisTransferMode', () => {
  afterEach(() => cleanup())

  it('bestätigt alle plausiblen KIS-Änderungen gesammelt', async () => {
    const codingCase = createDemoCase({
      caseNumber: 'P-2026-009999',
      hospitalId: 'h-marien',
      siteId: 'marien-mitte',
      year: 2026,
      age: 67,
      stayDays: 12,
      careForm: 'Normal- und Intensivstation',
      scenario: 'pulmo-onko',
      files: [],
      technicalValues: [{
        id: 'ventilation-test',
        kind: 'beatmung',
        label: 'Beatmungszeit',
        code: 'Beatmung',
        aggregateValue: 36,
        unit: 'Stunden',
        intervals: [{ start: '2026-07-05T08:00:00', end: '2026-07-06T20:00:00' }],
        source: 'Intensivkurve',
        status: 'korrigiert',
        groupingRelevant: true,
        documentRequired: true,
        note: '',
      }],
    })
    codingCase.codingEntries[1] = {
      ...codingCase.codingEntries[1],
      change: 'added',
      origin: 'tool-vorschlag',
    }
    const onConfirm = vi.fn()
    const user = userEvent.setup()

    render(<KisTransferMode codingCase={codingCase} onConfirm={onConfirm} />)

    const finalAction = screen.getByRole('button', { name: /Alle Änderungen als im KIS übernommen bestätigen/i })
    expect(finalAction).toBeEnabled()
    expect(screen.getAllByText('Beatmung').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ändern').length).toBeGreaterThan(0)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText(/Alle Positionen werden mit einem Klick gemeinsam bestätigt/i)).toBeInTheDocument()

    await user.click(finalAction)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith()
  })

  it('bietet keine ungespeicherten Einzelbestätigungen oder Ausnahmen an', () => {
    const codingCase = createDemoCase({
      caseNumber: 'P-2026-009998',
      hospitalId: 'h-marien',
      siteId: 'marien-mitte',
      year: 2026,
      age: 67,
      stayDays: 12,
      careForm: 'Normal- und Intensivstation',
      scenario: 'pulmo-onko',
      files: [],
    })
    codingCase.codingEntries[0] = { ...codingCase.codingEntries[0], change: 'changed' }
    codingCase.codingEntries[1] = { ...codingCase.codingEntries[1], change: 'added' }
    const onConfirm = vi.fn()
    render(<KisTransferMode codingCase={codingCase} onConfirm={onConfirm} />)

    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ausgewählte Änderungen/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Alle Änderungen als im KIS übernommen bestätigen/i })).toBeEnabled()
  })
})
