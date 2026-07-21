import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDemoCase, demoBatchCases, demoHospitals } from '../data/demo'
import type { BatchCaseRecord, CodingCase, CodingConsultation } from '../types'
import { CasePool } from './CasePool'

afterEach(cleanup)

function codingCaseFor(record: BatchCaseRecord, overrides: Partial<CodingCase> = {}): CodingCase {
  const stayDays = Math.max(1, Math.round((new Date(record.dischargeDate).getTime() - new Date(record.admissionDate).getTime()) / 86_400_000) + 1)
  const codingCase = createDemoCase({
    caseNumber: record.caseNumber,
    hospitalId: record.hospitalId,
    siteId: record.siteId,
    year: record.year,
    admissionDate: record.admissionDate,
    dischargeDate: record.dischargeDate,
    age: record.age,
    stayDays,
    careForm: record.careForm,
    scenario: record.scenario,
    files: [],
    demoVariant: record.demoVariant,
  })
  return { ...codingCase, ...overrides }
}

function consultation(status: CodingConsultation['status'], decisionId = 'decision-main'): CodingConsultation {
  return {
    id: `consult-${status}`,
    decisionId,
    specialty: 'Kodierkonsil',
    question: 'Bitte prüfen',
    expert: 'Kodierexpertin',
    priority: 'normal',
    status,
    createdAt: '2026-07-21T08:00:00.000Z',
    ...(status === 'abgeschlossen' ? { result: 'bestätigt' as const, finding: 'Kodierung bestätigt.' } : {}),
  }
}

