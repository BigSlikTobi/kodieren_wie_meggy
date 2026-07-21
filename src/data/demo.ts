import type { AppData, BatchCaseRecord, CaseDocument, CodingCase, CodingEntry, DocumentOutcomeDimensions, HospitalProfile, KisGuide, NewCaseInput, OutcomeDimensionStatus, RuleDefinition, TechnicalCaseValue } from '../types'
import { getDrgLengthOfStayProfile } from './drgCatalog'
import { applyDemoVariant, attachReadableDemoDocuments } from './demoVariants'

const isoNow = () => new Date().toISOString()

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function demoDocumentPreview(name: string, isComplex: boolean) {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('kodier') || /\.(csv|xls|xlsx)$/i.test(name)) {
    return 'KIS-Kodierexport\n\nHauptdiagnose: aus dem Primärsystem übernommen.\n\nNebendiagnosen und Prozeduren: Ausgangsstand vor der fallbezogenen Prüfung.\n\nDiese Liste ist die Referenz für alle späteren Änderungen.'
  }
  if (isComplex) {
    return 'Entlassungsbericht\n\nAufnahmegrund: stationäre Abklärung eines suspekten thorakalen Befundes.\n\nIm Verlauf erfolgten CT-Thorax, Bronchoskopie mit Biopsie und histologische Sicherung. Die Hauptdiagnose wurde im Gesamtfall onkologisch geführt.\n\nNach Verlegung in die Onkologie wurde eine systemische Tumortherapie begonnen. Therapieart und Dosis sind im gesonderten Medikationsnachweis zu prüfen.\n\nEntlassung nach klinischer Stabilisierung mit ambulanter onkologischer Weiterbehandlung.'
  }
  return 'Entlassungsbericht\n\nAufnahmegrund: Fieber, Husten und Dyspnoe bei radiologischem Infiltrat.\n\nHauptdiagnose: Pneumonie, nicht näher bezeichnet. Kein belastbarer spezifischer Erregernachweis.\n\nKonservative Therapie mit klinischer Besserung. Keine invasive Prozedur und kein Fachabteilungswechsel.\n\nEntlassung in stabilem Allgemeinzustand.'
}

const dimensions = (
  drg: OutcomeDimensionStatus,
  ops: OutcomeDimensionStatus,
  entgelte: OutcomeDimensionStatus,
  kodierung: OutcomeDimensionStatus,
  mbeg: OutcomeDimensionStatus,
): DocumentOutcomeDimensions => ({ drg, ops, entgelte, kodierung, mbeg })

function createKisGuides(site: string): KisGuide[] {
  return [
    {
      id: `kis-${site}-arztbrief`,
      documentKind: 'Arztbrief / Verlaufsbericht',
      module: 'Klinische Dokumentation',
      navigationPath: ['Patientenakte', 'Dokumente', 'Arztbriefe'],
      searchTerm: 'Entlassungsbericht',
      instruction: 'Nach Fachabteilung filtern. Verlegungs- und Entlassungsberichte gemeinsam prüfen.',
      notes: 'Am Standort werden Aufenthaltsteile 1 und 3 häufig in einem Bericht zusammengeführt.',
      validFrom: '2026-01-01',
      reviewedAt: '2026-01-12',
      owner: 'Projektleitung Demo',
      screenshots: [{ id: `screen-${site}-arztbrief`, fileName: 'kis_arztbrief_demo.png', caption: 'Dokumentenfilter und Fachabteilungsauswahl · schematische Demo' }],
    },
    {
      id: `kis-${site}-intervention`,
      documentKind: 'OP- / Interventionsbericht',
      module: 'Befundportal',
      navigationPath: ['Patientenakte', 'Befunde', 'Interventionen'],
      searchTerm: 'Bronchoskopie',
      instruction: 'Ereignisdatum wählen. Finalen Befund öffnen, nicht nur den Untersuchungsauftrag.',
      notes: 'Vorläufige Befunde sind mit einem grauen Punkt markiert.',
      validFrom: '2026-01-01',
      reviewedAt: '2026-01-10',
      owner: 'Projektleitung Demo',
      screenshots: [{ id: `screen-${site}-intervention`, fileName: 'kis_intervention_demo.png', caption: 'Finalstatus und Befundaufruf · schematische Demo' }],
    },
    {
      id: `kis-${site}-medikation`,
      documentKind: 'Medikation / Therapienachweis',
      module: 'Kurve und Medikation',
      navigationPath: ['Patientenakte', 'Kurve', 'Verabreichte Medikation'],
      searchTerm: 'Applikationsnachweis',
      instruction: 'Zeitraum des Fachabteilungsaufenthalts einstellen und verabreichte statt angeordnete Medikation exportieren.',
      notes: 'Dosisdetails stehen im aufklappbaren Applikationsprotokoll.',
      validFrom: '2026-01-01',
      reviewedAt: '2026-01-14',
      owner: 'Onkologie-Koordination Demo',
      screenshots: [{ id: `screen-${site}-medikation`, fileName: 'kis_medikation_demo.png', caption: 'Applikationsprotokoll und Zeitraum · schematische Demo' }],
    },
    {
      id: `kis-${site}-intensiv`,
      documentKind: 'Intensivkurve / Überwachungsnachweis',
      module: 'PDMS',
      navigationPath: ['Patientenakte', 'Externe Systeme', 'Intensivkurve'],
      searchTerm: 'Tageskurve',
      instruction: 'Tageskurven und Organersatzverfahren für den gesamten Intensivzeitraum exportieren.',
      notes: 'Kann für OPS und die medizinische Begründung der vollstationären Behandlung relevant sein.',
      validFrom: '2026-01-01',
      reviewedAt: '2026-01-09',
      owner: 'Intensiv-Team Demo',
      screenshots: [{ id: `screen-${site}-intensiv`, fileName: 'kis_intensivkurve_demo.png', caption: 'Absprung ins PDMS · schematische Demo' }],
    },
  ]
}

