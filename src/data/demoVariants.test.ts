import { describe, expect, it } from 'vitest'
import { createDemoCase, demoBatchCases } from './demo'

describe('synthetische Usertest-Fälle', () => {
  it('stellt zwölf unterschiedliche Fälle im Pool bereit', () => {
    expect(demoBatchCases).toHaveLength(12)
    expect(new Set(demoBatchCases.map((record) => record.department)).size).toBeGreaterThanOrEqual(9)
  })

  it('verknüpft jedes vorhandene Dokument mit einem lesbaren Demotext', () => {
    for (const record of demoBatchCases) {
      const stayDays = Math.round((new Date(`${record.dischargeDate}T12:00:00`).getTime() - new Date(`${record.admissionDate}T12:00:00`).getTime()) / 86_400_000) + 1
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
        files: ['Entlassungsbericht.pdf', 'KIS-Kodierexport.csv'],
        technicalValues: record.technicalValues,
        demoVariant: record.demoVariant,
      })

      for (const mapItem of codingCase.documentMap.filter((item) => item.availability === 'vorhanden')) {
        const source = codingCase.documents.find((document) => document.id === mapItem.sourceDocumentId)
        expect(source, `${record.caseNumber}: ${mapItem.title}`).toBeDefined()
        expect(source?.previewText?.length, `${record.caseNumber}: ${mapItem.title}`).toBeGreaterThan(80)
      }
      expect(codingCase.grouperRuns[0].lengthOfStay.meanDays, `${record.caseNumber}: Verweildauerprofil`).toBeGreaterThan(0)
    }
  })

  it('bildet den Hochkomplexfall mit 50 ICD- und 30 OPS-Zeilen ab', () => {
    const record = demoBatchCases.find((item) => item.demoVariant === 'high-volume')!
    const codingCase = createDemoCase({
      caseNumber: record.caseNumber,
      hospitalId: record.hospitalId,
      siteId: record.siteId,
      year: record.year,
      admissionDate: record.admissionDate,
      dischargeDate: record.dischargeDate,
      age: record.age,
      stayDays: 26,
      careForm: record.careForm,
      scenario: record.scenario,
      files: ['Gesamtbericht.pdf', 'KIS-Kodierexport.csv'],
      demoVariant: record.demoVariant,
    })

    expect(codingCase.codingEntries.filter((entry) => entry.type !== 'OPS')).toHaveLength(50)
    expect(codingCase.codingEntries.filter((entry) => entry.type === 'OPS')).toHaveLength(30)
  })
})
