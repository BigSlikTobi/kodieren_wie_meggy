import type { AppData, CodingCase, HospitalProfile, NewCaseInput, RuleDefinition } from '../types'

const isoNow = () => new Date().toISOString()

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
      },
    ],
  },
]

export const demoRules: RuleDefinition[] = [
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
  const selectedProfile = demoHospitals
    .find((hospital) => hospital.id === input.hospitalId)
    ?.profiles.find((profile) => profile.siteId === input.siteId && profile.year === input.year)
  const supportsPulmoOnkoPath = Boolean(
    selectedProfile?.structures.includes('Onkologisches Zentrum') &&
    selectedProfile.structures.includes('Bronchoskopie'),
  )
  const hospitalTypicality = !isComplex || supportsPulmoOnkoPath ? 'typisch' as const : 'untypisch' as const
  const difficult = isComplex || input.careForm === 'Normal- und Intensivstation'
  const timeline = isComplex
    ? [
        { id: 't1', day: 1, department: 'Pneumologie', type: 'Aufnahme' as const, label: 'Aufnahme mit thorakalem Befund' },
        { id: 't2', day: 2, department: 'Pneumologie', type: 'Diagnostik' as const, label: 'Bildgebung und Befundbewertung' },
        { id: 't3', day: 3, department: 'Pneumologie', type: 'Eingriff' as const, label: 'Bronchoskopische Biopsie' },
        { id: 't4', day: 9, department: 'Onkologie', type: 'Verlegung' as const, label: 'Verlegung nach Histologie' },
        { id: 't5', day: 11, endDay: 20, department: 'Onkologie', type: 'Therapie' as const, label: 'Systemische Tumortherapie' },
        { id: 't6', day: input.stayDays, department: 'Onkologie', type: 'Entlassung' as const, label: 'Entlassung' },
      ]
    : [
        { id: 't1', day: 1, department: 'Pneumologie', type: 'Aufnahme' as const, label: 'Aufnahme bei Atemwegsinfekt' },
        { id: 't2', day: 2, department: 'Pneumologie', type: 'Diagnostik' as const, label: 'Bildgebung' },
        { id: 't3', day: 3, endDay: input.stayDays - 1, department: 'Pneumologie', type: 'Therapie' as const, label: 'Konservative Therapie' },
        { id: 't4', day: input.stayDays, department: 'Pneumologie', type: 'Entlassung' as const, label: 'Entlassung' },
      ]
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
          endDay: 20,
          department: 'Onkologie',
          mapRow: 2,
          reason: 'Gabe, Dosis und Therapieart können OPS, Zusatzentgelt oder NUB verändern.',
          codingNote: 'Die systemische Therapie ist nur aus dem Verlauf vorkodiert.',
          resultImpact: 'Kann DRG, Zusatzentgelt oder NUB verändern.',
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
          endDay: 20,
          department: 'Onkologie',
          mapRow: 3,
          reason: 'Das Strukturmerkmal ist vorhanden. Der aktuelle Verlauf liefert aber noch keinen starken Hinweis auf die Komplexbehandlung.',
          codingNote: 'Keine palliativmedizinische Komplexbehandlung vorkodiert.',
          resultImpact: 'Nur bei neuen Hinweisen vertiefen.',
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
          assessedIteration: 1,
          linkedDecisionId: 'decision-pneumonia',
        },
      ]
    : [
        {
          id: 'map-precode', title: 'Vorkodierung · strukturierter Export', kind: 'vorkodierung' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'grob-geprüft' as const, priority: 'erledigt' as const,
          startDay: 1, endDay: input.stayDays, department: 'Gesamtfall', mapRow: 1, reason: 'Die Vorkodierung passt zum konservativen Verlauf.', codingNote: 'Unspezifische Pneumonie ist vorkodiert.', resultImpact: 'Ausgangspunkt der ersten Iteration.', assessedIteration: 1, linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-discharge', title: 'Pneumologischer Arztbrief', kind: 'verlaufsbericht' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'grob-geprüft' as const, priority: 'erledigt' as const,
          startDay: 1, endDay: input.stayDays, department: 'Pneumologie', mapRow: 0, reason: 'Der Bericht deckt den stringenten Gesamtverlauf ab.', codingNote: 'Aufnahmegrund und konservative Therapie grob abgeglichen.', resultImpact: 'Bestätigt die aktuelle DRG-Hypothese.', assessedIteration: 1, linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-imaging', title: 'Röntgen-Thorax', kind: 'ereignisbericht' as const, availability: 'vorhanden' as const, relevance: 'stimmig' as const, reviewLevel: 'validiert' as const, priority: 'erledigt' as const,
          startDay: 2, department: 'Radiologie', mapRow: 0, reason: 'Die Bildgebung stützt die Pneumonie.', codingNote: 'Bildgebungsnachweis vorhanden.', resultImpact: 'Bestätigt die Diagnosehypothese.', assessedIteration: 1, linkedDecisionId: 'decision-main',
        },
        {
          id: 'map-microbiology', title: 'Mikrobiologie', kind: 'nachweis' as const, availability: 'fehlend' as const, relevance: 'potenziell' as const, reviewLevel: 'nachvalidierung' as const, priority: 'jetzt' as const,
          startDay: 2, department: 'Pneumologie', mapRow: 1, reason: 'Vier spezielle Pneumonievarianten könnten den Grouper-Pfad verändern.', codingNote: 'Unspezifische Pneumonie bleibt bis zum belastbaren Erregernachweis bestehen.', resultImpact: 'Kann eine spezielle Diagnose und alternative DRG öffnen.', assessedIteration: 1, linkedDecisionId: 'decision-pneumonia',
        },
      ]

  return {
    id,
    label: isComplex ? 'Pulmologisch-onkologischer Demofall' : 'Standardnaher Pneumologie-Demofall',
    hospitalId: input.hospitalId,
    siteId: input.siteId,
    year: input.year,
    age: input.age,
    stayDays: input.stayDays,
    careForm: input.careForm,
    complexity: isComplex ? 'komplex' : 'standardnah',
    complexityReasons: isComplex
      ? ['Fachabteilungswechsel', 'Invasive Diagnostik', 'Führende medikamentöse Therapie']
      : ['Eine Fachabteilung', 'Kein Intensivaufenthalt', 'Stringenter konservativer Verlauf'],
    hospitalTypicality,
    hospitalTypicalitySource: 'technisch',
    hospitalTypicalityReason: hospitalTypicality === 'typisch'
      ? isComplex
        ? 'Bronchoskopie und onkologischer Behandlungspfad kommen am gewählten Standort regelmäßig vor.'
        : 'Vergleichbare konservative Pneumologie-Fälle kommen am Standort regelmäßig vor.'
      : 'Der kombinierte pulmologisch-onkologische Behandlungspfad ist im Standortprofil nicht regelhaft abgebildet.',
    comparableCases: hospitalTypicality === 'typisch' ? (isComplex ? 42 : 186) : 3,
    difficulty: difficult ? 'schwierig' : 'einfach',
    difficultySource: 'technisch',
    difficultyReason: difficult
      ? isComplex
        ? 'Fachabteilungswechsel, invasive Diagnostik und mehrere mögliche DRG-Pfade erhöhen die Prüftiefe.'
        : 'Der Intensivaufenthalt öffnet zusätzliche OPS-, Organersatz- und Altersprüfungen.'
      : 'Ein Fachgebiet, kein Intensivaufenthalt und ein stringenter Behandlungsverlauf.',
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
    status: 'offen',
    currentMainDiagnosis: isComplex ? 'C34.9 · Demo: Bronchialkarzinom, nicht näher bezeichnet' : 'J18.9 · Demo: Pneumonie, nicht näher bezeichnet',
    currentProcedures: isComplex
      ? ['1-6xx · Demo: Bronchoskopische Diagnostik', '8-54x · Demo: Systemische Tumortherapie']
      : ['Keine gruppierungsrelevante OR-Prozedur vorkodiert'],
    timeline,
    documents: input.files.map((name, index) => ({
      id: `doc-${index}`,
      name,
      kind: name.split('.').pop()?.toUpperCase() || 'Datei',
      addedAt: isoNow(),
      status: 'ausgewertet' as const,
    })),
    documentMap,
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
      },
    ],
    createdAt: isoNow(),
  }
}

export const initialData: AppData = {
  hospitals: demoHospitals,
  cases: [],
  rules: demoRules,
}
