import { Check, FileCode2, FileUp, MessageCircle, RotateCw, Stethoscope, UserRoundCheck, X } from 'lucide-react'
import type { CaseDecision, CodingEntry } from '../types'

interface RouteRecommendation {
  kind: 'self' | 'wiki' | 'consult'
  title: string
  reason: string
}

interface DecisionCodingWorkspaceProps {
  decision: CaseDecision
  entries: CodingEntry[]
  route: RouteRecommendation
  running: boolean
  wikiStarted: boolean
  consultationStatus?: string
  onKnowledgeChange: (knowledge: CaseDecision['knowledge']) => void
  onManualCoding: () => void
  onValidatePrecode: () => void
  onWiki: () => void
  onConsult: () => void
  onEvidenceUpload: (files: FileList | null) => void
  onComplete: () => void
  onExclude: () => void
}

const reviewLabels = {
  ungeprüft: 'ungeprüft',
  wahrscheinlich: 'vorläufig geprüft',
  belegt: 'validiert',
  widersprüchlich: 'widersprüchlich',
}

const originLabels = {
  vorkodierung: 'Vorkodierung',
  manuell: 'manuell durch KFK',
  technisch: 'technisch geliefert',
  'tool-vorschlag': 'Tool-Vorschlag',
}

export function DecisionCodingWorkspace({
  decision,
  entries,
  route,
  running,
  wikiStarted,
  consultationStatus,
  onKnowledgeChange,
  onManualCoding,
  onValidatePrecode,
  onWiki,
  onConsult,
  onEvidenceUpload,
  onComplete,
  onExclude,
}: DecisionCodingWorkspaceProps) {
  const activeEntries = entries.filter((entry) => entry.active)
  const precodeEntries = activeEntries.filter((entry) => entry.origin === 'vorkodierung')
  const validatedEntries = activeEntries.filter((entry) => entry.reviewStatus === 'belegt')

  return (
    <section className="decision-coding-workspace" aria-label={`Kodierentscheidung ${decision.title}`}>
      <div className="decision-coding-head">
        <div>
          <span>Kodierentscheidung</span>
          <strong>{activeEntries.length ? `${activeEntries.length} passende${activeEntries.length === 1 ? 'r' : ''} Kode${activeEntries.length === 1 ? '' : 's'} vorhanden` : 'Noch keine passende Kodierung'}</strong>
          <small>{validatedEntries.length} validiert · {activeEntries.length - validatedEntries.length} offen</small>
        </div>
        <label>Eigene Fachkenntnis
          <select aria-label={`Fachkenntnis für ${decision.title}`} value={decision.knowledge} onChange={(event) => onKnowledgeChange(event.target.value as CaseDecision['knowledge'])}>
            <option value="vertraut">Fachgebiet vertraut</option>
            <option value="unsicher">Grundkenntnisse, aber unsicher</option>
            <option value="fremd">Nicht mein Fachgebiet</option>
          </select>
        </label>
      </div>

      <div className="decision-code-state">
        {activeEntries.length ? activeEntries.map((entry) => (
          <div className="decision-code-row" key={entry.id}>
            <span className="coding-type-badge">{entry.type}</span>
            <span><code>{entry.code}</code><strong>{entry.description}</strong><small>{originLabels[entry.origin]} · {reviewLabels[entry.reviewStatus]} · Iteration {entry.assessedIteration}</small></span>
            <span className={`status-pill status-${entry.reviewStatus === 'belegt' ? 'belegt' : entry.reviewStatus === 'widersprüchlich' ? 'widersprüchlich' : entry.reviewStatus === 'wahrscheinlich' ? 'wahrscheinlich' : 'ungeklärt'}`}>{reviewLabels[entry.reviewStatus]}</span>
          </div>
        )) : <div className="decision-code-empty"><FileCode2 aria-hidden="true" /><span><strong>Kein Kode aus Vorkodierung, Dokument oder Fachentscheidung</strong><small>Die Kodierfachkraft kann direkt starten oder Hilfe hinzuziehen.</small></span></div>}
      </div>

      <div className={`decision-route-recommendation route-${route.kind}`}>
        {route.kind === 'consult' ? <Stethoscope aria-hidden="true" /> : route.kind === 'wiki' ? <MessageCircle aria-hidden="true" /> : <UserRoundCheck aria-hidden="true" />}
        <span><small>Empfohlener Weg aufgrund Relevanz und Fachkenntnis</small><strong>{route.title}</strong><span>{route.reason}</span></span>
      </div>

      <div className="decision-route-grid" aria-label="Bearbeitungswege">
        <button className={`decision-route-action ${route.kind === 'self' ? 'recommended' : ''}`} type="button" onClick={onManualCoding}>
          <FileCode2 aria-hidden="true" /><span><strong>Manuell kodieren</strong><small>ICD oder OPS durch KFK ergänzen, ändern oder löschen</small></span>
        </button>
        <button className={`decision-route-action ${precodeEntries.length ? '' : 'unavailable'}`} type="button" disabled={!precodeEntries.length || running} onClick={onValidatePrecode}>
          <Check aria-hidden="true" /><span><strong>{precodeEntries.length ? 'Vorkodierung validieren' : 'Keine Vorkodierung'}</strong><small>{precodeEntries.length ? `${precodeEntries.length} vorhandene Kodes prüfen und abschließen` : 'Für diesen Sachverhalt ist nichts vorhanden'}</small></span>
        </button>
        <button className={`decision-route-action ${route.kind === 'wiki' ? 'recommended' : ''}`} type="button" onClick={onWiki}>
          <MessageCircle aria-hidden="true" /><span><strong>Mit Kodierwiki erarbeiten</strong><small>{wikiStarted ? 'Wiki-Dialog begonnen · Ergebnis in Kodierung übernehmen' : 'Grundlagen und Systematik gemeinsam klären'}</small></span>
        </button>
        <button className={`decision-route-action ${route.kind === 'consult' ? 'recommended' : ''}`} type="button" onClick={onConsult}>
          <Stethoscope aria-hidden="true" /><span><strong>Kodierkonsil anfordern</strong><small>{consultationStatus ? `Konsil ${consultationStatus}` : 'Menschliche Fachentscheidung mit vollständigem Fallkontext'}</small></span>
        </button>
      </div>

      <div className="decision-completion">
        <div><span>Abschluss</span><strong>{activeEntries.length ? 'Kodierung fachlich entscheiden oder Nachweis ergänzen' : 'Zuerst Kodierung erstellen oder Variante ausschließen'}</strong></div>
        <div className="button-row">
          <label className={`button secondary ${running ? 'disabled' : ''}`}>
            {running ? <RotateCw className="spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />}
            {running ? 'Grouper läuft …' : 'Nachweis hochladen'}
            <input className="sr-only" type="file" disabled={running} onChange={(event) => onEvidenceUpload(event.target.files)} />
          </label>
          <button className="button primary" type="button" disabled={!activeEntries.length || running} onClick={onComplete}><Check aria-hidden="true" /> Kodierentscheidung abschließen</button>
          {!decision.required && <button className="button secondary" type="button" disabled={running} onClick={onExclude}><X aria-hidden="true" /> Ausschließen</button>}
        </div>
      </div>
    </section>
  )
}
