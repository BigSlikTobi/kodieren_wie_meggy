import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileCheck2,
  FileCode2,
  FileQuestion,
  FileText,
  Map,
  MessageCircle,
  Monitor,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react'
import type { CodingCase, CodingEntry, DocumentMapItem, KisGuide, OutcomeDimensionStatus, TreatmentEvent } from '../types'
import { KisSchematic } from './HospitalsView'
import { EventIcon, formatDay } from './TreatmentRibbon'

interface DocumentLandscapeProps {
  codingCase: CodingCase
  onOpenDecision: (decisionId: string) => void
  onOpenCollaboration: (mode: 'consult' | 'wiki', decisionId: string) => void
  onConfirmReview: (documentId: string) => void
  onOpenCodingEntry: (documentId: string) => void
  kisGuides: KisGuide[]
  initialEventId?: string
  initialDocumentId?: string
}

const kindLabels: Record<DocumentMapItem['kind'], string> = {
  verlaufsbericht: 'Verlaufsbericht',
  ereignisbericht: 'Ereignisbericht',
  nachweis: 'Nachweis',
  vorkodierung: 'Vorkodierung',
}

export function DocumentLandscape({
  codingCase,
  onOpenDecision,
  onOpenCollaboration,
  onConfirmReview,
  onOpenCodingEntry,
  kisGuides,
  initialEventId,
  initialDocumentId,
}: DocumentLandscapeProps) {
  const documents = codingCase.documentMap ?? []
  const eventFromFocus = codingCase.timeline.find((event) => event.id === initialEventId)
  const focusedDocumentId = initialDocumentId ?? (eventFromFocus?.linkedDocumentIds?.length === 1 ? eventFromFocus.linkedDocumentIds[0] : undefined)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>(focusedDocumentId)
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId)
  const nowDocuments = documents.filter((item) => item.priority === 'jetzt')
  const doneDocuments = documents.filter((item) => item.priority !== 'jetzt')
  const relevantDocuments = documents.filter((item) => item.relevance === 'potenziell' || item.reviewLevel === 'nachvalidierung')
  const missingRelevant = documents.filter((item) => item.availability === 'fehlend' && item.priority === 'jetzt')
  const events = useMemo(() => [...codingCase.timeline].sort((a, b) => a.day - b.day || (a.time ?? '').localeCompare(b.time ?? '')), [codingCase.timeline])

  useEffect(() => {
    setSelectedDocumentId(focusedDocumentId)
    if (!initialEventId) return
    requestAnimationFrame(() => {
      const element = document.getElementById(`landscape-event-${initialEventId}`)
      if (typeof element?.scrollIntoView === 'function') element.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [focusedDocumentId, initialEventId])

  return (
    <section className="document-landscape" aria-labelledby="document-landscape-title">
      <div className="landscape-heading">
        <div>
          <div className="page-kicker">Dokumente und Kodierung · Iteration {codingCase.grouperRuns.at(-1)?.iteration ?? 1}</div>
          <h2 id="document-landscape-title">Falllandkarte</h2>
          <p>Jedes Ereignis zeigt seine Dokumente und Kodes. So bleibt auch ein langer Verlauf prüfbar.</p>
        </div>
        <div className="landscape-facts" aria-label="Dokumentenlage">
          <span><strong>{documents.length}</strong> Dokumente</span>
          <span><strong>{codingCase.codingEntries.length}</strong> Kodes</span>
          <span><strong>{missingRelevant.length}</strong> fehlt jetzt</span>
        </div>
      </div>

      <div className="chronology-map" role="list" aria-label="Behandlungskette mit Dokumenten und Kodierung">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            codingCase={codingCase}
            documents={documents}
            focused={event.id === initialEventId}
            onSelectDocument={setSelectedDocumentId}
          />
        ))}
      </div>

      <div className="document-worklist">
        <div className="worklist-now">
          <div className="worklist-title"><span><FileQuestion aria-hidden="true" /><strong>Jetzt prüfen</strong></span><span>{nowDocuments.length}</span></div>
          {nowDocuments.length === 0 ? (
            <div className="worklist-empty"><Check aria-hidden="true" /> Keine ergebnisrelevante Dokumentenprüfung offen.</div>
          ) : nowDocuments.map((item) => <DocumentTask key={item.id} document={item} codingCase={codingCase} onSelect={setSelectedDocumentId} />)}
        </div>
        <details className="worklist-done">
          <summary><span><FileCheck2 aria-hidden="true" /><strong>Vorläufig erledigt</strong></span><span>{doneDocuments.length}<ChevronDown aria-hidden="true" /></span></summary>
          <div>{doneDocuments.map((item) => <DocumentTask key={item.id} document={item} codingCase={codingCase} onSelect={setSelectedDocumentId} />)}</div>
        </details>
      </div>

      {selectedDocument && (
        <DocumentDetail
          document={selectedDocument}
          codingCase={codingCase}
          kisGuide={findKisGuide(selectedDocument, kisGuides)}
          onClose={() => setSelectedDocumentId(undefined)}
          onOpenDecision={(decisionId) => {
            setSelectedDocumentId(undefined)
            onOpenDecision(decisionId)
          }}
          onOpenCollaboration={onOpenCollaboration}
          onConfirmReview={onConfirmReview}
          onOpenCodingEntry={onOpenCodingEntry}
        />
      )}
    </section>
  )
}

