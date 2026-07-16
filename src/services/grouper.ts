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
    const hasSpecificPneumoniaCode = codingCase.codingEntries.some((entry) => {
      if (!entry.active || (entry.type !== 'HD' && entry.type !== 'ND')) return false
      const code = entry.code.toUpperCase()
      return code.startsWith('J12') || code.startsWith('J13') || code.startsWith('J14') || code.startsWith('J15') || code.startsWith('J16') || code.startsWith('J17') || code === 'B44.0'
    })
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
    if (hasPneumonia || hasSpecificPneumoniaCode) {
      drg = 'E79A · Demoalternative'
      reason = hasSpecificPneumoniaCode
        ? 'Spezifischer Pneumonie-Kode ergänzt; alternative DRG im Demopfad neu bewertet.'
        : 'Spezifische Pneumonie-Hypothese wurde im Demopfad bestätigt.'
      changed = true
    }
    if (trigger?.includes('ausgeschlossen')) {
      reason = 'Alternative ausgeschlossen; verbleibender DRG-Pfad stabilisiert.'
    }
    if (trigger?.includes('bestätigt') || trigger?.includes('korrigiert')) {
      reason = `${trigger}; technische Grouper-Eingabe aktualisiert.`
    }
    if (trigger?.startsWith('Kodierung') && !hasSpecificPneumoniaCode) {
      reason = `${trigger}; vollständige Kodierung neu gruppiert. Der DRG-Pfad bleibt in der Demo stabil.`
    }

    changed = codingCase.grouperRuns.at(-1)?.drg !== drg

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