export const demoHospitals: HospitalProfile[] = [
  {
    id: 'h-marien',
    name: 'Klinikum St. Marien',
    city: 'Köln',
    profiles: [
      {
        siteId: 'marien-mitte',
        siteName: 'Standort Mitte',
        year: 2026,
        structures: ['Intensivmedizin', 'Palliativmedizin', 'Onkologisches Zentrum', 'Bronchoskopie'],
        nubs: ['NUB-Demo 01 · Antimykotikum', 'NUB-Demo 04 · Onkologischer Wirkstoff'],
        historicalCases: 12840,
        updatedAt: '2026-01-09',
        dataQuality: 'vollständig',
        uploadedFiles: ['strukturmerkmale_2026.xls', 'nub_vereinbarungen_2026.xls', 'historie_2024_2025.xls'],
        kisGuides: createKisGuides('marien-mitte'),
      },
      {
        siteId: 'marien-nord',
        siteName: 'Standort Nord',
        year: 2026,
        structures: ['Intensivmedizin', 'Geriatrische Komplexbehandlung'],
        nubs: ['NUB-Demo 02 · Gerinnungspräparat'],
        historicalCases: 7240,
        updatedAt: '2026-01-11',
        dataQuality: 'prüfen',
        uploadedFiles: ['strukturmerkmale_2026.xls', 'nub_vereinbarungen_2026.xls'],
        kisGuides: createKisGuides('marien-nord'),
      },
      {
        siteId: 'marien-mitte',
        siteName: 'Standort Mitte',
        year: 2025,
        structures: ['Intensivmedizin', 'Palliativmedizin', 'Onkologisches Zentrum', 'Bronchoskopie'],
        nubs: ['NUB-Demo 01 · Antimykotikum'],
        historicalCases: 11990,
        updatedAt: '2025-01-08',
        dataQuality: 'vollständig',
        uploadedFiles: ['strukturmerkmale_2025.xls', 'nub_vereinbarungen_2025.xls', 'historie_2023_2024.xls'],
        kisGuides: createKisGuides('marien-mitte-2025'),
      },
    ],
  },
  {
    id: 'h-hanse',
    name: 'Hanse-Kliniken',
    city: 'Hamburg',
    profiles: [
      {
        siteId: 'hanse-west',
        siteName: 'Campus West',
        year: 2026,
        structures: ['Intensivmedizin', 'Herzchirurgie', 'Neurologische Komplexbehandlung'],
        nubs: ['NUB-Demo 06 · Implantat'],
        historicalCases: 18310,
        updatedAt: '2026-01-15',
        dataQuality: 'vollständig',
        uploadedFiles: ['struktur_2026.xls', 'nubs_2026.xls', 'historische_faelle.xls'],
        kisGuides: createKisGuides('hanse-west'),
      },
      {
        siteId: 'hanse-ost',
        siteName: 'Campus Ost',
        year: 2025,
        structures: ['Intensivmedizin', 'Stroke Unit'],
        nubs: [],
        historicalCases: 9310,
        updatedAt: '2025-02-02',
        dataQuality: 'prüfen',
        uploadedFiles: ['struktur_2025.xls'],
        kisGuides: createKisGuides('hanse-ost'),
      },
    ],
  },
]

const ventilationIntervals: TechnicalCaseValue = {
  id: 'tech-ventilation-intervals',
  kind: 'beatmung',
  label: 'Beatmungszeit aus Intervallen',
  aggregateValue: 96,
  unit: 'Stunden',
  intervals: [
    { start: '2026-07-10T11:00', end: '2026-07-12T15:00' },
    { start: '2026-07-13T08:00', end: '2026-07-15T04:00' },
  ],
  source: 'Strukturierter PDMS-Import · Demo',
  status: 'importiert',
  groupingRelevant: true,
  documentRequired: false,
  note: 'Die Summe wird aus gelieferten Intervallen gebildet. Keine Beatmungskurve hochladen.',
}

const isolationProcedure: TechnicalCaseValue = {
  id: 'tech-isolation',
  kind: 'isolation',
  label: 'Non-MRE-Isolation auf nicht spezieller Isoliereinheit',
  code: '8-98g.11 · illustrative Demoangabe',
  aggregateValue: 8,
  unit: 'Tage',
  intervals: [{ start: '2026-07-10T00:00', end: '2026-07-17T23:59' }],
  source: 'Strukturierter Leistungsimport · Demo',
  status: 'importiert',
  groupingRelevant: true,
  documentRequired: false,
  note: 'OPS und Zeitraum wurden fertig geliefert. Jahres- und Strukturprüfung bleiben aktiv.',
}

export const demoBatchCases: BatchCaseRecord[] = [
  {
    id: 'batch-4218',
    caseNumber: 'P-2026-004218',
    hospitalId: 'h-marien',
    siteId: 'marien-mitte',
    year: 2026,
    admissionDate: '2026-07-02',
    dischargeDate: '2026-07-24',
    age: 67,
    careForm: 'Normalstation',
    scenario: 'pulmo-onko',
    department: 'Pneumologie → Onkologie',
    codingSummary: 'C34.9 · 1-6xx · 8-54x · illustrative Demodaten',
    importStatus: 'bereit',
    technicalValues: [isolationProcedure],
  },
  {
    id: 'batch-4233',
    caseNumber: 'P-2026-004233',
    hospitalId: 'h-hanse',
    siteId: 'hanse-west',
    year: 2026,
    admissionDate: '2026-07-08',
    dischargeDate: '2026-07-22',
    age: 72,
    careForm: 'Normal- und Intensivstation',
    scenario: 'pulmo-onko',
    department: 'Pneumologie → Intensivmedizin → Onkologie',
    codingSummary: 'Beatmungsstunden und Intensivaufenthalt vorkodiert · Demo',
    importStatus: 'unvollständig',
    technicalValues: [ventilationIntervals],
  },
  {
    id: 'batch-4251',
    caseNumber: 'P-2026-004251',
    hospitalId: 'h-marien',
    siteId: 'marien-mitte',
    year: 2026,
    admissionDate: '2026-07-14',
    dischargeDate: '2026-07-20',
    age: 49,
    careForm: 'Normalstation',
    scenario: 'standard',
    department: 'Pneumologie',
    codingSummary: 'J18.9 · konservativer Verlauf · illustrative Demodaten',
    importStatus: 'bereit',
    technicalValues: [],
  },
  {
    id: 'batch-4301', caseNumber: 'P-2026-004301', hospitalId: 'h-marien', siteId: 'marien-nord', year: 2026,
    admissionDate: '2026-07-01', dischargeDate: '2026-07-08', age: 82, careForm: 'Normalstation', scenario: 'standard',
    department: 'Notaufnahme → Unfallchirurgie', codingSummary: 'S72.0 · operative Frakturversorgung · OP-Bericht fehlt · Demo', importStatus: 'unvollständig', technicalValues: [], demoVariant: 'hip-fracture',
  },
  {
    id: 'batch-4314', caseNumber: 'P-2026-004314', hospitalId: 'h-hanse', siteId: 'hanse-west', year: 2026,
    admissionDate: '2026-07-03', dischargeDate: '2026-07-09', age: 76, careForm: 'Normalstation', scenario: 'standard',
    department: 'Kardiologie → Überwachung', codingSummary: 'I25.12 · Herzkatheter · mehrere OPS-Ausprägungen · Demo', importStatus: 'bereit', technicalValues: [], demoVariant: 'cardiology-intervention',
  },
  {
    id: 'batch-4327', caseNumber: 'P-2026-004327', hospitalId: 'h-marien', siteId: 'marien-mitte', year: 2026,
    admissionDate: '2026-07-05', dischargeDate: '2026-07-09', age: 34, careForm: 'Normalstation', scenario: 'standard',
    department: 'Notaufnahme → Allgemeinchirurgie', codingSummary: 'K35.8 · Appendektomie · früher Abschluss erwartet · Demo', importStatus: 'bereit', technicalValues: [], demoVariant: 'appendicitis',
  },
  {
    id: 'batch-4340', caseNumber: 'P-2026-004340', hospitalId: 'h-hanse', siteId: 'hanse-west', year: 2026,
    admissionDate: '2026-07-06', dischargeDate: '2026-07-19', age: 69, careForm: 'Normal- und Intensivstation', scenario: 'standard',
    department: 'Innere Medizin → Intensivmedizin', codingSummary: 'Beatmungszeit widersprüchlich · Organersatz · Demo', importStatus: 'bereit', technicalValues: [ventilationIntervals], demoVariant: 'ventilation-conflict',
  },
  {
    id: 'batch-4352', caseNumber: 'P-2026-004352', hospitalId: 'h-hanse', siteId: 'hanse-west', year: 2026,
    admissionDate: '2026-07-07', dischargeDate: '2026-07-16', age: 71, careForm: 'Normalstation', scenario: 'standard',
    department: 'Notaufnahme → Stroke Unit', codingSummary: 'I63.9 · Zeitfenster und Komplexbehandlung prüfen · Demo', importStatus: 'bereit', technicalValues: [], demoVariant: 'stroke-time-window',
  },
  {
    id: 'batch-4366', caseNumber: 'P-2026-004366', hospitalId: 'h-marien', siteId: 'marien-mitte', year: 2026,
    admissionDate: '2026-07-09', dischargeDate: '2026-07-12', age: 55, careForm: 'Normalstation', scenario: 'standard',
    department: 'Urologie', codingSummary: 'N20.1 · Standardpfad · keine Änderung erwartet · Demo', importStatus: 'bereit', technicalValues: [], demoVariant: 'urology-standard',
  },
  {
    id: 'batch-4381', caseNumber: 'P-2026-004381', hospitalId: 'h-hanse', siteId: 'hanse-west', year: 2026,
    admissionDate: '2026-07-10', dischargeDate: '2026-08-04', age: 79, careForm: 'Normal- und Intensivstation', scenario: 'standard',
    department: 'Herzchirurgie → Intensivmedizin → Kardiologie', codingSummary: '50 ICD · 30 OPS · pfadbestimmende Merkmale priorisieren · Demo', importStatus: 'bereit', technicalValues: [ventilationIntervals], demoVariant: 'high-volume',
  },
  {
    id: 'batch-4395', caseNumber: 'P-2026-004395', hospitalId: 'h-marien', siteId: 'marien-nord', year: 2026,
    admissionDate: '2026-07-11', dischargeDate: '2026-07-27', age: 88, careForm: 'Normalstation', scenario: 'standard',
    department: 'Unfallchirurgie → Geriatrie', codingSummary: '8-550.x · Mindestmerkmalsnachweis fehlt · Demo', importStatus: 'unvollständig', technicalValues: [], demoVariant: 'geriatrics-proof',
  },
  {
    id: 'batch-4408', caseNumber: 'P-2026-004408', hospitalId: 'h-marien', siteId: 'marien-mitte', year: 2026,
    admissionDate: '2026-07-12', dischargeDate: '2026-07-23', age: 63, careForm: 'Normal- und Intensivstation', scenario: 'standard',
    department: 'Innere Medizin → Intensivmedizin', codingSummary: 'A41.9 · Erregerbezug und Organdysfunktion prüfen · Demo', importStatus: 'bereit', technicalValues: [], demoVariant: 'sepsis-pathogen',
  },
]