function EventRow({ event, codingCase, documents, focused, onSelectDocument }: {
  event: TreatmentEvent
  codingCase: CodingCase
  documents: DocumentMapItem[]
  focused: boolean
  onSelectDocument: (id: string) => void
}) {
  const linkedDocuments = documents.filter((item) => event.linkedDocumentIds?.includes(item.id))
  const linkedCodes = codingCase.codingEntries.filter((entry) => entry.treatmentEventId === event.id || linkedDocuments.some((item) => item.id === entry.evidenceDocumentId))
  return (
    <article id={`landscape-event-${event.id}`} className={`chronology-event ${focused ? 'is-focused' : ''}`} role="listitem">
      <div className="chronology-date">
        <strong>{formatDay(codingCase, event.day)}</strong>
        <span>{event.time ?? 'Zeit offen'}</span>
        {event.endDay && <small>bis {formatDay(codingCase, event.endDay)}</small>}
      </div>
      <span className={`event-chip-icon event-${event.type.toLowerCase()}`}><EventIcon event={event} /></span>
      <div className="chronology-content">
        <div className="chronology-event-head">
          <span><small>{event.type} · {event.department}</small><strong>{event.label}</strong></span>
          <span>{linkedDocuments.length} Dokumente · {linkedCodes.length} Kodes</span>
        </div>
        <div className="chronology-links">
          <div className="chronology-documents">
            {linkedDocuments.length ? linkedDocuments.map((item) => {
              const status = getDocumentStatus(item)
              return (
                <button type="button" key={item.id} className={status.className} onClick={() => onSelectDocument(item.id)}>
                  {item.availability === 'fehlend' ? <FileQuestion aria-hidden="true" /> : <FileText aria-hidden="true" />}
                  <span><strong>{item.title}</strong><small>{status.label}</small></span>
                </button>
              )
            }) : <span className="chronology-empty">Kein Dokument verknüpft</span>}
          </div>
          <div className="chronology-codes">
            {linkedCodes.length ? linkedCodes.map((entry) => <CodeBadge entry={entry} key={entry.id} />) : <span className="chronology-empty">Noch kein Kode aus diesem Ereignis</span>}
          </div>
        </div>
      </div>
    </article>
  )
}

function CodeBadge({ entry }: { entry: CodingEntry }) {
  return <span className={`event-code-badge review-${entry.reviewStatus}`}><b>{entry.type}</b><code>{entry.code}</code><small>{reviewStatusLabel(entry.reviewStatus)}</small></span>
}

function DocumentTask({ document, codingCase, onSelect }: { document: DocumentMapItem; codingCase: CodingCase; onSelect: (id: string) => void }) {
  const status = getDocumentStatus(document)
  const codeCount = codingCase.codingEntries.filter((entry) => entry.evidenceDocumentId === document.id).length
  return (
    <button className="document-task" type="button" onClick={() => onSelect(document.id)}>
      <span className={`document-task-icon ${status.className}`}>{document.availability === 'fehlend' ? <FileQuestion aria-hidden="true" /> : <FileText aria-hidden="true" />}</span>
      <span><strong>{document.title}</strong><small>{coverageLabel(document, codingCase)} · {codeCount} Kodes · {document.reason}</small></span>
      <span className={`status-pill ${status.className}`}>{status.label}</span>
      <ChevronDown aria-hidden="true" />
    </button>
  )
}