describe('CasePool V28', () => {
  it('bildet aktionsorientierte Arbeitslisten mit sichtbaren Trefferzahlen', async () => {
    const user = userEvent.setup()
    const records = demoBatchCases.slice(0, 5)
    const quick = codingCaseFor(records[0], { intakeConfirmed: true, difficulty: 'einfach', decisions: [] })
    const answered = codingCaseFor(records[1], { intakeConfirmed: true, consultations: [consultation('abgeschlossen')] })
    const waiting = codingCaseFor(records[2], { intakeConfirmed: true, consultations: [consultation('in Bearbeitung')] })
    const completed = codingCaseFor(records[3], {
      intakeConfirmed: true,
      status: 'abgeschlossen',
      kisTransferConfirmedAt: '2026-07-21T09:30:00.000Z',
    })

    render(
      <CasePool
        cases={records}
        codingCases={[quick, answered, waiting, completed]}
        hospitals={demoHospitals}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Alle Fälle: 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schnell abschließbar: 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Konsilantwort eingegangen: 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wartet auf Konsil: 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fallbasis ergänzen: 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bereit für KIS-Übernahme: 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abgeschlossen: 1' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Konsilantwort eingegangen: 1' }))
    const list = screen.getByRole('region', { name: 'Verfügbare Fälle' })
    expect(within(list).getByText(records[1].caseNumber)).toBeInTheDocument()
    expect(within(list).queryByText(records[0].caseNumber)).not.toBeInTheDocument()
    expect(within(list).getByRole('button', { name: /Konsilantwort prüfen/i })).toBeInTheDocument()
  })

  it('zeigt abgeschlossene Fälle nicht mehr als fortzusetzenden Prüfpfad', async () => {
    const user = userEvent.setup()
    const record = demoBatchCases[0]
    const completed = codingCaseFor(record, {
      intakeConfirmed: true,
      status: 'abgeschlossen',
      kisTransferConfirmedAt: '2026-07-21T09:30:00.000Z',
    })
    const onOpen = vi.fn()

    render(
      <CasePool
        cases={[record]}
        codingCases={[completed]}
        hospitals={demoHospitals}
        onOpen={onOpen}
        onCreate={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Abgeschlossen: 1' }))
    const list = screen.getByRole('region', { name: 'Verfügbare Fälle' })
    expect(within(list).getByText('Abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Prüfpfad fortsetzen/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Abschluss ansehen/i }))
    expect(onOpen).toHaveBeenCalledWith(record)
  })

  it('nimmt auch manuell angelegte Fälle in die Übersicht auf', () => {
    const manual = codingCaseFor(demoBatchCases[0], {
      id: 'manual-case',
      caseNumber: 'MANUELL-2026-17',
      intakeConfirmed: false,
    })

    render(
      <CasePool
        cases={[]}
        codingCases={[manual]}
        hospitals={demoHospitals}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByText('MANUELL-2026-17')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fallbasis fortsetzen/i })).toBeInTheDocument()
    expect(screen.getByText('0 Fälle aus dem Demo-Batch')).toBeInTheDocument()
  })

  it('wendet für schnell abschließbare Fälle dieselben Sperren wie der Fallabschluss an', () => {
    const decisionBlocked = codingCaseFor(demoBatchCases[0], {
      intakeConfirmed: true,
      difficulty: 'einfach',
      decisions: codingCaseFor(demoBatchCases[0]).decisions.map((decision, index) => (
        index === 0 ? { ...decision, required: true, status: 'wahrscheinlich' as const } : decision
      )),
      technicalValues: [],
    })
    const technicalBlocked = codingCaseFor(demoBatchCases[1], {
      intakeConfirmed: true,
      difficulty: 'einfach',
      decisions: [],
      technicalValues: demoBatchCases[1].technicalValues,
    })

    render(
      <CasePool
        cases={demoBatchCases.slice(0, 2)}
        codingCases={[decisionBlocked, technicalBlocked]}
        hospitals={demoHospitals}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Schnell abschließbar: 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In Bearbeitung: 2' })).toBeInTheDocument()
  })

  it('führt tool-geprüfte Fälle als direkt zur KIS-Übernahme bereit', async () => {
    const user = userEvent.setup()
    const record = demoBatchCases[0]
    const readyForKis = codingCaseFor(record, {
      intakeConfirmed: true,
      difficulty: 'schwierig',
      status: 'tool-geprüft',
    })
    const onOpen = vi.fn()

    render(
      <CasePool
        cases={[record]}
        codingCases={[readyForKis]}
        hospitals={demoHospitals}
        onOpen={onOpen}
        onCreate={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Bereit für KIS-Übernahme: 1' }))
    const list = screen.getByRole('region', { name: 'Verfügbare Fälle' })
    expect(within(list).getByText('Bereit für KIS-Übernahme')).toBeInTheDocument()
    await user.click(within(list).getByRole('button', { name: /KIS-Übernahme öffnen/i }))
    expect(onOpen).toHaveBeenCalledWith(record)
  })

  it('entfernt eine Konsilantwort aus der Arbeitsliste, sobald ihre Entscheidung gelöst ist', () => {
    const record = demoBatchCases[0]
    const base = codingCaseFor(record)
    const resolvedDecisionId = base.decisions[0].id
    const resolved = {
      ...base,
      intakeConfirmed: true,
      difficulty: 'schwierig' as const,
      decisions: base.decisions.map((decision) => (
        decision.id === resolvedDecisionId ? { ...decision, status: 'belegt' as const } : decision
      )),
      consultations: [consultation('abgeschlossen', resolvedDecisionId)],
    }

    render(
      <CasePool
        cases={[record]}
        codingCases={[resolved]}
        hospitals={demoHospitals}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Konsilantwort eingegangen: 0' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Konsilantwort prüfen/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prüfpfad fortsetzen/i })).toBeInTheDocument()
  })

  it('trennt identische Fallnummern verschiedener Häuser und Standorte', () => {
    const first = demoBatchCases[0]
    const secondTemplate = demoBatchCases.find((record) => record.hospitalId !== first.hospitalId)!
    const second = { ...secondTemplate, id: 'duplicate-number-other-hospital', caseNumber: first.caseNumber }
    const completedSecond = codingCaseFor(second, {
      status: 'abgeschlossen',
      kisTransferConfirmedAt: '2026-07-21T09:30:00.000Z',
    })

    render(
      <CasePool
        cases={[first, second]}
        codingCases={[completedSecond]}
        hospitals={demoHospitals}
        onOpen={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Alle Fälle: 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abgeschlossen: 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fallbasis ergänzen: 1' })).toBeInTheDocument()
  })
})
