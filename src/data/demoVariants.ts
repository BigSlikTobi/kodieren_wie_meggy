import type {
  CaseDocument,
  CodingCase,
  CodingEntry,
  DemoCaseVariant,
  DocumentMapItem,
  TreatmentEvent,
} from '../types'
import { getDrgLengthOfStayProfile } from './drgCatalog'

interface VariantSpec {
  label: string
  specialty: string
  pathway: string
  complexity: CodingCase['complexity']
  difficulty: CodingCase['difficulty']
  mainCode: string
  mainDiagnosis: string
  secondaryDiagnoses: Array<[string, string]>
  procedures: Array<[string, string]>
  drg: string
  baseDrg: string
  diagnosticEvent: string
  interventionEvent: string
  therapyEvent: string
  courseDocument: string
  keyDocument: string
  contextDocument: string
  keyAvailable: boolean
  keyReason: string
  keyCodingNote: string
  keyImpact: string
  decisionTitle: string
  decisionDescription: string
  alternativeTitle: string
  typicality: CodingCase['hospitalTypicality']
  comparableCases: number
  stressCounts?: { icd: number; ops: number }
}

const variantSpecs: Record<DemoCaseVariant, VariantSpec> = {
  'hip-fracture': {
    label: 'Notfallmäßige Schenkelhalsfraktur',
    specialty: 'Unfallchirurgie',
    pathway: 'Notaufnahme → Unfallchirurgie',
    complexity: 'standardnah',
    difficulty: 'einfach',
    mainCode: 'S72.0',
    mainDiagnosis: 'Schenkelhalsfraktur · illustrative Demoangabe',
    secondaryDiagnoses: [['M81.0', 'Osteoporose · illustrative Demoangabe']],
    procedures: [['5-79x.x', 'Operative Versorgung der Fraktur · illustrative Demoangabe']],
    drg: 'I08E · Demo',
    baseDrg: 'I08',
    diagnosticEvent: 'Röntgendiagnostik der Hüfte',
    interventionEvent: 'Operative Frakturversorgung innerhalb von 24 Stunden',
    therapyEvent: 'Postoperative Mobilisation und Schmerztherapie',
    courseDocument: 'Unfallchirurgischer Entlassungsbericht',
    keyDocument: 'OP-Bericht Frakturversorgung',
    contextDocument: 'Postoperative Röntgenkontrolle',
    keyAvailable: false,
    keyReason: 'Die Operation ist im Verlauf eindeutig, die genaue operative Technik ist ohne OP-Bericht aber nicht belastbar spezifiziert.',
    keyCodingNote: 'Nur die im OP-Bericht dokumentierte Technik und Seite übernehmen.',
    keyImpact: 'Kann den OPS und den Split innerhalb des orthopädischen DRG-Pfads verändern.',
    decisionTitle: 'Operative Frakturversorgung spezifizieren',
    decisionDescription: 'Der kürzeste Prüfpfad führt direkt zum OP-Bericht; der übrige Verlauf ist typisch und bereits stimmig.',
    alternativeTitle: 'Nebendiagnosen nur bei Ressourcenbezug vertiefen',
    typicality: 'typisch',
    comparableCases: 164,
  },
  'cardiology-intervention': {
    label: 'Komplexe Koronarintervention',
    specialty: 'Kardiologie',
    pathway: 'Kardiologie → Überwachung',
    complexity: 'prüfbedürftig',
    difficulty: 'schwierig',
    mainCode: 'I25.12',
    mainDiagnosis: 'Koronare Herzkrankheit · illustrative Demoangabe',
    secondaryDiagnoses: [['I50.9', 'Herzinsuffizienz · illustrative Demoangabe'], ['I48.0', 'Vorhofflimmern · illustrative Demoangabe']],
    procedures: [['1-275.0', 'Koronarangiographie · illustrative Demoangabe'], ['8-837.x', 'Koronarintervention · illustrative Demoangabe']],
    drg: 'F09C · Demo',
    baseDrg: 'F09',
    diagnosticEvent: 'Koronarangiographie',
    interventionEvent: 'Mehrgefäßintervention mit Stentversorgung',
    therapyEvent: 'Überwachung und antithrombotische Therapie',
    courseDocument: 'Kardiologischer Entlassungsbericht',
    keyDocument: 'Herzkatheter- und Interventionsbericht',
    contextDocument: 'Echokardiographischer Befund',
    keyAvailable: true,
    keyReason: 'Anzahl, Lokalisation und Art der Intervention sind ausschließlich im finalen Herzkatheterbericht vollständig dokumentiert.',
    keyCodingNote: 'Interventionsdatum, Gefäßanzahl und verwendete Systeme gegen die Vorkodierung prüfen.',
    keyImpact: 'Kann Prozeduren, Zusatzentgelte und den F09-Split verändern.',
    decisionTitle: 'Herzkatheterbericht gegen die OPS-Liste prüfen',
    decisionDescription: 'Ein einzelner vorhandener Bericht bündelt die wahrscheinlich gruppierungsrelevanten Merkmale.',
    alternativeTitle: 'Herzinsuffizienz nur bei dokumentiertem Aufwand bewerten',
    typicality: 'typisch',
    comparableCases: 238,
  },
  appendicitis: {
    label: 'Akute Appendizitis mit Operation',
    specialty: 'Allgemeinchirurgie',
    pathway: 'Notaufnahme → Allgemeinchirurgie',
    complexity: 'standardnah',
    difficulty: 'einfach',
    mainCode: 'K35.8',
    mainDiagnosis: 'Akute Appendizitis · illustrative Demoangabe',
    secondaryDiagnoses: [['R10.3', 'Unterbauchschmerz · illustrative Demoangabe']],
    procedures: [['5-470.x', 'Appendektomie · illustrative Demoangabe']],
    drg: 'G23B · Demo',
    baseDrg: 'G23',
    diagnosticEvent: 'Sonographische Diagnostik',
    interventionEvent: 'Laparoskopische Appendektomie',
    therapyEvent: 'Postoperative Standardbehandlung',
    courseDocument: 'Chirurgischer Entlassungsbericht',
    keyDocument: 'OP-Bericht Appendektomie',
    contextDocument: 'Histologischer Befund Appendix',
    keyAvailable: true,
    keyReason: 'Der OP-Bericht bestätigt Zugang, Resektionsumfang und fehlende relevante Komplikationen.',
    keyCodingNote: 'Symptomkodes nach Sicherung der Hauptdiagnose nicht ungeprüft als Nebendiagnosen fortführen.',
    keyImpact: 'Bestätigt voraussichtlich den bestehenden operativen Pfad ohne Ergebniswechsel.',
    decisionTitle: 'Standardpfad mit dem OP-Bericht bestätigen',
    decisionDescription: 'Ein kurzer Abgleich reicht voraussichtlich für den sicheren Fallabschluss.',
    alternativeTitle: 'Komplikationspfad nur bei histologischem oder operativem Beleg öffnen',
    typicality: 'typisch',
    comparableCases: 302,
  },
  'ventilation-conflict': {
    label: 'Intensivfall mit widersprüchlicher Beatmungszeit',
    specialty: 'Intensivmedizin',
    pathway: 'Innere Medizin → Intensivmedizin',
    complexity: 'komplex',
    difficulty: 'schwierig',
    mainCode: 'J96.0',
    mainDiagnosis: 'Akute respiratorische Insuffizienz · illustrative Demoangabe',
    secondaryDiagnoses: [['A41.9', 'Sepsis · illustrative Demoangabe'], ['N17.9', 'Akutes Nierenversagen · illustrative Demoangabe']],
    procedures: [['8-71x.x', 'Maschinelle Beatmung · illustrative Demoangabe'], ['8-854.x', 'Nierenersatzverfahren · illustrative Demoangabe']],
    drg: 'A13G · Demo',
    baseDrg: 'A13',
    diagnosticEvent: 'Intensivmedizinische Aufnahme und Organstatus',
    interventionEvent: 'Invasive Beatmung und Nierenersatzverfahren',
    therapyEvent: 'Weaning und intensivmedizinische Komplexbehandlung',
    courseDocument: 'Intensivmedizinischer Verlegungsbericht',
    keyDocument: 'Beatmungs- und Weaningprotokoll',
    contextDocument: 'PDMS-Tageskurve',
    keyAvailable: true,
    keyReason: 'Strukturierter Import und dokumentierte Beatmungsintervalle ergeben unterschiedliche Summen.',
    keyCodingNote: 'Beginn, Ende und Unterbrechungen der Beatmung nachvollziehen; keine Schätzung übernehmen.',
    keyImpact: 'Kann den Beatmungssplit und damit die DRG wesentlich verändern.',
    decisionTitle: 'Beatmungsstunden als Widerspruch klären',
    decisionDescription: 'Vor jeder weiteren Kodierung muss die technische Summe gegen das vorhandene Protokoll geprüft werden.',
    alternativeTitle: 'Nierenersatzverfahren anschließend gegen die Tageskurve prüfen',
    typicality: 'typisch',
    comparableCases: 58,
  },
  'stroke-time-window': {
    label: 'Ischämischer Schlaganfall mit Zeitfenster',
    specialty: 'Neurologie',
    pathway: 'Notaufnahme → Stroke Unit',
    complexity: 'prüfbedürftig',
    difficulty: 'schwierig',
    mainCode: 'I63.9',
    mainDiagnosis: 'Hirninfarkt · illustrative Demoangabe',
    secondaryDiagnoses: [['R47.0', 'Dysphasie · illustrative Demoangabe'], ['I10.0', 'Arterielle Hypertonie · illustrative Demoangabe']],
    procedures: [['8-981.x', 'Neurologische Komplexbehandlung · illustrative Demoangabe'], ['8-020.x', 'Thrombolytische Therapie · illustrative Demoangabe']],
    drg: 'B70B · Demo',
    baseDrg: 'B70',
    diagnosticEvent: 'Akutbildgebung und neurologischer Status',
    interventionEvent: 'Zeitkritische Akuttherapie',
    therapyEvent: 'Stroke-Unit-Komplexbehandlung',
    courseDocument: 'Neurologischer Entlassungsbericht',
    keyDocument: 'Stroke-Protokoll mit Zeitstempeln',
    contextDocument: 'CT- und Angiographiebefund',
    keyAvailable: true,
    keyReason: 'Aufnahme-, Bildgebungs- und Therapiebeginn sind für den zeitkritischen Behandlungspfad entscheidend.',
    keyCodingNote: 'Zeitstempel und Mindestmerkmale der Komplexbehandlung gegen den Leistungsnachweis prüfen.',
    keyImpact: 'Kann OPS-Ausprägung und DRG-Split verändern.',
    decisionTitle: 'Zeitkritische Therapie mit dem Stroke-Protokoll belegen',
    decisionDescription: 'Die wesentlichen Kriterien stehen in einem vorhandenen strukturierten Protokoll.',
    alternativeTitle: 'Symptomdiagnosen nach gesichertem Hirninfarkt bereinigen',
    typicality: 'typisch',
    comparableCases: 119,
  },
  'urology-standard': {
    label: 'Standardnaher Harnleiterstein',
    specialty: 'Urologie',
    pathway: 'Urologie',
    complexity: 'standardnah',
    difficulty: 'einfach',
    mainCode: 'N20.1',
    mainDiagnosis: 'Harnleiterstein · illustrative Demoangabe',
    secondaryDiagnoses: [['N13.2', 'Harnstau · illustrative Demoangabe']],
    procedures: [['5-56x.x', 'Endoskopische Steinbehandlung · illustrative Demoangabe']],
    drg: 'L20B · Demo',
    baseDrg: 'L20',
    diagnosticEvent: 'Sonographie und Schnittbilddiagnostik',
    interventionEvent: 'Endoskopische Steinbehandlung',
    therapyEvent: 'Kurzzeitige postoperative Überwachung',
    courseDocument: 'Urologischer Entlassungsbericht',
    keyDocument: 'Endourologischer OP-Bericht',
    contextDocument: 'Sonographischer Befund',
    keyAvailable: true,
    keyReason: 'Seite, Lokalisation und Verfahren sind im OP-Bericht eindeutig dokumentiert.',
    keyCodingNote: 'Vorkodierung stimmt mit dem dokumentierten Verfahren überein.',
    keyImpact: 'Kein realistischer DRG-Wechsel; der Fall kann nach kurzem Abgleich abgeschlossen werden.',
    decisionTitle: 'Vorkodierung mit einem Bericht verifizieren',
    decisionDescription: 'Dieser Fall testet, ob Kodierende einen sicheren Standardfall früh beenden.',
    alternativeTitle: 'Keine zusätzlichen Dokumente anfordern',
    typicality: 'typisch',
    comparableCases: 211,
  },
  'high-volume': {
    label: 'Multimorbider Hochkomplexfall',
    specialty: 'Herzchirurgie',
    pathway: 'Herzchirurgie → Intensivmedizin → Kardiologie',
    complexity: 'komplex',
    difficulty: 'schwierig',
    mainCode: 'I35.0',
    mainDiagnosis: 'Aortenklappenstenose · illustrative Demoangabe',
    secondaryDiagnoses: [['I50.1', 'Linksherzinsuffizienz · illustrative Demoangabe'], ['N18.4', 'Chronische Nierenkrankheit · illustrative Demoangabe']],
    procedures: [['5-35a.x', 'Herzklappeneingriff · illustrative Demoangabe'], ['8-83x.x', 'Kreislaufunterstützung · illustrative Demoangabe']],
    drg: 'F03A · Demo',
    baseDrg: 'F03',
    diagnosticEvent: 'Präoperative Herz- und Gefäßdiagnostik',
    interventionEvent: 'Herzklappeneingriff mit Kreislaufunterstützung',
    therapyEvent: 'Langwierige intensivmedizinische Nachbehandlung',
    courseDocument: 'Interdisziplinärer Gesamtentlassungsbericht',
    keyDocument: 'Herzchirurgischer OP-Bericht',
    contextDocument: 'Intensivmedizinische Tageszusammenfassung',
    keyAvailable: true,
    keyReason: 'Der umfangreiche Fall enthält viele Kodes; nur wenige davon beeinflussen den führenden Grouperpfad.',
    keyCodingNote: 'Zuerst pfadbestimmende Prozedur, Organersatz und relevante Komplikationen prüfen.',
    keyImpact: 'Kann Basis-DRG, Schweregrad und Zusatzentgelte verändern.',
    decisionTitle: 'Pfadbestimmende Herzprozedur zuerst absichern',
    decisionDescription: 'Der Fall testet die Priorisierung bei 50 ICD- und 30 OPS-Zeilen.',
    alternativeTitle: 'Restliche Kodes erst nach stabiler DRG-Hypothese plausibilisieren',
    typicality: 'untypisch',
    comparableCases: 7,
    stressCounts: { icd: 50, ops: 30 },
  },
  'geriatrics-proof': {
    label: 'Geriatrischer Komplexbehandlungsfall',
    specialty: 'Geriatrie',
    pathway: 'Unfallchirurgie → Geriatrie',
    complexity: 'prüfbedürftig',
    difficulty: 'schwierig',
    mainCode: 'S32.0',
    mainDiagnosis: 'Fraktur eines Lendenwirbels · illustrative Demoangabe',
    secondaryDiagnoses: [['R26.2', 'Gehstörung · illustrative Demoangabe'], ['E46', 'Mangelernährung · illustrative Demoangabe']],
    procedures: [['8-550.x', 'Geriatrische frührehabilitative Komplexbehandlung · illustrative Demoangabe']],
    drg: 'I41Z · Demo',
    baseDrg: 'I41',
    diagnosticEvent: 'Bildgebung und geriatrisches Assessment',
    interventionEvent: 'Konservative Frakturbehandlung',
    therapyEvent: 'Interdisziplinäre geriatrische Komplexbehandlung',
    courseDocument: 'Geriatrischer Entlassungsbericht',
    keyDocument: 'Leistungsnachweis Geriatrische Komplexbehandlung',
    contextDocument: 'Therapieplan Physiotherapie',
    keyAvailable: false,
    keyReason: 'Der Verlauf spricht für die Komplexbehandlung, der zusammenfassende Mindestmerkmalsnachweis fehlt jedoch.',
    keyCodingNote: 'OPS erst nach vollständig belegten Mindestmerkmalen übernehmen.',
    keyImpact: 'Kann den geriatrischen DRG-Pfad vollständig öffnen oder schließen.',
    decisionTitle: 'Mindestmerkmale der Komplexbehandlung belegen',
    decisionDescription: 'Der fehlende Leistungsnachweis ist der wahrscheinlich stärkste Falsifikator der aktuellen DRG.',
    alternativeTitle: 'Nebendiagnosen nach gesichertem Behandlungspfad prüfen',
    typicality: 'typisch',
    comparableCases: 93,
  },
  'sepsis-pathogen': {
    label: 'Sepsis mit offenem Erregerbezug',
    specialty: 'Innere Medizin',
    pathway: 'Innere Medizin → Intensivmedizin',
    complexity: 'komplex',
    difficulty: 'schwierig',
    mainCode: 'A41.9',
    mainDiagnosis: 'Sepsis · illustrative Demoangabe',
    secondaryDiagnoses: [['J18.9', 'Pneumonie · illustrative Demoangabe'], ['N17.9', 'Akutes Nierenversagen · illustrative Demoangabe']],
    procedures: [['8-98f.x', 'Aufwendige intensivmedizinische Behandlung · illustrative Demoangabe']],
    drg: 'T60B · Demo',
    baseDrg: 'T60',
    diagnosticEvent: 'Infektionsdiagnostik und Organdysfunktionsbewertung',
    interventionEvent: 'Intensivmedizinische Stabilisierung',
    therapyEvent: 'Antimikrobielle Therapie und Organunterstützung',
    courseDocument: 'Internistisch-intensivmedizinischer Entlassungsbericht',
    keyDocument: 'Mikrobiologischer Endbefund mit ärztlicher Zuordnung',
    contextDocument: 'Labor- und Organdysfunktionsverlauf',
    keyAvailable: true,
    keyReason: 'Der Endbefund nennt einen Erreger, die klinische Zuordnung zur Sepsis muss jedoch im Dokument nachvollziehbar sein.',
    keyCodingNote: 'Erregerspezifizierung nur bei belastbarer ärztlicher Zuordnung übernehmen.',
    keyImpact: 'Kann Diagnosespezifizierung und Schweregrad verändern, möglicherweise aber nicht die Basis-DRG.',
    decisionTitle: 'Erregerspezifizierung am Endbefund validieren',
    decisionDescription: 'Der Fall trennt medizinisch interessante von tatsächlich gruppierungsrelevanten Informationen.',
    alternativeTitle: 'Organfunktionsdiagnosen nach Ressourcenaufwand prüfen',
    typicality: 'typisch',
    comparableCases: 74,
  },
}

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function applyDemoVariant(codingCase: CodingCase, variant?: DemoCaseVariant): CodingCase {
  if (!variant) return codingCase
  const spec = variantSpecs[variant]
  const admissionDate = codingCase.admissionDate ?? `${codingCase.year}-07-01`
  const keyDay = Math.max(2, Math.min(4, codingCase.stayDays - 2))
  const therapyDay = Math.max(keyDay + 1, Math.min(keyDay + 2, codingCase.stayDays - 1))
  const ids = {
    precode: `map-${variant}-precode`,
    course: `map-${variant}-course`,
    key: `map-${variant}-key`,
    context: `map-${variant}-context`,
  }

  const timeline: TreatmentEvent[] = [
    { id: `t-${variant}-1`, day: 1, time: '08:30', department: spec.specialty, type: 'Aufnahme', label: `Aufnahme · ${spec.label}`, linkedDocumentIds: [ids.course, ids.precode] },
    { id: `t-${variant}-2`, day: 2, time: '10:00', department: spec.specialty, type: 'Diagnostik', label: spec.diagnosticEvent, linkedDocumentIds: [ids.course, ids.context] },
    { id: `t-${variant}-3`, day: keyDay, time: '11:15', department: spec.specialty, type: 'Eingriff', label: spec.interventionEvent, linkedDocumentIds: [ids.key] },
    { id: `t-${variant}-4`, day: therapyDay, endDay: Math.max(therapyDay, codingCase.stayDays - 1), time: '09:00', department: spec.specialty, type: 'Therapie', label: spec.therapyEvent, linkedDocumentIds: [ids.course] },
    { id: `t-${variant}-5`, day: codingCase.stayDays, time: '11:00', department: spec.specialty, type: 'Entlassung', label: 'Entlassung oder Weiterverlegung', linkedDocumentIds: [ids.course] },
  ]

  const documentMap: DocumentMapItem[] = [
    {
      id: ids.precode, title: 'KIS-Vorkodierung · strukturierter Export', kind: 'vorkodierung', availability: 'vorhanden', relevance: 'stimmig', reviewLevel: 'grob-geprüft', priority: 'erledigt',
      startDay: 1, endDay: codingCase.stayDays, department: 'Gesamtfall', mapRow: 3,
      reason: 'Der strukturierte KIS-Stand bildet die Ausgangshypothese ab und wird nicht als klinischer Nachweis behandelt.',
      codingNote: `${spec.mainCode} und ${spec.procedures.length} OPS-Ausgangszeile(n) wurden übernommen.`,
      resultImpact: 'Referenz für alle späteren Änderungen.',
      outcomeDimensions: { drg: 'geprüft', ops: 'offen', entgelte: 'offen', kodierung: 'geprüft', mbeg: 'neutral' }, assessedIteration: 1, linkedDecisionId: `decision-${variant}-main`,
    },
    {
      id: ids.course, title: spec.courseDocument, kind: 'verlaufsbericht', availability: 'vorhanden', relevance: 'stimmig', reviewLevel: 'grob-geprüft', priority: 'erledigt',
      startDay: 1, endDay: codingCase.stayDays, department: spec.specialty, mapRow: 0,
      reason: `Der Bericht beschreibt den Gesamtverlauf ${spec.pathway} und stützt die führende Diagnosehypothese.`,
      codingNote: `${spec.mainDiagnosis} ist als Behandlungsanlass dokumentiert.`,
      resultImpact: 'Stützt den aktuellen DRG-Pfad, ersetzt aber nicht den spezifischen Ereignisnachweis.',
      outcomeDimensions: { drg: 'relevant', ops: 'offen', entgelte: 'neutral', kodierung: 'geprüft', mbeg: 'relevant' }, assessedIteration: 1, linkedDecisionId: `decision-${variant}-main`,
    },
    {
      id: ids.key, title: spec.keyDocument, kind: 'ereignisbericht', availability: spec.keyAvailable ? 'vorhanden' : 'fehlend', relevance: 'potenziell', reviewLevel: 'nachvalidierung', priority: 'jetzt',
      startDay: keyDay, department: spec.specialty, mapRow: 1, reason: spec.keyReason, codingNote: spec.keyCodingNote, resultImpact: spec.keyImpact,
      outcomeDimensions: { drg: 'relevant', ops: 'relevant', entgelte: 'offen', kodierung: 'offen', mbeg: 'relevant' }, assessedIteration: 1, linkedDecisionId: `decision-${variant}-main`,
    },
    {
      id: ids.context, title: spec.contextDocument, kind: 'nachweis', availability: 'vorhanden', relevance: 'neutral', reviewLevel: 'validiert', priority: 'erledigt',
      startDay: 2, department: spec.specialty, mapRow: 2,
      reason: 'Der Befund ist medizinisch plausibel, verändert die priorisierte Grouper-Hypothese derzeit aber nicht.',
      codingNote: 'Als Kontext geprüft; keine zusätzliche Kodierung allein aus diesem Dokument ableiten.',
      resultImpact: 'Derzeit kein realistischer Ergebniswechsel.',
      outcomeDimensions: { drg: 'neutral', ops: 'neutral', entgelte: 'neutral', kodierung: 'geprüft', mbeg: 'neutral' }, assessedIteration: 1, linkedDecisionId: `decision-${variant}-alternative`,
    },
  ]

  const codingEntries = buildCodingEntries(spec, variant, admissionDate, timeline, ids)
  const mainEntry = codingEntries.find((entry) => entry.type === 'HD')!
  const procedureEntries = codingEntries.filter((entry) => entry.type === 'OPS')

  return {
    ...codingCase,
    label: spec.label,
    complexity: spec.complexity,
    complexityReasons: [spec.pathway, spec.interventionEvent, spec.keyAvailable ? 'Schlüsseldokument vorhanden' : 'Schlüsseldokument fehlt'],
    hospitalTypicality: spec.typicality,
    hospitalTypicalityReason: spec.typicality === 'typisch' ? `${spec.label} kommt im hinterlegten Hausprofil regelmäßig vor.` : 'Für diesen Behandlungspfad stehen nur wenige historische Vergleichsfälle zur Verfügung.',
    comparableCases: spec.comparableCases,
    difficulty: spec.difficulty,
    difficultyReason: spec.difficulty === 'einfach' ? 'Stringenter Verlauf mit einem klaren Schlüsseldokument.' : `${spec.keyImpact} Mehrere mögliche Ergebniswirkungen erfordern eine priorisierte Prüfung.`,
    currentMainDiagnosis: `${mainEntry.code} · ${mainEntry.description}`,
    currentProcedures: procedureEntries.map((entry) => `${entry.code} · ${entry.description}`),
    timeline,
    documentMap,
    decisions: [
      {
        id: `decision-${variant}-main`, title: spec.decisionTitle, description: spec.decisionDescription, impact: 'hoch', required: true,
        status: 'entscheidung', requestedDocument: spec.keyDocument, effect: spec.keyImpact, groupingRelevance: 'relevant', knowledge: 'vertraut',
      },
      {
        id: `decision-${variant}-alternative`, title: spec.alternativeTitle, description: 'Dieser Pfad bleibt nachgeordnet, solange der erste Prüfpunkt die Hypothese nicht falsifiziert.', impact: 'mittel', required: false,
        status: 'ungeklärt', requestedDocument: spec.contextDocument, effect: 'Nur bei neuer Ergebnisvarianz vertiefen.', groupingRelevance: 'möglich', knowledge: 'unsicher',
      },
    ],
    grouperRuns: [{
      ...codingCase.grouperRuns[0],
      id: `run-${codingCase.id}-${variant}-1`,
      drg: spec.drg,
      baseDrg: spec.baseDrg,
      pccL: spec.complexity === 'komplex' ? 3 : spec.complexity === 'prüfbedürftig' ? 2 : 1,
      reason: `Vorkodierung für den synthetischen Testfall „${spec.label}“ gruppiert.`,
      lengthOfStay: getDrgLengthOfStayProfile(spec.drg),
    }],
    codingEntries,
    dkrMatches: [{ id: `dkr-${variant}-main`, title: 'DKR-Demo · Hauptdiagnose und Prozeduren', relevance: spec.decisionDescription, status: 'spezifisch' }],
    medicalJustification: {
      status: 'entwurf-belegbar',
      categories: [spec.specialty, spec.interventionEvent],
      evidenceDocumentIds: [ids.course, ...(spec.keyAvailable ? [ids.key] : [])],
      missingEvidence: spec.keyAvailable ? [] : [spec.keyDocument],
      draft: `Der synthetische Behandlungsverlauf „${spec.label}“ ist durch den Gesamtbericht belegt. Die stationäre Intensität ergibt sich aus ${spec.interventionEvent.toLowerCase()} und ${spec.therapyEvent.toLowerCase()}.`,
      reviewed: false,
    },
  }
}

