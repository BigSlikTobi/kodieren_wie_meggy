import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { createDemoCase } from '../data/demo'
import { CodingEntryDrawer } from './CodingEntryDrawer'

describe('CodingEntryDrawer document evidence', () => {
  afterEach(() => cleanup())

  it('speichert den Kode mit genau dem geöffneten Dokument als Beleg', async () => {
    const user = userEvent.setup()
    const codingCase = createDemoCase({
      caseNumber: 'P-2026-008818',
      hospitalId: 'h-marien',
      siteId: 'marien-mitte',
      year: 2026,
      age: 67,
      stayDays: 12,
      careForm: 'Normalstation',
      scenario: 'pulmo-onko',
      files: [],
    })
    const document = { ...codingCase.documentMap[0], id: 'document-exact', availability: 'vorhanden' as const }
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(<CodingEntryDrawer
      document={document}
      codingCase={codingCase}
      entries={codingCase.codingEntries}
      running={false}
      onClose={vi.fn()}
      onSave={onSave}
    />)

    await user.type(screen.getByRole('combobox', { name: /ICD-Code oder Begriff suchen/i }), 'Pneumonie')
    await user.click(screen.getByRole('option', { name: /J18\.9/i }))
    await user.click(screen.getByRole('button', { name: /Ergänzen und neu bewerten/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      evidenceDocumentId: 'document-exact',
      code: 'J18.9',
      description: expect.stringMatching(/Pneumonie/i),
    })))
  })
})
