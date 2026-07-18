import { useState } from 'react'
import { FileSearch, FileText, ScanText } from 'lucide-react'
import type { CaseDocument, DocumentMapItem } from '../types'

interface DocumentEvidenceViewerProps {
  document: DocumentMapItem
  source?: CaseDocument
  previewUrl?: string
  compact?: boolean
}

export function DocumentEvidenceViewer({ document, source, previewUrl, compact = false }: DocumentEvidenceViewerProps) {
  const hasOriginalPreview = Boolean(previewUrl && (source?.mimeType === 'application/pdf' || source?.mimeType?.startsWith('image/')))
  const [view, setView] = useState<'text' | 'original'>('text')
  const previewText = source?.previewText?.trim() || fallbackDocumentText(document)
  const passages = previewText.split(/\n\s*\n|\r?\n/).map((item) => item.trim()).filter(Boolean)

  return (
    <section className={`document-evidence-viewer ${compact ? 'is-compact' : ''}`} aria-label={`Dokumentinhalt ${document.title}`}>
      <header>
        <span className="document-evidence-icon"><FileSearch aria-hidden="true" /></span>
        <span>
          <small>{source?.previewLabel ?? 'Aufbereitete Dokumentansicht'}</small>
          <strong>{source?.name ?? document.title}</strong>
          <em>{source?.kind ?? 'Dokument'} · {document.department} · {document.assessedIteration}. Iteration</em>
        </span>
        {hasOriginalPreview && (
          <div className="document-view-toggle" role="group" aria-label="Dokumentansicht">
            <button type="button" className={view === 'text' ? 'active' : ''} aria-pressed={view === 'text'} onClick={() => setView('text')}><ScanText aria-hidden="true" /> Text</button>
            <button type="button" className={view === 'original' ? 'active' : ''} aria-pressed={view === 'original'} onClick={() => setView('original')}><FileText aria-hidden="true" /> Original</button>
          </div>
        )}
      </header>

      {view === 'original' && hasOriginalPreview ? (
        source?.mimeType?.startsWith('image/')
          ? <img className="document-original-image" src={previewUrl} alt={`Vorschau ${source.name}`} />
          : <iframe className="document-original-frame" title={`Originalansicht ${source?.name ?? document.title}`} src={previewUrl} />
      ) : (
        <div className="document-text-preview" tabIndex={0} aria-label="Ausgelesener Dokumenttext">
          <div className="document-text-meta"><span>Dokumenttext</span><span><mark>Belegstelle</mark> = Grundlage der Empfehlung</span></div>
          {passages.map((passage, index) => {
            const evidence = isEvidencePassage(passage, document)
            return <p key={`${passage.slice(0, 24)}-${index}`} className={evidence ? 'is-evidence' : ''}>{evidence && <span>Belegstelle</span>}{passage}</p>
          })}
        </div>
      )}

      <footer>
        <span><strong>Fallbezug:</strong> {document.reason}</span>
        <span><strong>Kodierhinweis:</strong> {document.codingNote}</span>
      </footer>
    </section>
  )
}

function isEvidencePassage(passage: string, document: DocumentMapItem) {
  const text = passage.toLowerCase()
  const terms = ['hauptdiagnose', 'aufnahmegrund', 'operation', 'prozedur', 'therapie', 'entlass', 'histolog', 'bronchoskop', 'medikation', 'dosis']
  if (terms.some((term) => text.includes(term))) return true
  return document.title.toLowerCase().split(/\s+/).some((term) => term.length > 7 && text.includes(term.slice(0, 7)))
}

function fallbackDocumentText(document: DocumentMapItem) {
  return [
    `Dokument: ${document.title}`,
    `Behandlungsabschnitt: ${document.department}, Tag ${document.startDay}${document.endDay ? ` bis Tag ${document.endDay}` : ''}.`,
    `Klinische Kernaussage: ${document.reason}`,
    `Kodierrelevante Einordnung: ${document.codingNote}`,
    `Erwartete Wirkung: ${document.resultImpact}`,
  ].join('\n\n')
}