function buildCodingEntries(spec: VariantSpec, variant: DemoCaseVariant, admissionDate: string, timeline: TreatmentEvent[], ids: { precode: string; course: string; key: string; context: string }): CodingEntry[] {
  const entries: CodingEntry[] = [
    makeEntry(`coding-${variant}-hd`, 'HD', spec.mainCode, spec.mainDiagnosis, ids.course, timeline[0].id, admissionDate, spec.specialty, 'pfadbestimmend'),
    ...spec.secondaryDiagnoses.map(([code, description], index) => makeEntry(`coding-${variant}-nd-${index + 1}`, 'ND', code, description, ids.context, timeline[1].id, addDays(admissionDate, 1), spec.specialty, 'potenziell')),
    ...spec.procedures.map(([code, description], index) => makeEntry(`coding-${variant}-ops-${index + 1}`, 'OPS', code, description, ids.key, timeline[2].id, addDays(admissionDate, timeline[2].day - 1), spec.specialty, 'split-relevant')),
  ]
  if (!spec.stressCounts) return entries

  const currentIcd = entries.filter((entry) => entry.type !== 'OPS').length
  const currentOps = entries.filter((entry) => entry.type === 'OPS').length
  for (let index = currentIcd; index < spec.stressCounts.icd; index += 1) {
    entries.push(makeEntry(`coding-${variant}-stress-nd-${index + 1}`, 'ND', `DEMO-ND-${String(index + 1).padStart(2, '0')}`, `Synthetische Nebendiagnose ${index + 1} · Belastungstest`, ids.context, timeline[1].id, addDays(admissionDate, 1), spec.specialty, index < 7 ? 'potenziell' : 'ohne-änderung'))
  }
  for (let index = currentOps; index < spec.stressCounts.ops; index += 1) {
    entries.push(makeEntry(`coding-${variant}-stress-ops-${index + 1}`, 'OPS', `DEMO-OPS-${String(index + 1).padStart(2, '0')}`, `Synthetische Prozedur ${index + 1} · Belastungstest`, ids.key, timeline[2].id, addDays(admissionDate, timeline[2].day - 1), spec.specialty, index < 5 ? 'potenziell' : 'ohne-änderung'))
  }
  return entries
}

