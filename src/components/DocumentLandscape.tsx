import { useMemo, useState } from 'react'
import {
  BookOpenText,
  CalendarDays,
  Check,
  ChevronDown,
  FileCode2,
  FileCheck2,
  FileQuestion,
  FileText,
  Map,
  MessageCircle,
  Monitor,
  Route,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react'
import type { CodingCase, DocumentMapItem, KisGuide, OutcomeDimensionStatus } from '../types'
import { KisSchematic } from './HospitalsView'

interface DocumentLandscapeProps {
  codingCase: CodingCase
  onOpenDecision: (decisionId: string) => void
  onOpenCollaboration: (mode: 'consult' | 'wiki', decisionId: string) => void
  onConfirmReview: (documentId: string) => void
  onOpenCodingEntry: (documentId: string) => void
  kisGuides: KisGuide[]
}

const kindLabels: Record<DocumentMapItem['kind'], string> = {
  verlaufsbericht: 'Verlaufsbericht',
  ereignisbericht: 'Ereignisbericht',
  nachweis: 'Nachweis',
  vorkodierung: 'Vorkodierung',
}

export function DocumentLandscape({ codingCase, onOpenDecision, onOpenCollaboration, onConfirmReview, onOpenCodingEntry, kisGuides }: DocumentLandscapeProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>()
  const documents = codingCase.documentMap ?? []
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId)
  const reportDocuments = documents.filter((item) => item.kind === 'verlaufsbericht' || item.kind === 'vorkodierung')
  const eventDocuments = documents.filter((item) => item.kind === 'ereignisbericht' || item.kind === 'nachweis')
  const nowDocuments = documents.filter((item) => item.priority === 'jetzt')
  const doneDocuments = documents.filter((item) => item.priority !== 'jetzt')
  const relevantDocuments = documents.filter((item) => item.relevance === 'potenziell' || item.reviewLevel === 'nachvalidierung')
  const missingRelevant = documents.filter((item) => item.availability === 'fehlend' && item.priority === 'jetzt')

  const reportRows = useMemo(() => groupByMapRow(reportDocuments), [reportDocuments])
  const eventRows = useMemo(() => groupByMapRow(eventDocuments), [eventDocuments])

  return (
    <section className="document-landscape" aria-labelledby="document-landscape-title">
      <div className="landscape-heading">
        <div>
          <div className="page-kicker">Dokumente sortieren · Iteration {codingCase.grouperRuns.at(-1)?.iteration ?? 1}</div>
          <h2 id="document-landscape-title">Falllandkarte</h2>
          <p>Erst Verlauf und Ereignisse ordnen. Dann nur dort vertiefen, wo sich das Ergebnis realistisch ändern kann.</p>
        </div>
        <div className="landscape-facts" aria-label="Dokumentenlage">
          <span><strong>{documents.length}</strong> eingeordnet</span>
          <span><strong>{relevantDocuments.length}</strong> potenziell relevant</span>
          <span><strong>{missingRelevant.length}</strong> fehlt jetzt</span>
        </div>
      </div>

      <div className="map-surface">
        <div className="route-caption"><Route aria-hidden="true" /><span>Behandlungsweg</span><small>{codingCase.stayDays} Tage · {codingCase.careForm}</small></div>
        <div className="case-route" role="list" aria-label="Behandlungskette auf der Falllandkarte">
          {codingCase.timeline.map((event) => (
            <div className="case-route-step" role="listitem" key={event.id} style={{ flexGrow: Math.max(1, (event.endDay ?? event.day) - event.day + 1) }}>
              <span className="route-node" />
              <small>Tag {event.day}{event.endDay ? `–${event.endDay}` : ''}</small>
              <strong>{event.label}</strong>
              <span>{event.department}</span>
            </div>
          ))}
        </div>

        <DocumentLane
          label="Verlaufsberichte"
          description="decken einen oder mehrere Aufenthaltsteile ab"
          rows={reportRows}
          stayDays={codingCase.stayDays}
          selectedDocumentId={selectedDocumentId}
          onSelect={setSelectedDocumentId}
        />
        <DocumentLane
          label="Ereignisse und Nachweise"
          description="markieren einen Eingriff, Befund oder gezielten Nachweis"
          rows={eventRows}
          stayDays={codingCase.stayDays}
          selectedDocumentId={selectedDocumentId}
          onSelect={setSelectedDocumentId}
        />
      </div>

      <div className="document-worklist">
        <div className="worklist-now">
          <div className="worklist-title"><span><FileQuestion aria-hidden="true" /><strong>Jetzt prüfen</strong></span><span>{nowDocuments.length}</span></div>
          {nowDocuments.length === 0 ? (
            <div className="worklist-empty"><Check aria-hidden="true" /> Keine ergebnisrelevante Dokumentenprüfung offen.</div>
          ) : nowDocuments.map((document) => (
            <DocumentTask key={document.id} document={document} onSelect={setSelectedDocumentId} />
          ))}
        </div>
        <details className="worklist-done">
          <summary><span><FileCheck2 aria-hidden="true" /><strong>Vorläufig erledigt</strong></span><span>{doneDocuments.length}<ChevronDown aria-hidden="true" /></span></summary>
          <div>{doneDocuments.map((document) => <DocumentTask key={document.id} document={document} onSelect={setSelectedDocumentId} />)}</div>
        </details>
      </div>

      {selectedDocument && (
        <DocumentDetail
          document={selectedDocument}
          kisGuide={findKisGuide(selectedDocument, kisGuides)}
          onClose={() => setSelectedDocumentId(undefined)}
          onOpenDecision={(decisionId) => {
            setSelectedDocumentId(undefined)
            onOpenDecision(decisionId)
          }}
          onOpenCollaboration={(mode, decisionId) => {
            setSelectedDocumentId(undefined)
            onOpenCollaboration(mode, decisionId)
          }}
          onConfirmReview={(documentId) => {
            setSelectedDocumentId(undefined)
            onConfirmReview(documentId)
          }}
          onOpenCodingEntry={(documentId) => {
            setSelectedDocumentId(undefined)
            onOpenCodingEntry(documentId)
          }}
        />
      )}
    </section>
  )
}