export const demoRules: RuleDefinition[] = [
  {
    id: 'rule-mbeg-intensity',
    name: 'Vollstationäre Behandlungsintensität begründen',
    type: 'Medizinische Begründung',
    status: 'Freigegeben',
    year: 2026,
    scope: 'Alle Krankenhäuser',
    naturalText: 'Eine medizinische Begründung nur aus belegten fallbezogenen Tatsachen erstellen. Organersatz, invasive Diagnostik, engmaschige Überwachung und nicht ambulant durchführbare Therapien können die vollstationäre Behandlung begründen. Ambulante oder teilstationäre Alternativen müssen konkret gegen den dokumentierten Bedarf abgegrenzt werden.',
    trigger: 'Im Fallabschluss wird optional eine medizinische Begründung benötigt.',
    conditions: ['Mindestens ein belastbarer stationärer Behandlungsgrund ist belegt', 'Jede Aussage verweist auf ein vorhandenes Dokument oder Ereignis', 'Eine weniger intensive Versorgungsform ist konkret abgegrenzt'],
    exclusions: ['Reine Vermutungen', 'Nicht dokumentierte Risiken', 'Automatische Übermittlung ohne menschliche Freigabe'],
    evidence: ['Verlaufsbericht', 'Interventions- oder OP-Bericht', 'Intensivkurve', 'Therapie- und Überwachungsnachweis'],
    reaction: 'Beleggebundenen Entwurf anzeigen, fehlende Nachweise nennen oder die Erstellung als nicht belastbar stoppen.',
    impactTest: { affectedCases: 236, changedSuggestions: 41, changedDrgs: 0 },
  },
  {
    id: 'rule-pneumonia',
    name: 'Spezifische Pneumonie absichern',
    type: 'Medizinische Plausibilität',
    status: 'Freigegeben',
    year: 2026,
    scope: 'Alle Krankenhäuser',
    naturalText:
      'Eine spezifische Pneumonie nur vorschlagen, wenn eine passende Bildgebung vorliegt. Einen Keim nur berücksichtigen, wenn der Befund über der definierten Kontaminationsgrenze liegt und ärztlich zugeordnet wurde.',
    trigger: 'Spezifischer oder erregerspezifischer Pneumonie-Kode wird geprüft.',
    conditions: [
      'Passende Bildgebung ist dokumentiert',
      'Mikrobiologischer Befund liegt oberhalb der definierten Grenze',
      'Ärztlicher Zusammenhang zur Pneumonie ist dokumentiert',
    ],
    exclusions: ['Befund spricht nur für Kolonisation oder Kontamination'],
    evidence: ['Radiologiebefund', 'Mikrobiologie', 'Ärztliche Bewertung'],
    reaction: 'Kode vorschlagen, Nachweis anfordern oder Alternative ausschließen.',
    impactTest: { affectedCases: 84, changedSuggestions: 12, changedDrgs: 3 },
  },
  {
    id: 'rule-year',
    name: 'Regelpaket nach Behandlungsjahr',
    type: 'Offizielle Regel',
    status: 'Freigegeben',
    year: 2026,
    scope: 'Alle Krankenhäuser',
    naturalText: 'Für jeden Fall ist das zum maßgeblichen Behandlungsjahr passende Regelpaket anzuwenden.',
    trigger: 'Ein Fall wird angelegt oder das Behandlungsjahr geändert.',
    conditions: ['Jahr und Standort sind vorhanden'],
    exclusions: [],
    evidence: ['Falldaten', 'Regelpaket-Version'],
    reaction: 'Passende ICD-, OPS-, DKR- und Entgeltversion aktivieren.',
  },
  {
    id: 'rule-history',
    name: 'Historische Kodierung nur als Erwartung',
    type: 'Interner Standard',
    status: 'Geprüft',
    year: 2026,
    scope: 'Alle Krankenhäuser',
    naturalText: 'Historische Kodierungen dürfen Hypothesen priorisieren, aber niemals einen Fallnachweis ersetzen.',
    trigger: 'Historische Vergleichsfälle werden für eine Hypothese genutzt.',
    conditions: ['Aktueller Fall wird unabhängig belegt'],
    exclusions: [],
    evidence: ['Falldokumentation'],
    reaction: 'Historische Daten als Hinweis kennzeichnen.',
  },
]

