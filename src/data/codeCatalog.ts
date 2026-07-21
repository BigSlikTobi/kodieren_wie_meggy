/**
 * Minimaler, lokaler Katalogprovider für den Usertest.
 *
 * Der Provider hält die UI bewusst unabhängig vom späteren Import der
 * jahresbezogenen BfArM-Dateien (z. B. ClaML/XML). Ein produktiver Provider
 * muss nur dieselben resolve/search-Methoden implementieren.
 */
export type CodeCatalogKind = 'ICD' | 'OPS'

export interface CodeCatalogEntry {
  kind: CodeCatalogKind
  code: string
  shortText: string
  searchTerms?: string[]
}

export interface CodeCatalogProvider {
  year: number
  sourceLabel: string
  resolve: (kind: CodeCatalogKind, code: string) => CodeCatalogEntry | undefined
  resolveCategory: (kind: CodeCatalogKind, code: string) => CodeCatalogEntry | undefined
  search: (kind: CodeCatalogKind, query: string, limit?: number) => CodeCatalogEntry[]
}

export const CODE_CATALOG_SOURCE = 'BfArM · 2026 · Demoindex'

// Amtliche Bezeichnungen beziehungsweise aus der amtlichen Hierarchie
// zusammengesetzte Kurztexte der ICD-10-GM und des OPS 2026. Der Demoindex
// enthält gezielt die Kodes der synthetischen Testfälle, nicht die Vollkataloge.
export const demoCodeCatalogEntries: CodeCatalogEntry[] = [
  { kind: 'ICD', code: 'A41.9', shortText: 'Sepsis, nicht näher bezeichnet', searchTerms: ['Blutvergiftung', 'Sepsis'] },
  { kind: 'ICD', code: 'C34.9', shortText: 'Bösartige Neubildung: Bronchus oder Lunge, nicht näher bezeichnet', searchTerms: ['Bronchialkarzinom', 'Lungenkarzinom', 'Tumor'] },
  { kind: 'ICD', code: 'E46', shortText: 'Nicht näher bezeichnete Energie- und Eiweißmangelernährung', searchTerms: ['Mangelernährung', 'Malnutrition'] },
  { kind: 'ICD', code: 'I25.12', shortText: 'Atherosklerotische Herzkrankheit: Zwei-Gefäß-Erkrankung', searchTerms: ['KHK', 'Koronare Herzkrankheit', 'Zweigefäßerkrankung'] },
  { kind: 'ICD', code: 'I35.0', shortText: 'Aortenklappenstenose', searchTerms: ['Aortenstenose', 'Herzklappe'] },
  { kind: 'ICD', code: 'I48.0', shortText: 'Vorhofflimmern, paroxysmal', searchTerms: ['Paroxysmales Vorhofflimmern', 'VHF'] },
  { kind: 'ICD', code: 'I50.1', shortText: 'Linksherzinsuffizienz', searchTerms: ['Herzinsuffizienz', 'Linksherz'] },
  { kind: 'ICD', code: 'I50.9', shortText: 'Herzinsuffizienz, nicht näher bezeichnet', searchTerms: ['Herzschwäche', 'Herzinsuffizienz'] },
  { kind: 'ICD', code: 'I63.9', shortText: 'Hirninfarkt, nicht näher bezeichnet', searchTerms: ['Schlaganfall', 'Apoplex'] },
  { kind: 'ICD', code: 'J18.9', shortText: 'Pneumonie, nicht näher bezeichnet', searchTerms: ['Lungenentzündung', 'Pneumonie'] },
  { kind: 'ICD', code: 'J96.0', shortText: 'Akute respiratorische Insuffizienz, anderenorts nicht klassifiziert', searchTerms: ['Ateminsuffizienz', 'respiratorisch'] },
  { kind: 'ICD', code: 'K35.8', shortText: 'Sonstige und nicht näher bezeichnete akute Appendizitis', searchTerms: ['Blinddarmentzündung', 'Appendizitis'] },
  { kind: 'ICD', code: 'M81.0', shortText: 'Postmenopausale Osteoporose', searchTerms: ['Osteoporose', 'Knochenschwund'] },
  { kind: 'ICD', code: 'N13.2', shortText: 'Hydronephrose bei Obstruktion durch Nieren- und Ureterstein', searchTerms: ['Harnstau', 'Hydronephrose'] },
  { kind: 'ICD', code: 'N17.9', shortText: 'Akutes Nierenversagen, nicht näher bezeichnet', searchTerms: ['Nierenversagen', 'Niereninsuffizienz'] },
  { kind: 'ICD', code: 'N18.4', shortText: 'Chronische Nierenkrankheit, Stadium 4', searchTerms: ['Niereninsuffizienz', 'CKD 4'] },
  { kind: 'ICD', code: 'N20.1', shortText: 'Ureterstein', searchTerms: ['Harnleiterstein', 'Stein'] },
  { kind: 'ICD', code: 'R10.3', shortText: 'Schmerzen mit Lokalisation in anderen Teilen des Unterbauches', searchTerms: ['Unterbauchschmerz', 'Bauchschmerz'] },
  { kind: 'ICD', code: 'R26.2', shortText: 'Gehbeschwerden, anderenorts nicht klassifiziert', searchTerms: ['Gehstörung', 'Mobilität'] },
  { kind: 'ICD', code: 'R47.0', shortText: 'Dysphasie und Aphasie', searchTerms: ['Sprachstörung', 'Aphasie'] },
  { kind: 'ICD', code: 'S32.0', shortText: 'Fraktur eines Lendenwirbels', searchTerms: ['Lendenwirbelfraktur', 'Wirbelfraktur'] },
  { kind: 'ICD', code: 'S72.0', shortText: 'Schenkelhalsfraktur', searchTerms: ['Oberschenkelhalsfraktur', 'Femurfraktur', 'Hüftfraktur'] },

  { kind: 'OPS', code: '1-275.0', shortText: 'Transarterielle Linksherz-Katheteruntersuchung: Koronarangiographie ohne weitere Maßnahmen', searchTerms: ['Herzkatheter', 'Koronarangiographie'] },
  { kind: 'OPS', code: '1-620.0', shortText: 'Diagnostische Tracheobronchoskopie: Mit flexiblem Instrument', searchTerms: ['Bronchoskopie', 'Lungenspiegelung'] },
  { kind: 'OPS', code: '5-35a', shortText: 'Minimalinvasive Operationen an Herzklappen', searchTerms: ['Herzklappe', 'TAVI', 'Klappeneingriff'] },
  { kind: 'OPS', code: '5-470', shortText: 'Appendektomie', searchTerms: ['Blinddarmoperation', 'Appendix'] },
  { kind: 'OPS', code: '5-56', shortText: 'Operationen an den Harnleitern', searchTerms: ['Ureter', 'Harnleiter', 'Steinbehandlung'] },
  { kind: 'OPS', code: '5-79', shortText: 'Reposition von Fraktur und Luxation', searchTerms: ['Frakturversorgung', 'Osteosynthese', 'Reposition'] },
  { kind: 'OPS', code: '8-020.8', shortText: 'Therapeutische Injektion: Systemische Thrombolyse', searchTerms: ['Lyse', 'Thrombolyse', 'Stroke'] },
  { kind: 'OPS', code: '8-542.11', shortText: 'Nicht komplexe Chemotherapie: 1 Tag: 1 Substanz', searchTerms: ['Chemotherapie', 'Tumortherapie', 'Zytostatika'] },
  { kind: 'OPS', code: '8-550', shortText: 'Geriatrische frührehabilitative Komplexbehandlung', searchTerms: ['Geriatrie', 'Frührehabilitation', 'Komplexbehandlung'] },
  { kind: 'OPS', code: '8-71', shortText: 'Maschinelle Beatmung und Atemunterstützung über Maske oder Tubus und Beatmungsentwöhnung', searchTerms: ['Beatmung', 'Weaning', 'Atemunterstützung'] },
  { kind: 'OPS', code: '8-837', shortText: 'Perkutan-transluminale Gefäßintervention an Herz und Koronargefäßen', searchTerms: ['Koronarintervention', 'PTCA', 'Stent'] },
  { kind: 'OPS', code: '8-83', shortText: 'Therapeutische Katheterisierung und Kanüleneinlage in Gefäße', searchTerms: ['Katheter', 'Kreislaufunterstützung'] },
  { kind: 'OPS', code: '8-854', shortText: 'Hämodialyse', searchTerms: ['Dialyse', 'Nierenersatzverfahren'] },
  { kind: 'OPS', code: '8-981', shortText: 'Neurologische Komplexbehandlung des akuten Schlaganfalls', searchTerms: ['Stroke Unit', 'Schlaganfall', 'Komplexbehandlung'] },
  { kind: 'OPS', code: '8-98f', shortText: 'Aufwendige intensivmedizinische Komplexbehandlung (Basisprozedur)', searchTerms: ['Intensivmedizin', 'SAPS', 'TISS', 'Komplexbehandlung'] },
]

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/[–—]/g, '-')
    .trim()
}

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, '').trim()
}