function DocumentDetail({ document, codingCase, kisGuide, onClose, onOpenDecision, onOpenCollaboration, onConfirmReview, onOpenCodingEntry }: {
  document: DocumentMapItem
  codingCase: CodingCase
  kisGuide?: KisGuide
  onClose: () => void
  onOpenDecision: (decisionId: string) => void
  onOpenCollaboration: (mode: 'consult' | 'wiki', decisionId: string) => void
  onConfirmReview: (documentId: string) => void
  onOpenCodingEntry: (documentId: string) => void
}) {
  const status = getDocumentStatus(document)
  const entries = codingCase.codingEntries.filter((entry) => entry.evidenceDocumentId === document.id)
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer document-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="document-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">{kindLabels[document.kind]} · {coverageLabel(document, codingCase)}</div><h2 id="document-detail-title">{document.title}</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <div className="document-detail-status"><span className={`status-pill ${status.className}`}>{status.label}</span><span>Bewertet in Iteration {document.assessedIteration}</span></div>

        <section className="document-coding-section" aria-labelledby="document-coding-title">
          <div className="document-coding-head">
            <div><span>Kodierung aus diesem Dokument</span><h3 id="document-coding-title">{entries.length ? `${entries.length} verknüpfte Kodes` : 'Noch kein Kode verknüpft'}</h3></div>
            {document.availability === 'vorhanden' && <button className="button primary" type="button" onClick={() => onOpenCodingEntry(document.id)}><FileCode2 aria-hidden="true" /> Kode erfassen</button>}
          </div>
          {entries.length ? (
            <div className="document-code-list">
              {entries.map((entry) => (
                <div key={entry.id} className={!entry.active ? 'is-deleted' : ''}>
                  <span className="coding-type-badge">{entry.type}</span>
                  <span><strong>{entry.code} · {entry.description}</strong><small>{changeLabel(entry)} · {entry.origin} · Iteration {entry.assessedIteration}{entry.serviceDate ? ` · ${formatFullDate(entry.serviceDate)}` : ''}</small></span>
                  <span className={`status-pill status-${entry.reviewStatus === 'belegt' ? 'belegt' : entry.reviewStatus === 'widersprüchlich' ? 'widersprüchlich' : 'wahrscheinlich'}`}>{reviewStatusLabel(entry.reviewStatus)}</span>
                </div>
              ))}
            </div>
          ) : <div className="document-code-empty"><FileCode2 aria-hidden="true" /><span><strong>Kein ICD oder OPS aus diesem Dokument erfasst.</strong><small>Das kann korrekt sein. Bei kodierbarem Inhalt lässt sich hier ein Kode ergänzen.</small></span></div>}
          {document.availability === 'vorhanden' && document.reviewLevel !== 'validiert' && (
            <button className="coding-no-change" type="button" onClick={() => onConfirmReview(document.id)}><Check aria-hidden="true" /><span><strong>Kodierung stimmt – keine Änderung</strong><small>Prüfung dokumentieren und neue Bewertung starten.</small></span></button>
          )}
        </section>

        <dl className="document-detail-list">
          <div><dt>Vorprüfung</dt><dd>{document.reason}</dd></div>
          <div><dt>Kodierhinweis</dt><dd>{document.codingNote}</dd></div>
          <div><dt>Mögliche Ergebniswirkung</dt><dd>{document.resultImpact}</dd></div>
          <div><dt>Prüftiefe</dt><dd>{reviewLabel(document.reviewLevel)}</dd></div>
        </dl>
        <div className="outcome-dimensions" aria-label="Ergebniswirkung nach Dimension">
          {(Object.entries(document.outcomeDimensions) as [keyof DocumentMapItem['outcomeDimensions'], OutcomeDimensionStatus][]).map(([dimension, value]) => (
            <div key={dimension}><span>{dimensionLabel(dimension)}</span><strong className={`dimension-${value}`}>{dimensionStatusLabel(value)}</strong></div>
          ))}
        </div>
        <details className="kis-inline-help">
          <summary><span><Monitor aria-hidden="true" /><span><strong>Wo finde ich das im KIS?</strong><small>Hausbezogene Orientierung</small></span></span><ChevronDown aria-hidden="true" /></summary>
          {kisGuide ? <div className="kis-inline-content"><div className="kis-path">{kisGuide.navigationPath.map((step) => <span key={step}>{step}</span>)}</div><dl className="document-detail-list"><div><dt>Modul</dt><dd>{kisGuide.module}</dd></div><div><dt>Suchbegriff</dt><dd>{kisGuide.searchTerm || 'Keiner'}</dd></div><div><dt>So geht es</dt><dd>{kisGuide.instruction}</dd></div><div><dt>Hausbesonderheit</dt><dd>{kisGuide.notes}</dd></div></dl>{kisGuide.screenshots[0] && <div className="kis-inline-screen"><KisSchematic /><span><strong>{kisGuide.screenshots[0].fileName}</strong><small>{kisGuide.screenshots[0].caption}</small></span></div>}</div> : <p className="kis-missing-guide">Für diese Dokumentart ist noch kein Fundort hinterlegt.</p>}
        </details>
        {document.linkedDecisionId && <div className="document-detail-actions"><button className="button secondary full" type="button" onClick={() => onOpenDecision(document.linkedDecisionId!)}>{document.availability === 'fehlend' ? <Upload aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />} Prüfentscheidung öffnen</button><div><button className="button secondary" type="button" onClick={() => onOpenCollaboration('wiki', document.linkedDecisionId!)}><MessageCircle aria-hidden="true" /> Wiki fragen</button><button className="button secondary" type="button" onClick={() => onOpenCollaboration('consult', document.linkedDecisionId!)}><Stethoscope aria-hidden="true" /> Kodierkonsil</button></div></div>}
        <div className="document-iteration-note"><CalendarDays aria-hidden="true" /><span>Ändert sich die DRG-Hypothese, wird dieses Dokument neu eingeordnet.</span></div>
      </aside>
    </div>
  )
}

