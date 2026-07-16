import type { CodingCase, GrouperRun } from '../types'

export interface GrouperClient {
  group(codingCase: CodingCase, trigger?: string): Promise<GrouperRun>
}

export class MockGrouperClient implements GrouperClient {
  async group(codingCase: CodingCase, trigger?: string): Promise<GrouperRun> {
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    const resolved = codingCase.decisions.filter((decision) => decision.status === 'belegt')
    const hasMainDiagnosis = resolved.some((decision) => decision.id.includes('main'))
    const hasTherapy = resolved.some((decision) => decision.id.includes('therapy'))
    const hasPneumonia = resolved.some((decision) => decision.id.includes('pneumonia'))
    const iteration = codingCase.grouperRuns.length + 1

    let drg = codingCase.scenario === 'standard' ? 'E77B · Demo' : 'E71B · Demo'
    let reason = 'Vorkodierung mit aktuellem Nachweisstand gruppiert.'
    let changed = false
    const extras: string[] = []

    if (hasMainDiagnosis) {
      drg = 'E71A · Demo'
      reason = 'Hauptdiagnose und führender Behandlungspfad wurden belegt.'
      changed = true
    }
    if (hasTherapy) {
      extras.push('ZE-Demo: systemische Tumortherapie geprüft')
      reason = 'Therapienachweis ergänzt; Zusatzentgelt-Prüfung aktualisiert.'
    }
    if (hasPneumonia) {
      drg = 'E79A · Demoalternative'
      reason = 'Spezifische Pneumonie-Hypothese wurde im Demopfad bestätigt.'
      changed = true
    }
    if (trigger?.includes('ausgeschlossen')) {
      reason = 'Alternative ausgeschlossen; verbleibender DRG-Pfad stabilisiert.'
    }
    if (trigger?.includes('bestätigt') || trigger?.includes('korrigiert')) {
      reason = `${trigger}; technische Grouper-Eingabe aktualisiert.`
    }

    return {
      id: `run-${codingCase.id}-${iteration}`,
      iteration,
      timestamp: new Date().toISOString(),
      drg,
      baseDrg: drg.slice(0, 3),
      pccL: hasMainDiagnosis ? 3 : 2,
      reason,
      changed,
      extras,
    }
  }
}