function resolveFrom(entries: CodeCatalogEntry[], kind: CodeCatalogKind, code: string) {
  const normalized = normalizeCode(code)
  if (!normalized) return undefined
  return entries.find((entry) => entry.kind === kind && normalizeCode(entry.code) === normalized)
}

function resolveCategoryFrom(entries: CodeCatalogEntry[], kind: CodeCatalogKind, code: string) {
  const normalized = normalizeCode(code)
  if (!normalized) return undefined
  return entries
    .filter((entry) => entry.kind === kind)
    .filter((entry) => {
      const candidate = normalizeCode(entry.code)
      return normalized.length > candidate.length && normalized.startsWith(candidate)
    })
    .sort((a, b) => b.code.length - a.code.length)[0]
}

function searchIn(entries: CodeCatalogEntry[], kind: CodeCatalogKind, query: string, limit = 8) {
  const needle = fold(query)
  if (needle.length < 2) return []

  return entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => {
      const code = fold(entry.code)
      const text = fold(entry.shortText)
      const terms = fold(entry.searchTerms?.join(' ') ?? '')
      const score = code === needle ? 0 : code.startsWith(needle) ? 1 : code.includes(needle) ? 2 : text.startsWith(needle) ? 3 : text.includes(needle) ? 4 : terms.includes(needle) ? 5 : 99
      return { entry, score }
    })
    .filter(({ score }) => score < 99)
    .sort((a, b) => a.score - b.score || a.entry.code.localeCompare(b.entry.code, 'de-DE'))
    .slice(0, limit)
    .map(({ entry }) => entry)
}