function DocumentLane({
  label,
  description,
  rows,
  stayDays,
  selectedDocumentId,
  onSelect,
}: {
  label: string
  description: string
  rows: DocumentMapItem[][]
  stayDays: number
  selectedDocumentId?: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="map-lane">
      <div className="map-lane-label"><strong>{label}</strong><small>{description}</small></div>
      <div className="map-lane-rows">
        {rows.map((row, rowIndex) => (
          <div className="map-lane-track" key={`${label}-${rowIndex}`}>
            {row.map((document) => {
              const position = getMapPosition(document, stayDays)
              const status = getDocumentStatus(document)
              return (
                <button
                  className={`document-piece ${status.className} ${document.availability === 'fehlend' ? 'is-missing' : ''} ${selectedDocumentId === document.id ? 'is-selected' : ''}`}
                  key={document.id}
                  type="button"
                  style={{ left: `${position.left}%`, width: `${position.width}%` }}
                  onClick={() => onSelect(document.id)}
                  aria-label={`${document.title}, ${status.label}, ${coverageLabel(document)}`}
                >
                  <span>{document.kind === 'verlaufsbericht' ? <BookOpenText aria-hidden="true" /> : document.kind === 'vorkodierung' ? <FileCheck2 aria-hidden="true" /> : <FileText aria-hidden="true" />}</span>
                  <span><strong>{document.title}</strong><small>{coverageLabel(document)} · {status.label}</small></span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function DocumentTask({ document, onSelect }: { document: DocumentMapItem; onSelect: (id: string) => void }) {
  const status = getDocumentStatus(document)
  return (
    <button className="document-task" type="button" onClick={() => onSelect(document.id)}>
      <span className={`document-task-icon ${status.className}`}>{document.availability === 'fehlend' ? <FileQuestion aria-hidden="true" /> : <FileText aria-hidden="true" />}</span>
      <span><strong>{document.title}</strong><small>{document.reason}</small></span>
      <span className={`status-pill ${status.className}`}>{status.label}</span>
      <ChevronDown aria-hidden="true" />
    </button>
  )
}

function DocumentDetail({
  document,
  kisGuide,
  onClose,
  onOpenDecision,
  onOpenCollaboration,
  onConfirmReview,
  onOpenCodingEntry,
}: {
  document: DocumentMapItem
  kisGuide?: KisGuide
  onClose: () => void
  onOpenDecision: (decisionId: string) => void
  onOpenCollaboration: (mode: 'consult' | 'wiki', decisionId: string) => void
  onConfirmReview: (documentId: string) => void
  onOpenCodingEntry: (documentId: string) => void
}) {
  const status = getDocumentStatus(document)
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer document-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="document-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Puzzleteil im Gesamtfall</div><h2 id="document-detail-title">Dokument einordnen</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <div className="document-detail-hero">
          <span className={`document-kind-icon ${status.className}`}><Map aria-hidden="true" /></span>
          <div><span>{kindLabels[document.kind]}</span><h3>{document.title}</h3><small>{coverageLabel(document)} · {document.department}</small></div>
        </div>
        <div className="document-detail-status">
          <span className={`status-pill ${status.className}`}>{status.label}</span>
          <span>Bewertet in Iteration {document.assessedIteration}</span>
        </div>
        <dl className="document-detail-list">
          <div><dt>Vorprüfung</dt><dd>{document.reason}</dd></div>
          <div><dt>Aktuelle Kodierung</dt><dd>{document.codingNote}</dd></div>
          <div><dt>Mögliche Ergebniswirkung</dt><dd>{document.resultImpact}</dd></div>
          <div><dt>Prüftiefe</dt><dd>{reviewLabel(document.reviewLevel)}</dd></div>
        </dl>
        <div className="outcome-dimensions" aria-label="Ergebniswirkung nach Dimension">
          {(Object.entries(document.outcomeDimensions) as [keyof DocumentMapItem['outcomeDimensions'], OutcomeDimensionStatus][]).map(([dimension, value]) => (
            <div key={dimension}><span>{dimensionLabel(dimension)}</span><strong className={`dimension-${value}`}>{dimensionStatusLabel(value)}</strong></div>
          ))}
        </div>
        <details className="kis-inline-help">
          <summary><span><Monitor aria-hidden="true" /><span><strong>Wo finde ich dieses Dokument im KIS?</strong><small>Hausbezogene Orientierung · kein Fallnachweis</small></span></span><ChevronDown aria-hidden="true" /></summary>
          {kisGuide ? (
            <div className="kis-inline-content">
              <div className="kis-path">{kisGuide.navigationPath.map((step) => <span key={step}>{step}</span>)}</div>
              <dl className="document-detail-list">
                <div><dt>Modul</dt><dd>{kisGuide.module}</dd></div>
                <div><dt>Suchbegriff</dt><dd>{kisGuide.searchTerm || 'Keiner'}</dd></div>
                <div><dt>So geht es</dt><dd>{kisGuide.instruction}</dd></div>
                <div><dt>Hausbesonderheit</dt><dd>{kisGuide.notes}</dd></div>
              </dl>
              {kisGuide.screenshots[0] && <div className="kis-inline-screen"><KisSchematic /><span><strong>{kisGuide.screenshots[0].fileName}</strong><small>{kisGuide.screenshots[0].caption}</small></span></div>}
              <small>Geprüft {kisGuide.reviewedAt} · {kisGuide.owner}</small>
            </div>
          ) : <p className="kis-missing-guide">Für diese Dokumentart ist am gewählten Standort noch kein Fundort hinterlegt.</p>}
        </details>
        {document.relevance === 'neutral' && (
          <div className="coding-duty-note"><FileCheck2 aria-hidden="true" /><span><strong>DRG-neutral heißt nicht unkodiert</strong><small>Die Leistung bleibt regelkonform abzubilden. Aktuell ist nur keine tiefere Dokumentenprüfung nötig.</small></span></div>
        )}
        {document.availability === 'vorhanden' && (
          <button className="coding-from-document" type="button" onClick={() => onOpenCodingEntry(document.id)}>
            <span><FileCode2 aria-hidden="true" /></span>
            <span><strong>ICD / OPS aus Dokument erfassen</strong><small>Ergänzen, ändern oder löschen. Danach startet eine neue Grouper-Iteration.</small></span>
            <ChevronDown aria-hidden="true" />
          </button>
        )}
        {document.linkedDecisionId && (
          <div className="document-detail-actions">
            {document.availability === 'vorhanden' && document.reviewLevel === 'nachvalidierung' ? (
              <>
                <button className="button primary full" type="button" onClick={() => onConfirmReview(document.id)}><Check aria-hidden="true" /> Nachvalidierung abschließen</button>
                <button className="button secondary full" type="button" onClick={() => onOpenDecision(document.linkedDecisionId!)}><FileCheck2 aria-hidden="true" /> Zugehörige Prüfentscheidung öffnen</button>
              </>
            ) : (
              <button className="button primary full" type="button" onClick={() => onOpenDecision(document.linkedDecisionId!)}>
                {document.availability === 'fehlend' ? <Upload aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
                {document.availability === 'fehlend' ? 'Nachweis anfordern' : 'Prüfung öffnen'}
              </button>
            )}
            <div>
              <button className="button secondary" type="button" onClick={() => onOpenCollaboration('wiki', document.linkedDecisionId!)}><MessageCircle aria-hidden="true" /> Wiki fragen</button>
              <button className="button secondary" type="button" onClick={() => onOpenCollaboration('consult', document.linkedDecisionId!)}><Stethoscope aria-hidden="true" /> Kodierkonsil</button>
            </div>
          </div>
        )}
        <div className="document-iteration-note"><CalendarDays aria-hidden="true" /><span>Ändert sich die DRG-Hypothese, wird dieses Dokument automatisch neu eingeordnet.</span></div>
      </aside>
    </div>
  )
}

function findKisGuide(document: DocumentMapItem, guides: KisGuide[]) {
  const title = `${document.title} ${document.kind}`.toLowerCase()
  const wanted = title.includes('therapie') || title.includes('medikation')
    ? 'medikation'
    : title.includes('broncho') || title.includes('biopsie') || title.includes('op-')
      ? 'intervention'
      : title.includes('intensiv') || title.includes('überwachung')
        ? 'intensiv'
        : 'arztbrief'
  return guides.find((guide) => `${guide.id} ${guide.documentKind}`.toLowerCase().includes(wanted))
}

function dimensionLabel(dimension: keyof DocumentMapItem['outcomeDimensions']) {
  return { drg: 'DRG', ops: 'OPS', entgelte: 'ZE / NUB', kodierung: 'Vollständigkeit', mbeg: 'MBEG' }[dimension]
}

function dimensionStatusLabel(status: OutcomeDimensionStatus) {
  return { neutral: 'Neutral', offen: 'Offen', relevant: 'Relevant', geprüft: 'Geprüft' }[status]
}

function groupByMapRow(documents: DocumentMapItem[]) {
  const maxRow = Math.max(0, ...documents.map((item) => item.mapRow))
  return Array.from({ length: maxRow + 1 }, (_, row) => documents.filter((item) => item.mapRow === row))
}

function getMapPosition(document: DocumentMapItem, stayDays: number) {
  const start = Math.max(1, Math.min(stayDays, document.startDay))
  const end = Math.max(start, Math.min(stayDays, document.endDay ?? document.startDay))
  const rawLeft = ((start - 1) / stayDays) * 100
  if (!document.endDay) return { left: Math.min(76, rawLeft), width: 24 }
  const rawWidth = ((end - start + 1) / stayDays) * 100
  const width = Math.max(18, Math.min(100, rawWidth))
  return { left: Math.min(100 - width, rawLeft), width }
}

function coverageLabel(document: DocumentMapItem) {
  return document.endDay && document.endDay !== document.startDay ? `Tag ${document.startDay}–${document.endDay}` : `Tag ${document.startDay}`
}

function getDocumentStatus(document: DocumentMapItem): { label: string; className: string } {
  if (document.availability === 'fehlend' && document.priority === 'jetzt') return { label: 'Fehlt · jetzt anfordern', className: 'doc-status-action' }
  if (document.availability === 'fehlend') return { label: 'Fehlt · aktuell nicht anfordern', className: 'doc-status-neutral' }
  if (document.reviewLevel === 'nachvalidierung') return { label: 'Vorprüfung · nachvalidieren', className: 'doc-status-action' }
  if (document.reviewLevel === 'validiert') return { label: 'Validiert · stimmig', className: 'doc-status-ok' }
  if (document.relevance === 'neutral') return { label: 'Vorprüfung · DRG-neutral', className: 'doc-status-neutral' }
  if (document.relevance === 'stimmig') return { label: 'Vorprüfung · stimmig', className: 'doc-status-ok' }
  return { label: 'Einordnung offen', className: 'doc-status-watch' }
}

function reviewLabel(level: DocumentMapItem['reviewLevel']) {
  const labels: Record<DocumentMapItem['reviewLevel'], string> = {
    erfasst: 'Nur erfasst',
    'grob-geprüft': 'Grob mit Vorkodierung und Verlauf abgeglichen',
    nachvalidierung: 'Originaldokument detailliert nachvalidieren',
    validiert: 'Vollständig validiert',
    'nicht-angefordert': 'Nach aktueller Hypothese nicht anfordern',
  }
  return labels[level]
}
