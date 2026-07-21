import { Check, FileCode2, FileUp, MessageCircle, RotateCw, Stethoscope, UserRoundCheck, X } from 'lucide-react'
import type { CaseDecision, CodingEntry } from '../types'

export interface RouteRecommendation {
  kind: 'self' | 'wiki' | 'consult'
  title: string
  reason: string
}

export function getCollaborationRoute(
  decision: Pick<CaseDecision, 'knowledge' | 'groupingRelevance' | 'status'>,
): RouteRecommendation {
  if (decision.knowledge === 'fremd') {
    return {
      kind: 'consult',
      title: 'Fachliche Entscheidung einholen',
      reason: 'Der Sachverhalt liegt außerhalb der eigenen Kenntnisse. Ein Kodierkonsil soll die Entscheidung fachlich absichern.',
    }
  }

  if (decision.knowledge === 'unsicher') {
    return {
      kind: 'wiki',
      title: 'Kodierwiki zuerst',
      reason: decision.groupingRelevance === 'relevant'
        ? 'Zuerst Regel und Katalogkontext klären. Wegen der DRG-Relevanz wird danach eine fachliche Zweitmeinung angeboten.'
        : 'Regel und Katalogkontext klären, danach die Kodierung selbst entscheiden.',
    }
  }

  return {
    kind: 'self',
    title: 'Selbst entscheiden',
    reason: decision.status === 'widersprüchlich'
      ? 'Die eigenen Kenntnisse reichen aus, um den Widerspruch anhand der Quelle und der Regelwerke zu klären. Ein Konsil bleibt optional.'
      : 'Der Sachverhalt ist vertraut und kann anhand der Quelle und der Regelwerke selbst validiert werden.',
  }
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
  const secondOpinionPath = decision.knowledge === 'unsicher' && decision.groupingRelevance === 'relevant' && wikiStarted
  const consultationFinished = consultationStatus === 'abgeschlossen'
  const effectiveRoute: RouteRecommendation = secondOpinionPath
    ? consultationFinished
      ? {
          kind: 'self',
          title: 'Konsilergebnis in die Kodierung übernehmen',
          reason: 'Die fachliche Zweitmeinung liegt vor. Kode und Quelle jetzt prüfen und die Kodierentscheidung abschließen.',
        }
      : {
          kind: 'consult',
          title: consultationStatus ? 'Zweitmeinung angefragt' : 'Zweitmeinung empfohlen',
          reason: consultationStatus
            ? 'Das Kodierwiki wurde genutzt. Die gruppierungsrelevante Frage liegt jetzt im Kodierkonsil.'
            : 'Das Kodierwiki hat Regel und Katalogkontext geklärt. Wegen der DRG-Relevanz ist eine fachliche Zweitmeinung der nächste sichere Schritt.',
        }
    : route

  return (
    <section className="decision-coding-workspace" aria-label={`Kodierentscheidung ${decision.title}`}>
      <div className="decision-coding-head">
        <div>
          <span>Kodierentscheidung</span>
          <strong>{activeEntries.length ? `${activeEntries.length} passende${activeEntries.length === 1 ? 'r' : ''} Kode${activeEntries.length === 1 ? '' : 's'} vorhanden` : 'Noch keine passende Kodierung'}</strong>
          <small>{validatedEntries.length} validiert · {activeEntries.length - validatedEntries.length} offen</small>
        </div>
        <label>Wie möchtest Du entscheiden?
          <select aria-label={`Fachkenntnis für ${decision.title}`} value={decision.knowledge} onChange={(event) => onKnowledgeChange(event.target.value as CaseDecision['knowledge'])}>
            <option value="vertraut">Ich kann selbst entscheiden</option>
            <option value="unsicher">Ich brauche Regelhilfe</option>
            <option value="fremd">Ich brauche eine fachliche Entscheidung</option>
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

      <details className={`decision-route-recommendation route-${effectiveRoute.kind}`}>
        <summary>{effectiveRoute.kind === 'consult' ? <Stethoscope aria-hidden="true" /> : effectiveRoute.kind === 'wiki' ? <MessageCircle aria-hidden="true" /> : <UserRoundCheck aria-hidden="true" />}<span><small>Empfohlener Weg</small><strong>{effectiveRoute.title}</strong></span></summary>
        <p>{effectiveRoute.reason}</p>
      </details>

      <div className="decision-route-grid" aria-label="Direkte Bearbeitungswege">
        <button className={`decision-route-action ${effectiveRoute.kind === 'self' ? 'recommended' : ''}`} type="button" onClick={onManualCoding}>
          <FileCode2 aria-hidden="true" /><span><strong>Ich kodiere selbst</strong><small>ICD oder OPS ergänzen, ändern oder löschen</small></span>
        </button>
        <button className={`decision-route-action ${precodeEntries.length ? '' : 'unavailable'}`} type="button" disabled={!precodeEntries.length || running} onClick={onValidatePrecode}>
          <Check aria-hidden="true" /><span><strong>{precodeEntries.length ? 'Vorkodierung validieren' : 'Keine Vorkodierung'}</strong><small>{precodeEntries.length ? `${precodeEntries.length} vorhandene Kodes prüfen und abschließen` : 'Für diesen Sachverhalt ist nichts vorhanden'}</small></span>
        </button>
      </div>

      <div className="decision-help-actions" aria-label="Unterstützung für die Kodierentscheidung">
        <button className={effectiveRoute.kind === 'wiki' ? 'recommended' : ''} type="button" onClick={onWiki}>
          <MessageCircle aria-hidden="true" /><span><strong>{wikiStarted ? 'Kodierwiki weiterfragen' : 'Kodierwiki fragen'}</strong><small>{wikiStarted ? 'Regelhilfe genutzt' : 'Regeln und Systematik klären'}</small></span>
        </button>
        <button className={effectiveRoute.kind === 'consult' ? 'recommended' : ''} type="button" onClick={onConsult}>
          <Stethoscope aria-hidden="true" /><span><strong>{secondOpinionPath ? 'Zweitmeinung im Konsil' : 'Kodierkonsil anfordern'}</strong><small>{consultationStatus ? `Konsil ${consultationStatus}` : secondOpinionPath ? 'Nach Kodierwiki empfohlen' : 'Menschliche Fachentscheidung'}</small></span>
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
          <button className="button secondary" type="button" disabled={running} onClick={onExclude}><X aria-hidden="true" /> Keine Kodierung erforderlich</button>
        </div>
      </div>
    </section>
  )
}