function makeEntry(id: string, type: CodingEntry['type'], code: string, description: string, evidenceDocumentId: string, treatmentEventId: string, serviceDate: string, department: string, groupingImpact: NonNullable<CodingEntry['groupingImpact']>): CodingEntry {
  return {
    id, type, code, description, change: 'unchanged', origin: 'vorkodierung', reviewStatus: groupingImpact === 'ohne-änderung' ? 'wahrscheinlich' : 'ungeprüft', active: true,
    source: 'KIS-Vorkodierung · synthetischer Testfall', evidenceDocumentId, treatmentEventId, serviceDate, department, assessedIteration: 1, groupingImpact,
    groupingImpactReason: groupingImpact === 'ohne-änderung' ? 'In der ersten Varianzbewertung ohne Einfluss auf den führenden Pfad.' : 'Wird im priorisierten Prüfpfad gegen das Schlüsseldokument validiert.',
  }
}

export function attachReadableDemoDocuments(codingCase: CodingCase): CodingCase {
  const documents = [...codingCase.documents]
  const documentMap = codingCase.documentMap.map((item) => {
    if (item.availability !== 'vorhanden') return item
    const linkedSource = item.sourceDocumentId ? documents.find((document) => document.id === item.sourceDocumentId) : undefined
    if (linkedSource?.previewText?.trim()) return item

    const sourceId = `source-${item.id}`
    const existing = documents.find((document) => document.id === sourceId)
    if (!existing) documents.push(createReadableDocument(codingCase, item, sourceId))
    return { ...item, sourceDocumentId: sourceId }
  })
  return { ...codingCase, documents, documentMap }
}

