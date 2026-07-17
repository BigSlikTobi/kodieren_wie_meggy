import { describe, expect, it, vi } from 'vitest'
import { createDemoCase } from '../data/demo'
import { MockGrouperClient } from './grouper'

describe('MockGrouperClient', () => {
  it('erzeugt einen neuen Lauf ohne alte Läufe zu verändern', async () => {
    vi.useFakeTimers()
    const codingCase = createDemoCase({
      hospitalId: 'h-marien',
      siteId: 'marien-mitte',
      year: 2026,
      age: 67,
      stayDays: 22,
      careForm: 'Normalstation',
      scenario: 'pulmo-onko',
      files: ['arztbrief.pdf'],
    })
    codingCase.decisions = codingCase.decisions.map((decision) => decision.id === 'decision-main' ? { ...decision, status: 'belegt' } : decision)
    const client = new MockGrouperClient()
    const resultPromise = client.group(codingCase, 'decision-main')
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.iteration).toBe(2)
    expect(result.changed).toBe(true)
    expect(result.lengthOfStay).toMatchObject({ catalogYear: 2026, meanDays: 14.3, lowerFirstDiscountDay: 4, upperFirstSurchargeDay: 29 })
    expect(codingCase.grouperRuns).toHaveLength(1)
    vi.useRealTimers()
  })
})
