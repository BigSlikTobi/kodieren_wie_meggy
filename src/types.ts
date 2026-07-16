export type View = 'start' | 'case' | 'hospitals' | 'rules'
export type CaseComplexity = 'standardnah' | 'prüfbedürftig' | 'komplex'
export type EvidenceStatus =
  | 'belegt'
  | 'wahrscheinlich'
  | 'ungeklärt'
  | 'widersprüchlich'
  | 'ausgeschlossen'
  | 'entscheidung'

export type RuleType =
  | 'Offizielle Regel'
  | 'Medizinische Plausibilität'
  | 'Interner Standard'
  | 'Erfahrungswert'
  | 'Medizinische Begründung'

export type RuleStatus = 'Entwurf' | 'Geprüft' | 'Freigegeben' | 'Ersetzt' | 'Abgekündigt'

export interface KisScreenshot {
  id: string
  fileName: string
  caption: string
}

export interface KisGuide {
  id: string
  documentKind: string
  module: string
  navigationPath: string[]
  searchTerm: string
  instruction: string
  notes: string
  validFrom: string
  reviewedAt: string
  owner: string
  screenshots: KisScreenshot[]
}

export interface SiteYearProfile {
  siteId: string
  siteName: string
  year: number
  structures: string[]
  nubs: string[]
  historicalCases: number
  updatedAt: string
  dataQuality: 'vollständig' | 'prüfen'
  uploadedFiles: string[]
  kisGuides: KisGuide[]
}

export interface HospitalProfile {
  id: string
  name: string
  city: string
  profiles: SiteYearProfile[]
}

export interface TreatmentEvent {
  id: string
  day: number
  endDay?: number
  department: string
  type: 'Aufnahme' | 'Diagnostik' | 'Eingriff' | 'Therapie' | 'Verlegung' | 'Intensiv' | 'Entlassung'
  label: string
}

export interface CaseDocument {
  id: string
  name: string
  kind: string
  addedAt: string
  status: 'ausgewertet' | 'wird geprüft'
  supports?: string
}

export type DocumentMapKind = 'verlaufsbericht' | 'ereignisbericht' | 'nachweis' | 'vorkodierung'
export type DocumentAvailability = 'vorhanden' | 'fehlend'
export type DocumentRelevance = 'neutral' | 'stimmig' | 'potenziell' | 'offen'
export type DocumentReviewLevel = 'erfasst' | 'grob-geprüft' | 'nachvalidierung' | 'validiert' | 'nicht-angefordert'
export type OutcomeDimensionStatus = 'neutral' | 'offen' | 'relevant' | 'geprüft'

export interface DocumentOutcomeDimensions {
  drg: OutcomeDimensionStatus
  ops: OutcomeDimensionStatus
  entgelte: OutcomeDimensionStatus
  kodierung: OutcomeDimensionStatus
  mbeg: OutcomeDimensionStatus
}

export interface DocumentMapItem {
  id: string
  title: string
  kind: DocumentMapKind
  availability: DocumentAvailability
  relevance: DocumentRelevance
  reviewLevel: DocumentReviewLevel
  priority: 'jetzt' | 'später' | 'erledigt'
  startDay: number
  endDay?: number
  department: string
  mapRow: number
  reason: string
  codingNote: string
  resultImpact: string
  outcomeDimensions: DocumentOutcomeDimensions
  assessedIteration: number
  linkedDecisionId?: string
}

export interface CaseDecision {
  id: string
  title: string
  description: string
  impact: 'hoch' | 'mittel' | 'niedrig'
  required: boolean
  status: EvidenceStatus
  requestedDocument: string
  effect: string
  groupingRelevance: 'keine' | 'möglich' | 'relevant'
  knowledge: 'vertraut' | 'unsicher' | 'fremd'
  resolution?: string
}

export interface GrouperRun {
  id: string
  iteration: number
  timestamp: string
  drg: string
  baseDrg: string
  pccL: number
  reason: string
  changed: boolean
  extras: string[]
}

export interface DkrMatch {
  id: string
  title: string
  relevance: string
  status: 'spezifisch' | 'allgemein'
}

export interface CodingConsultation {
  id: string
  decisionId: string
  specialty: string
  question: string
  expert: string
  priority: 'normal' | 'dringend'
  status: 'angefragt' | 'in Bearbeitung' | 'abgeschlossen'
  createdAt: string
  result?: 'bestätigt' | 'geändert' | 'weiter ungeklärt'
  finding?: string
}

export interface WikiMessage {
  id: string
  author: 'Kodierfachkraft' | 'Wiki-Assistent'
  text: string
  createdAt: string
}

export interface WikiThread {
  id: string
  decisionId: string
  title: string
  messages: WikiMessage[]
  createdAt: string
}

export type MbegStatus = 'entwurf-belegbar' | 'nachweis-fehlt' | 'fachprüfung' | 'kein-bedarf' | 'nicht-belastbar'

export interface MedicalJustification {
  status: MbegStatus
  categories: string[]
  evidenceDocumentIds: string[]
  missingEvidence: string[]
  draft: string
  reviewed: boolean
  reviewer?: string
}

export interface CodingCase {
  id: string
  label: string
  hospitalId: string
  siteId: string
  year: number
  age: number
  stayDays: number
  careForm: 'Normalstation' | 'Normal- und Intensivstation'
  complexity: CaseComplexity
  complexityReasons: string[]
  hospitalTypicality: 'typisch' | 'untypisch' | 'ungeklärt'
  hospitalTypicalitySource: 'technisch' | 'manuell'
  hospitalTypicalityReason: string
  comparableCases: number
  difficulty: 'einfach' | 'schwierig'
  difficultySource: 'technisch' | 'manuell'
  difficultyReason: string
  dkrMatches: DkrMatch[]
  consultations: CodingConsultation[]
  wikiThreads: WikiThread[]
  scenario: 'pulmo-onko' | 'standard'
  status: 'offen' | 'abgeschlossen'
  currentMainDiagnosis: string
  currentProcedures: string[]
  timeline: TreatmentEvent[]
  documents: CaseDocument[]
  documentMap: DocumentMapItem[]
  decisions: CaseDecision[]
  grouperRuns: GrouperRun[]
  medicalJustification: MedicalJustification
  createdAt: string
}

export interface RuleDefinition {
  id: string
  name: string
  type: RuleType
  status: RuleStatus
  year: number
  scope: string
  naturalText: string
  trigger: string
  conditions: string[]
  exclusions: string[]
  evidence: string[]
  reaction: string
  impactTest?: {
    affectedCases: number
    changedSuggestions: number
    changedDrgs: number
  }
}

export interface AppData {
  hospitals: HospitalProfile[]
  cases: CodingCase[]
  rules: RuleDefinition[]
  currentCaseId?: string
}

export interface NewCaseInput {
  hospitalId: string
  siteId: string
  year: number
  age: number
  stayDays: number
  careForm: CodingCase['careForm']
  scenario: CodingCase['scenario']
  files: string[]
}