function createReadableDocument(codingCase: CodingCase, item: DocumentMapItem, id: string): CaseDocument {
  const startDate = codingCase.admissionDate ? addDays(codingCase.admissionDate, item.startDay - 1) : `Tag ${item.startDay}`
  const endDate = item.endDay && codingCase.admissionDate ? addDays(codingCase.admissionDate, item.endDay - 1) : undefined
  return {
    id,
    name: `${item.title} · synthetisches Demodokument.txt`,
    kind: item.kind === 'vorkodierung' ? 'KIS-Kodierexport' : 'Synthetisches klinisches Dokument',
    addedAt: codingCase.createdAt,
    status: 'ausgewertet',
    mimeType: 'text/plain',
    previewLabel: 'Vollständige Textansicht im Kodierarbeitsplatz',
    previewText: [
      item.title,
      'SYNTHETISCHES DEMODOKUMENT · keine reale Patienteninformation',
      `Fall: ${codingCase.caseNumber} · Fachabteilung: ${item.department}`,
      `Dokumentzeitraum: ${startDate}${endDate ? ` bis ${endDate}` : ''}`,
      '',
      'Klinischer Anlass',
      item.reason,
      '',
      'Dokumentierter Sachverhalt',
      `Der Behandlungsabschnitt wurde im Rahmen des Testfalls „${codingCase.label}“ durchgeführt. Die zeitliche Zuordnung und der Bezug zum Behandlungsverlauf wurden aus den synthetischen Quelldaten übernommen.`,
      '',
      'Kodierrelevante Belegstelle',
      item.codingNote,
      '',
      'Bewertung im aktuellen Prüfpfad',
      item.resultImpact,
      '',
      'Freigabevermerk',
      'Dieses Dokument ist vollständig innerhalb des Prototyps einsehbar. Die Angaben dienen ausschließlich dem Usertest und sind fachlich nicht als reale Kodierempfehlung validiert.',
    ].join('\n'),
  }
}
