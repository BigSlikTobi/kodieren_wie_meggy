import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { createDemoCase } from '../data/demo'
import { KisTransferMode } from './KisTransferMode'

describe('KisTransferMode', () => {
  afterEach(() => cleanup())

  it('schaltet den Fallabschluss erst nach bestätigten KIS-Zeilen frei', async () => {
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

    const finalAction = screen.getByRole('button', { name: /KIS-Übernahme bestätigen und Fall abschließen/i })
    expect(finalAction).toBeDisabled()
    expect(screen.getAllByText('Beatmung').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ändern').length).toBeGreaterThan(0)

    for (const checkbox of screen.getAllByRole('checkbox', { name: /im KIS erledigt/i })) {
      await user.click(checkbox)
    }

    expect(finalAction).toBeEnabled()
    await user.click(finalAction)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0]).toHaveLength(2)
  })
})