export const demoCodeCatalog: CodeCatalogProvider = {
  year: 2026,
  sourceLabel: CODE_CATALOG_SOURCE,
  resolve: (kind, code) => resolveFrom(demoCodeCatalogEntries, kind, code),
  resolveCategory: (kind, code) => resolveCategoryFrom(demoCodeCatalogEntries, kind, code),
  search: (kind, query, limit) => searchIn(demoCodeCatalogEntries, kind, query, limit),
}

export function getCatalogText(kind: CodeCatalogKind, code: string, fallback = '') {
  const entry = demoCodeCatalog.resolve(kind, code)
  const category = entry ? undefined : demoCodeCatalog.resolveCategory(kind, code)
  const cleanedFallback = fallback.replace(/\s*·\s*illustrative Demoangabe\s*$/i, '').trim()
  return {
    shortText: entry?.shortText
      ?? (cleanedFallback || (category
        ? `${category.shortText} · Oberkategorie ${category.code}; exakter Katalogtext im Demoindex nicht vorhanden`
        : 'Kein Katalogtext im Demoindex vorhanden')),
    sourceLabel: entry
      ? demoCodeCatalog.sourceLabel
      : category
        ? `${cleanedFallback ? 'Arbeitsbeschreibung' : 'BfArM-Katalogkontext'} · nur Oberkategorie ${category.code}, kein exakter Treffer`
        : 'Arbeitsbeschreibung · nicht im Demoindex',
    official: Boolean(entry),
    matchLevel: entry ? 'exact' as const : category ? 'category' as const : 'none' as const,
  }
}