function findKisGuide(document: DocumentMapItem, guides: KisGuide[]) {
  const title = `${document.title} ${document.kind}`.toLowerCase()
  const wanted = title.includes('therapie') || title.includes('medikation') ? 'medikation' : title.includes('broncho') || title.includes('biopsie') || title.includes('op-') ? 'intervention' : title.includes('intensiv') || title.includes('überwachung') ? 'intensiv' : 'arztbrief'
  return guides.find((guide) => `${guide.id} ${guide.documentKind}`.toLowerCase().includes(wanted))
}

function dimensionLabel(dimension: keyof DocumentMapItem['outcomeDimensions']) { return { drg: 'DRG', ops: 'OPS', entgelte: 'ZE / NUB', kodierung: 'Vollständigkeit', mbeg: 'MBEG' }[dimension] }
function dimensionStatusLabel(status: OutcomeDimensionStatus) { return { neutral: 'Neutral', offen: 'Offen', relevant: 'Relevant', geprüft: 'Geprüft' }[status] }
function coverageLabel(document: DocumentMapItem, codingCase: CodingCase) { return document.endDay && document.endDay !== document.startDay ? `${formatDay(codingCase, document.startDay)}–${formatDay(codingCase, document.endDay)}` : formatDay(codingCase, document.startDay) }
function getDocumentStatus(document: DocumentMapItem): { label: string; className: string } {
  if (document.availability === 'fehlend' && document.priority === 'jetzt') return { label: 'Fehlt · jetzt anfordern', className: 'doc-status-action' }
  if (document.availability === 'fehlend') return { label: 'Fehlt · aktuell nicht anfordern', className: 'doc-status-neutral' }
  if (document.reviewLevel === 'nachvalidierung') return { label: 'Vorprüfung · nachvalidieren', className: 'doc-status-action' }
  if (document.reviewLevel === 'validiert') return { label: 'Validiert · stimmig', className: 'doc-status-ok' }
  if (document.relevance === 'neutral') return { label: 'Vorprüfung · DRG-neutral', className: 'doc-status-neutral' }
  if (document.relevance === 'stimmig') return { label: 'Vorprüfung · stimmig', className: 'doc-status-ok' }
  return { label: 'Einordnung offen', className: 'doc-status-watch' }
}
function reviewLabel(level: DocumentMapItem['reviewLevel']) { return { erfasst: 'Nur erfasst', 'grob-geprüft': 'Grob mit Vorkodierung und Verlauf abgeglichen', nachvalidierung: 'Originaldokument detailliert nachvalidieren', validiert: 'Vollständig validiert', 'nicht-angefordert': 'Nach aktueller Hypothese nicht anfordern' }[level] }
function reviewStatusLabel(status: CodingEntry['reviewStatus']) { return { ungeprüft: 'Ungeprüft', wahrscheinlich: 'Wahrscheinlich', belegt: 'Belegt', widersprüchlich: 'Widersprüchlich' }[status] }
function changeLabel(entry: CodingEntry) { return entry.change === 'added' ? 'Ergänzt' : entry.change === 'changed' ? 'Geändert' : entry.change === 'deleted' ? 'Gelöscht' : 'Vorkodierung unverändert' }
function formatFullDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