export function createDemoCase(input: NewCaseInput): CodingCase {
  const id = `case-${Date.now()}`
  const isComplex = input.scenario === 'pulmo-onko'
  const admissionDate = input.admissionDate ?? `${input.year}-07-02`
  const dischargeDate = input.dischargeDate ?? addDays(admissionDate, input.stayDays - 1)
  const selectedProfile = demoHospitals
    .find((hospital) => hospital.id === input.hospitalId)
    ?.profiles.find((profile) => profile.siteId === input.siteId && profile.year === input.year)
  const supportsPulmoOnkoPath = Boolean(
    selectedProfile?.structures.includes('Onkologisches Zentrum') &&
    selectedProfile.structures.includes('Bronchoskopie'),
  )
  const hospitalTypicality = !isComplex || supportsPulmoOnkoPath ? 'typisch' as const : 'untypisch' as const
  const generatedTimeline = isComplex
    ? [
        { id: 't1', day: 1, time: '09:15', department: 'Pneumologie', type: 'Aufnahme' as const, label: 'Aufnahme mit thorakalem Befund', linkedDocumentIds: ['map-pulmo-report', 'map-precode'] },
        { id: 't2', day: 2, time: '10:30', department: 'Pneumologie', type: 'Diagnostik' as const, label: 'CT-Thorax und Befundbewertung', linkedDocumentIds: ['map-pulmo-report', 'map-microbiology'] },
        { id: 't3', day: 3, time: '08:45', department: 'Pneumologie', type: 'Eingriff' as const, label: 'Bronchoskopische Biopsie', linkedDocumentIds: ['map-bronchoscopy'] },
        { id: 't4', day: 4, time: '11:20', department: 'Pneumologie', type: 'Diagnostik' as const, label: 'Endosonografisches Staging', linkedDocumentIds: [] },
        { id: 't5', day: 6, time: '09:10', department: 'Pneumologie', type: 'Eingriff' as const, label: 'Erweiterte Gewebeentnahme', linkedDocumentIds: ['map-bronchoscopy'] },
        ...(input.careForm === 'Normal- und Intensivstation'
          ? [{ id: 't-intensive', day: 4, endDay: 7, time: '14:00', department: 'Intensivmedizin', type: 'Intensiv' as const, label: 'Intensivmedizinische Behandlung', linkedDocumentIds: [] }]
          : []),
        { id: 't6', day: 7, time: '15:30', department: 'Pathologie', type: 'Diagnostik' as const, label: 'Histologischer Tumornachweis', linkedDocumentIds: ['map-histology'] },
        { id: 't7', day: 9, time: '13:00', department: 'Onkologie', type: 'Verlegung' as const, label: 'Verlegung nach Histologie', linkedDocumentIds: ['map-oncology-report'] },
        { id: 't8', day: 10, time: '08:15', department: 'Onkologie', type: 'Eingriff' as const, label: 'Portimplantation', linkedDocumentIds: [] },
        { id: 't9', day: 11, endDay: 13, time: '10:00', department: 'Onkologie', type: 'Therapie' as const, label: 'Erster Zyklus systemische Tumortherapie', linkedDocumentIds: ['map-oncology-report', 'map-therapy-proof'] },
        { id: 't10', day: 14, time: '09:40', department: 'Onkologie', type: 'Diagnostik' as const, label: 'Therapiekontrolle und Restaging', linkedDocumentIds: ['map-oncology-report'] },
        { id: 't11', day: Math.min(16, Math.max(1, input.stayDays - 2)), time: '12:10', department: 'Onkologie', type: 'Therapie' as const, label: 'Supportive Transfusionstherapie', linkedDocumentIds: ['map-therapy-proof'] },
        { id: 't12', day: Math.min(20, input.stayDays - 1), time: '10:00', department: 'Onkologie', type: 'Therapie' as const, label: 'Weiterführung der Tumortherapie', linkedDocumentIds: ['map-therapy-proof', 'map-palliative-proof'] },
        { id: 't13', day: input.stayDays, time: '11:00', department: 'Onkologie', type: 'Entlassung' as const, label: 'Entlassung', linkedDocumentIds: ['map-oncology-report'] },
      ]
    : [
        { id: 't1', day: 1, time: '09:00', department: 'Pneumologie', type: 'Aufnahme' as const, label: 'Aufnahme bei Atemwegsinfekt', linkedDocumentIds: ['map-discharge', 'map-precode'] },
        { id: 't2', day: 2, time: '10:20', department: 'Pneumologie', type: 'Diagnostik' as const, label: 'Bildgebung', linkedDocumentIds: ['map-imaging', 'map-microbiology'] },
        { id: 't3', day: 3, endDay: input.stayDays - 1, time: '08:00', department: 'Pneumologie', type: 'Therapie' as const, label: 'Konservative Therapie', linkedDocumentIds: ['map-discharge'] },
        { id: 't4', day: input.stayDays, time: '11:00', department: 'Pneumologie', type: 'Entlassung' as const, label: 'Entlassung', linkedDocumentIds: ['map-discharge'] },
      ]
  const timeline = input.manualTimeline?.length
    ? [
        { id: 't-manual-admission', day: 1, time: '09:00', department: input.manualTimeline[0]?.department ?? 'Aufnahme', type: 'Aufnahme' as const, label: 'Aufnahme', linkedDocumentIds: ['map-precode'] },
        ...input.manualTimeline.map((event, index) => ({ ...event, id: event.id || `t-manual-${index + 1}`, linkedDocumentIds: event.linkedDocumentIds ?? [] })).sort((a, b) => a.day - b.day),
        { id: 't-manual-discharge', day: input.stayDays, time: '11:00', department: input.manualTimeline.at(-1)?.department ?? 'Entlassung', type: 'Entlassung' as const, label: 'Entlassung', linkedDocumentIds: [] },
      ]
    : generatedTimeline
  const hasIntensiveCare = timeline.some((event) => event.type === 'Intensiv' || /intensiv/i.test(event.department))
  const clinicalDepartments = new Set(timeline.filter((event) => !['Aufnahme', 'Entlassung'].includes(event.type)).map((event) => event.department))
  const derivedCareForm: CodingCase['careForm'] = hasIntensiveCare ? 'Normal- und Intensivstation' : 'Normalstation'
  const derivedComplexity: CodingCase['complexity'] = hasIntensiveCare || clinicalDepartments.size >= 3
    ? 'komplex'
    : clinicalDepartments.size >= 2 || timeline.filter((event) => event.type === 'Eingriff').length > 1
      ? 'prüfbedürftig'
      : 'standardnah'
  const derivedDifficulty: CodingCase['difficulty'] = derivedComplexity === 'standardnah' && hospitalTypicality === 'typisch' ? 'einfach' : 'schwierig'
  const documentMap = isComplex
    ? [
        {
          id: 'map-precode',
          title: 'Vorkodierung · strukturierter Export',
          kind: 'vorkodierung' as const,
          availability: 'vorhanden' as const,
          relevance: 'stimmig' as const,
          reviewLevel: 'grob-geprüft' as const,
          priority: 'erledigt' as const,
          startDay: 1,
          endDay: input.stayDays,
          department: 'Gesamtfall',
          mapRow: 2,
          reason: 'Die vorhandene Kodierung passt grob zur Behandlungskette und zur ersten Grouper-Hypothese.',
          codingNote: 'C34.9 und zwei OPS-Demogruppen sind vorkodiert. Die Einzelnachweise werden nur bei Ergebniswirkung vertieft.',
          resultImpact: 'Dient als Ausgangspunkt. Sie ersetzt keinen Fallnachweis.',
          outcomeDimensions: dimensions('geprüft', 'offen', 'offen', 'geprüft', 'neutral'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-pulmo-report',
          title: 'Pulmologischer Aufnahme- und Verlegungsbericht',
          kind: 'verlaufsbericht' as const,
          availability: 'vorhanden' as const,
          relevance: 'stimmig' as const,
          reviewLevel: 'grob-geprüft' as const,
          priority: 'erledigt' as const,
          startDay: 1,
          endDay: 8,
          department: 'Pneumologie',
          mapRow: 0,
          reason: 'Aufnahmegrund, Bildgebung und invasive Diagnostik stützen den pulmologisch-onkologischen Pfad.',
          codingNote: 'Für die erste Hypothese wurde der Bericht quergelesen. Die Hauptdiagnose bleibt separat zu belegen.',
          resultImpact: 'Bestätigt die aktuelle Fallrichtung.',
          outcomeDimensions: dimensions('relevant', 'neutral', 'neutral', 'geprüft', 'relevant'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-bronchoscopy',
          title: 'Bronchoskopie- und Biopsiebericht',
          kind: 'ereignisbericht' as const,
          availability: 'vorhanden' as const,
          relevance: 'potenziell' as const,
          reviewLevel: 'nachvalidierung' as const,
          priority: 'jetzt' as const,
          startDay: 3,
          department: 'Pneumologie',
          mapRow: 0,
          reason: 'Der Eingriff ist für den Behandlungspfad zentral. Die genaue OPS-Ausprägung ist noch nicht gegen den Originalbericht geprüft.',
          codingNote: 'Eine unspezifische bronchoskopische Diagnostik ist vorkodiert.',
          resultImpact: 'Kann die Prozedur spezifizieren und einen alternativen Pfad öffnen.',
          outcomeDimensions: dimensions('relevant', 'relevant', 'neutral', 'offen', 'relevant'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-histology',
          title: 'Histologischer Befund',
          kind: 'ereignisbericht' as const,
          availability: 'vorhanden' as const,
          relevance: 'stimmig' as const,
          reviewLevel: 'validiert' as const,
          priority: 'erledigt' as const,
          startDay: 7,
          department: 'Pathologie',
          mapRow: 1,
          reason: 'Der Befund stützt die onkologische Arbeitshypothese.',
          codingNote: 'Tumordiagnose als illustrative Demoangabe bestätigt.',
          resultImpact: 'Belegt die führende Diagnosehypothese.',
          outcomeDimensions: dimensions('geprüft', 'neutral', 'neutral', 'geprüft', 'neutral'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-oncology-report',
          title: 'Onkologischer Verlauf und Entlassungsbericht',
          kind: 'verlaufsbericht' as const,
          availability: 'vorhanden' as const,
          relevance: 'stimmig' as const,
          reviewLevel: 'grob-geprüft' as const,
          priority: 'erledigt' as const,
          startDay: 9,
          endDay: input.stayDays,
          department: 'Onkologie',
          mapRow: 1,
          reason: 'Der Verlauf bestätigt die führende medikamentöse Behandlung.',
          codingNote: 'Therapieart und Dosis sind im Verlaufsbericht nicht ausreichend spezifisch belegt.',
          resultImpact: 'Bestätigt den Pfad, reicht aber nicht für alle OPS- und Entgeltmerkmale.',
          outcomeDimensions: dimensions('relevant', 'offen', 'offen', 'offen', 'relevant'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-therapy',
        },
        {
          id: 'map-therapy-proof',
          title: 'Medikations- und Therapienachweis',
          kind: 'nachweis' as const,
          availability: 'fehlend' as const,
          relevance: 'potenziell' as const,
          reviewLevel: 'nachvalidierung' as const,
          priority: 'jetzt' as const,
          startDay: 11,
          endDay: Math.min(20, input.stayDays),
          department: 'Onkologie',
          mapRow: 2,
          reason: 'Gabe, Dosis und Therapieart können OPS, Zusatzentgelt oder NUB verändern.',
          codingNote: 'Die systemische Therapie ist nur aus dem Verlauf vorkodiert.',
          resultImpact: 'Kann DRG, Zusatzentgelt oder NUB verändern.',
          outcomeDimensions: dimensions('relevant', 'relevant', 'relevant', 'offen', 'relevant'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-therapy',
        },
        {
          id: 'map-palliative-proof',
          title: 'Palliativmedizinischer Leistungsnachweis',
          kind: 'nachweis' as const,
          availability: 'fehlend' as const,
          relevance: 'offen' as const,
          reviewLevel: 'nicht-angefordert' as const,
          priority: 'später' as const,
          startDay: 11,
          endDay: Math.min(20, input.stayDays),
          department: 'Onkologie',
          mapRow: 3,
          reason: 'Das Strukturmerkmal ist vorhanden. Der aktuelle Verlauf liefert aber noch keinen starken Hinweis auf die Komplexbehandlung.',
          codingNote: 'Keine palliativmedizinische Komplexbehandlung vorkodiert.',
          resultImpact: 'Nur bei neuen Hinweisen vertiefen.',
          outcomeDimensions: dimensions('offen', 'offen', 'neutral', 'offen', 'offen'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-palliative',
        },
        {
          id: 'map-microbiology',
          title: 'Mikrobiologie',
          kind: 'nachweis' as const,
          availability: 'fehlend' as const,
          relevance: 'neutral' as const,
          reviewLevel: 'nicht-angefordert' as const,
          priority: 'erledigt' as const,
          startDay: 2,
          department: 'Pneumologie',
          mapRow: 3,
          reason: 'Die aktuelle Tumorhypothese wird durch eine Pneumoniespezifizierung voraussichtlich nicht verändert.',
          codingNote: 'Keine spezifische Pneumonie aus ungesichertem Erregernachweis ableiten.',
          resultImpact: 'Aktuell kein realistischer Ergebniswechsel.',
          outcomeDimensions: dimensions('neutral', 'neutral', 'neutral', 'offen', 'neutral'),
          assessedIteration: 1,
          linkedDecisionId: 'decision-pneumonia',
        },
      ]
    : [
        {
          id: 'map-precode', title: 'Vorkodierung · strukturierter Export', kind: 'vorkodierung' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'grob-geprüft' as const, priority: 'erledigt' as const,
          startDay: 1, endDay: input.stayDays, department: 'Gesamtfall', mapRow: 1, reason: 'Die Vorkodierung passt zum konservativen Verlauf.', codingNote: 'Unspezifische Pneumonie ist vorkodiert.', resultImpact: 'Ausgangspunkt der ersten Iteration.', assessedIteration: 1, linkedDecisionId: 'decision-main',
          outcomeDimensions: dimensions('geprüft', 'neutral', 'neutral', 'geprüft', 'neutral'),
        },
        {
          id: 'map-discharge', title: 'Pneumologischer Arztbrief', kind: 'verlaufsbericht' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'grob-geprüft' as const, priority: 'erledigt' as const,
          startDay: 1, endDay: input.stayDays, department: 'Pneumologie', mapRow: 0, reason: 'Der Bericht deckt den stringenten Gesamtverlauf ab.', codingNote: 'Aufnahmegrund und konservative Therapie grob abgeglichen.', resultImpact: 'Bestätigt die aktuelle DRG-Hypothese.', assessedIteration: 1, linkedDecisionId: 'decision-main',
          outcomeDimensions: dimensions('geprüft', 'neutral', 'neutral', 'geprüft', 'relevant'),
        },
        {
          id: 'map-imaging', title: 'Röntgen-Thorax', kind: 'ereignisbericht' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'validiert' as const, priority: 'erledigt' as const,
          startDay: 2, department: 'Radiologie', mapRow: 0, reason: 'Die Bildgebung stützt die Pneumonie.', codingNote: 'Bildgebungsnachweis vorhanden.', resultImpact: 'Bestätigt die Diagnosehypothese.', assessedIteration: 1, linkedDecisionId: 'decision-main',
          outcomeDimensions: dimensions('geprüft', 'neutral', 'neutral', 'geprüft', 'relevant'),
        },
        {
          id: 'map-microbiology', title: 'Mikrobiologie', kind: 'nachweis' as const, availability: 'fehlend' as const, relevance: 'potenziell' as const, reviewLevel: 'nachvalidierung' as const, priority: 'jetzt' as const,
          startDay: 2, department: 'Pneumologie', mapRow: 1, reason: 'Vier spezielle Pneumonievarianten könnten den Grouper-Pfad verändern.', codingNote: 'Unspezifische Pneumonie bleibt bis zum belastbaren Erregernachweis bestehen.', resultImpact: 'Kann eine spezielle Diagnose und alternative DRG öffnen.', assessedIteration: 1, linkedDecisionId: 'decision-pneumonia',
          outcomeDimensions: dimensions('relevant', 'neutral', 'neutral', 'offen', 'neutral'),
        },
      ]

  const generatedCodingEntries: CodingEntry[] = isComplex
    ? [
        {
          id: 'coding-hd-c349',
          type: 'HD',
          code: 'C34.9',
          description: 'Bronchialkarzinom, nicht näher bezeichnet · illustrative Demoangabe',
          change: 'unchanged',
          origin: 'vorkodierung',
          reviewStatus: 'belegt',
          active: true,
          source: 'Vorkodierung · strukturierter Export',
          evidenceDocumentId: 'map-precode',
          treatmentEventId: 't1',
          serviceDate: admissionDate,
          department: 'Gesamtfall',
          assessedIteration: 1,
          groupingImpact: 'pfadbestimmend',
          groupingImpactReason: 'Die Hauptdiagnose bestimmt MDC und führenden DRG-Pfad.',
        },
        {
          id: 'coding-nd-j189',
          type: 'ND',
          code: 'J18.9',
          description: 'Pneumonie, nicht näher bezeichnet · illustrative Demoangabe',
          change: 'unchanged',
          origin: 'vorkodierung',
          reviewStatus: 'wahrscheinlich',
          active: true,
          source: 'Vorkodierung · strukturierter Export',
          evidenceDocumentId: 'map-pulmo-report',
          treatmentEventId: 't2',
          serviceDate: addDays(admissionDate, 1),
          department: 'Pneumologie',
          assessedIteration: 1,
          groupingImpact: 'ohne-änderung',
          groupingImpactReason: 'Die aktuelle Gegenprobe verändert die DRG-Hypothese nicht.',
        },
        {
          id: 'coding-ops-16200',
          type: 'OPS',
          code: '1-620.0',
          description: 'Bronchoskopische Diagnostik · illustrative Demoangabe',
          change: 'unchanged',
          origin: 'vorkodierung',
          reviewStatus: 'ungeprüft',
          active: true,
          source: 'Vorkodierung · strukturierter Export',
          evidenceDocumentId: 'map-bronchoscopy',
          treatmentEventId: 't3',
          serviceDate: addDays(admissionDate, 2),
          department: 'Pneumologie',
          assessedIteration: 1,
          groupingImpact: 'split-relevant',
          groupingImpactReason: 'Die genaue bronchoskopische Prozedur kann den E71-Split verändern.',
        },
        {
          id: 'coding-ops-854211',
          type: 'OPS',
          code: '8-542.11',
          description: 'Systemische Tumortherapie · illustrative Demoangabe',
          change: 'unchanged',
          origin: 'vorkodierung',
          reviewStatus: 'wahrscheinlich',
          active: true,
          source: 'Vorkodierung · strukturierter Export',
          evidenceDocumentId: 'map-oncology-report',
          treatmentEventId: 't9',
          serviceDate: addDays(admissionDate, 10),
          serviceEndDate: addDays(admissionDate, 12),
          quantity: 1,
          department: 'Onkologie',
          assessedIteration: 1,
          groupingImpact: 'potenziell',
          groupingImpactReason: 'Therapieart und Dosis können DRG, Zusatzentgelt oder NUB verändern.',
        },
      ]
    : [
        {
          id: 'coding-hd-j189',
          type: 'HD',
          code: 'J18.9',
          description: 'Pneumonie, nicht näher bezeichnet · illustrative Demoangabe',
          change: 'unchanged',
          origin: 'vorkodierung',
          reviewStatus: 'wahrscheinlich',
          active: true,
          source: 'Vorkodierung · strukturierter Export',
          evidenceDocumentId: 'map-precode',
          treatmentEventId: 't1',
          serviceDate: admissionDate,
          department: 'Pneumologie',
          assessedIteration: 1,
          groupingImpact: 'pfadbestimmend',
          groupingImpactReason: 'Die Hauptdiagnose bestimmt den pneumologischen DRG-Pfad.',
        },
      ]
  const baselineCodingEntries: CodingEntry[] = input.manualCodingEntries?.length
    ? input.manualCodingEntries.map((entry, index) => ({
        id: `coding-manual-baseline-${index + 1}`,
        type: entry.type,
        code: entry.code,
        description: entry.description || 'Manuell aus dem KIS übernommen',
        change: 'unchanged',
        origin: 'vorkodierung',
        reviewStatus: 'ungeprüft',
        active: true,
        source: 'Manuell aus dem KIS übernommen',
        evidenceDocumentId: 'map-precode',
        treatmentEventId: timeline.find((event) => entry.type === 'OPS' ? ['Eingriff', 'Therapie', 'Intensiv'].includes(event.type) : event.type === 'Aufnahme')?.id,
        serviceDate: entry.type === 'OPS' ? addDays(admissionDate, Math.max(0, (timeline.find((event) => ['Eingriff', 'Therapie', 'Intensiv'].includes(event.type))?.day ?? 1) - 1)) : admissionDate,
        department: entry.type === 'HD' ? 'Gesamtfall' : timeline.find((event) => !['Aufnahme', 'Entlassung'].includes(event.type))?.department,
        assessedIteration: 1,
        groupingImpact: entry.type === 'HD' ? 'pfadbestimmend' : entry.type === 'OPS' ? 'potenziell' : 'ohne-änderung',
        groupingImpactReason: entry.type === 'HD' ? 'Die Hauptdiagnose bestimmt MDC und führenden DRG-Pfad.' : 'Manuell übernommener Ausgangskode; Wirkung wird in der ersten Iteration geprüft.',
      }))
    : generatedCodingEntries
  const codingEntries: CodingEntry[] = baselineCodingEntries.map((entry) => ({
    ...entry,
    serviceTime: entry.serviceTime ?? (entry.type === 'OPS' ? timeline.find((event) => event.id === entry.treatmentEventId)?.time : undefined),
  }))
  const activeMainDiagnosis = codingEntries.find((entry) => entry.active && entry.type === 'HD')
  const activeProcedures = codingEntries.filter((entry) => entry.active && entry.type === 'OPS')
  const sourceDocuments: CaseDocument[] = input.files.map((name, index) => ({
    id: `doc-${index}`,
    name,
    kind: name.split('.').pop()?.toUpperCase() || 'Datei',
    addedAt: isoNow(),
    status: 'ausgewertet',
    mimeType: name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : name.toLowerCase().endsWith('.txt') ? 'text/plain' : 'text/csv',
    previewText: demoDocumentPreview(name, isComplex),
    previewLabel: name.toLowerCase().includes('kodier') || /\.(csv|xls|xlsx)$/i.test(name) ? 'Strukturierte KIS-Ausgangsdaten' : 'LLM-Textansicht des hochgeladenen Dokuments',
  }))
  const codingSource = sourceDocuments.find((document) => document.name.toLowerCase().includes('kodier') || /\.(csv|xls|xlsx)$/i.test(document.name))
  const clinicalSource = sourceDocuments.find((document) => document.id !== codingSource?.id)
  const documentMapWithSources = documentMap.map((document) => {
    if (document.kind === 'vorkodierung' && codingSource) return { ...document, sourceDocumentId: codingSource.id }
    if (document.kind === 'verlaufsbericht' && clinicalSource) return { ...document, sourceDocumentId: clinicalSource.id }
    return document
  })

  const baseCase: CodingCase = {
    id,
    caseNumber: input.caseNumber ?? `MAN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    label: isComplex ? 'Pulmologisch-onkologischer Demofall' : 'Standardnaher Pneumologie-Demofall',
    hospitalId: input.hospitalId,
    siteId: input.siteId,
    year: input.year,
    admissionDate,
    dischargeDate,
    age: input.age,
    stayDays: input.stayDays,
    careForm: derivedCareForm,
    complexity: derivedComplexity,
    complexityReasons: [
      `${clinicalDepartments.size || 1} beteiligte Fachabteilung${clinicalDepartments.size === 1 ? '' : 'en'}`,
      hasIntensiveCare ? 'Intensivmedizinischer Teilaufenthalt' : 'Kein Intensivaufenthalt',
      `${timeline.filter((event) => event.type === 'Eingriff').length} Intervention${timeline.filter((event) => event.type === 'Eingriff').length === 1 ? '' : 'en'} im Verlauf`,
    ],
    hospitalTypicality,
    hospitalTypicalitySource: 'technisch',
    hospitalTypicalityReason: hospitalTypicality === 'typisch'
      ? isComplex
        ? 'Bronchoskopie und onkologischer Behandlungspfad kommen am gewählten Standort regelmäßig vor.'
        : 'Vergleichbare konservative Pneumologie-Fälle kommen am Standort regelmäßig vor.'
      : 'Der kombinierte pulmologisch-onkologische Behandlungspfad ist im Standortprofil nicht regelhaft abgebildet.',
    comparableCases: hospitalTypicality === 'typisch' ? (isComplex ? 42 : 186) : 3,
    difficulty: derivedDifficulty,
    difficultySource: 'technisch',
    difficultyReason: derivedDifficulty === 'schwierig'
      ? 'Fachabteilungswechsel, Behandlungsintensität oder mehrere mögliche DRG-Pfade erhöhen die Prüftiefe.'
      : 'Ein stringenter, hausüblicher Verlauf mit wenigen ergebnisrelevanten Entscheidungen.',
    dkrMatches: isComplex
      ? [
          {
            id: 'dkr-demo-d002',
            title: 'DKR-Demo D002 · Hauptdiagnose',
            relevance: 'Mehrere Teilaufenthalte: Die Hauptdiagnose muss über den Gesamtfall und den Aufnahmegrund bestimmt werden.',
            status: 'allgemein',
          },
          {
            id: 'dkr-demo-0201',
            title: 'DKR-Demo 0201 · Neubildungen',
            relevance: 'Tumordiagnostik und Ersttherapie liegen im selben Aufenthalt. Die spezielle Regel wird in die Hauptdiagnoseprüfung eingeblendet.',
            status: 'spezifisch',
          },
        ]
      : [
          {
            id: 'dkr-demo-d002',
            title: 'DKR-Demo D002 · Hauptdiagnose',
            relevance: 'Die dokumentierte Pneumonie wird als führender Aufnahmegrund gegen mögliche Symptome geprüft.',
            status: 'allgemein',
          },
        ],
    consultations: [],
    wikiThreads: [],
    scenario: input.scenario,
    intakeConfirmed: false,
    intakeSources: input.intakeSources ?? [
      ...input.files.map((name, index) => ({ id: `source-file-${index}`, kind: 'arztbrief' as const, label: name, status: 'erkannt' as const, detail: 'Überschriften und Abschnitte wurden als Verlaufsvorschlag verwendet.', addedAt: isoNow() })),
      { id: 'source-manual', kind: 'manuell' as const, label: 'Manuelle Fallangaben', status: 'bestätigt' as const, detail: 'Alter, Verweildauer und Versorgungsform wurden manuell erfasst.', addedAt: isoNow() },
    ],
    status: 'offen',
    currentMainDiagnosis: activeMainDiagnosis ? `${activeMainDiagnosis.code} · ${activeMainDiagnosis.description}` : 'Keine Hauptdiagnose übernommen',
    currentProcedures: activeProcedures.length
      ? activeProcedures.map((entry) => `${entry.code} · ${entry.description}`)
      : ['Keine OPS-Kodierung übernommen'],
    timeline,
    documents: sourceDocuments,
    documentMap: documentMapWithSources,
    decisions: isComplex
      ? [
          {
            id: 'decision-main',
            title: 'Hauptdiagnose über den Gesamtfall belegen',
            description: 'Aufnahmegrund, Verfahren und Epikrise sprechen für einen onkologisch führenden Behandlungspfad.',
            impact: 'hoch',
            required: true,
            status: 'entscheidung',
            requestedDocument: 'Aufnahmebefund und Epikrise',
            effect: 'Kann Basis-DRG und Hauptdiagnose verändern.',
            groupingRelevance: 'relevant',
            knowledge: 'vertraut',
          },
          {
            id: 'decision-therapy',
            title: 'Systemische Tumortherapie prüfen',
            description: 'Therapieart, Gabe, Dosis und OPS-Voraussetzungen sind noch nicht vollständig belegt.',
            impact: 'hoch',
            required: true,
            status: 'ungeklärt',
            requestedDocument: 'Medikations- und Therapienachweis',
            effect: 'Kann OPS, Zusatzentgelt oder NUB auslösen.',
            groupingRelevance: 'relevant',
            knowledge: 'unsicher',
          },
          {
            id: 'decision-palliative',
            title: 'Palliativmedizinische Komplexbehandlung ausschließen',
            description: 'Der Standort besitzt das Strukturmerkmal. Aufenthalt und Leistungsmerkmale sind nicht belegt.',
            impact: 'mittel',
            required: false,
            status: 'wahrscheinlich',
            requestedDocument: 'Stationsverlauf und Leistungsnachweis',
            effect: 'Möglicher alternativer DRG-Pfad.',
            groupingRelevance: 'möglich',
            knowledge: 'vertraut',
          },
          {
            id: 'decision-pneumonia',
            title: 'Spezifische Pneumonie nur bei belastbarem Nachweis',
            description: 'Eine spezielle Variante wäre gruppierungsrelevant. Aktuell fehlt die Mikrobiologie.',
            impact: 'mittel',
            required: false,
            status: 'ungeklärt',
            requestedDocument: 'Mikrobiologie und ärztliche Zuordnung',
            effect: 'Eine von vier speziellen Varianten könnte die DRG ändern.',
            groupingRelevance: 'möglich',
            knowledge: 'unsicher',
          },
        ]
      : [
          {
            id: 'decision-main',
            title: 'Unspezifische Pneumonie belegen',
            description: 'Der dokumentierte Verlauf spricht für einen standardnahen konservativen Fall.',
            impact: 'hoch',
            required: true,
            status: 'entscheidung',
            requestedDocument: 'Arztbrief und Bildgebung',
            effect: 'Bestätigt die aktuelle Basis-DRG.',
            groupingRelevance: 'relevant',
            knowledge: 'vertraut',
          },
          {
            id: 'decision-pneumonia',
            title: 'Spezifische Pneumonie prüfen',
            description: '31 Kandidaten bleiben in derselben DRG. Vier spezielle Varianten könnten den Pfad ändern.',
            impact: 'mittel',
            required: false,
            status: 'ungeklärt',
            requestedDocument: 'Mikrobiologie',
            effect: 'Nur bei belastbarem Erregernachweis vertiefen.',
            groupingRelevance: 'möglich',
            knowledge: 'unsicher',
          },
        ],
    grouperRuns: [
      {
        id: `run-${id}-1`,
        iteration: 1,
        timestamp: isoNow(),
        drg: isComplex ? 'E71B · Demo' : 'E77B · Demo',
        baseDrg: isComplex ? 'E71' : 'E77',
        pccL: isComplex ? 2 : 1,
        reason: 'Vorkodierung mit dem ersten Dokumentenstand gruppiert.',
        changed: false,
        extras: [],
        lengthOfStay: getDrgLengthOfStayProfile(isComplex ? 'E71B' : 'E77B'),
      },
    ],
    codingEntries,
    kisBaselineEntries: codingEntries.map((entry) => ({ ...entry })),
    technicalValues: input.technicalValues ?? [],
    grouperAdministrativeData: input.grouperAdministrativeData ?? {
      admissionReasonCode: '01 07',
      admissionReasonLabel: 'vollstationär · Notfall',
      dischargeReasonCode: '01 90',
      dischargeReasonLabel: 'regulär beendet · illustrative Demoangabe',
      admissionWeightGrams: input.age < 1 ? 3250 : undefined,
    },
    medicalJustification: isComplex
      ? {
          status: 'entwurf-belegbar',
          categories: ['Invasive Diagnostik', 'Unmittelbare Weiterbehandlung', 'Hohe Therapieintensität'],
          evidenceDocumentIds: ['map-pulmo-report', 'map-bronchoscopy', 'map-oncology-report'],
          missingEvidence: ['Applikationsnachweis für die konkrete systemische Therapie'],
          draft: 'Die vollstationäre Behandlung war aufgrund der zeitnah erforderlichen invasiven bronchoskopischen Diagnostik mit Biopsie und der sich unmittelbar anschließenden fachübergreifenden onkologischen Weiterbehandlung erforderlich. Der dokumentierte Ablauf mit Diagnostik, histologischer Sicherung und Einleitung der systemischen Therapie erforderte eine durchgehende stationäre Koordination und Überwachung. Eine ambulante oder teilstationäre Durchführung hätte diesen eng gekoppelten Behandlungsablauf im dokumentierten Zeitraum nicht gleichwertig abgebildet.',
          reviewed: false,
        }
      : {
          status: 'fachprüfung',
          categories: ['Behandlungsintensität', 'Klinische Überwachung'],
          evidenceDocumentIds: ['map-discharge', 'map-imaging'],
          missingEvidence: ['Konkrete stationäre Überwachungs- oder Therapieintensität'],
          draft: 'Der dokumentierte pneumologische Verlauf und die Bildgebung belegen die Erkrankung. Für eine belastbare Abgrenzung gegenüber einer ambulanten Behandlung muss die konkrete stationäre Behandlungs- oder Überwachungsintensität noch fachlich ergänzt werden.',
          reviewed: false,
        },
    createdAt: isoNow(),
  }
  return attachReadableDemoDocuments(applyDemoVariant(baseCase, input.demoVariant))
}

export const initialData: AppData = {
  hospitals: demoHospitals,
  batchCases: demoBatchCases,
  cases: [],
  rules: demoRules,
}
