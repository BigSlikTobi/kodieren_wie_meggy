import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  FileCheck2,
  FileUp,
  GitBranch,
  Gauge,
  History,
  Info,
  LockKeyhole,
  Play,
  Plus,
  RotateCw,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import type { GrouperClient } from '../services/grouper'
import type { AppData, CodingCase, EvidenceStatus, HospitalProfile } from '../types'

interface CaseCockpitProps {
  codingCase: CodingCase
  hospitals: HospitalProfile[]
  grouperClient: GrouperClient
  onDataChange: (updater: (current: AppData) => AppData) => void
  onNewCase: () => void
}

const statusLabels: Record<EvidenceStatus, string> = {
  belegt: 'Belegt',
  wahrscheinlich: 'Wahrscheinlich',
  ungeklärt: 'Ungeklärt',
  widersprüchlich: 'Widersprüchlich',
  ausgeschlossen: 'Ausgeschlossen',
  entscheidung: 'Entscheidung nötig',
}

export function CaseCockpit({ codingCase, hospitals, grouperClient, onDataChange, onNewCase }: CaseCockpitProps) {
  const [activeDecision, setActiveDecision] = useState<string | undefined>(codingCase.decisions[0]?.id)
  const [runningDecision, setRunningDecision] = useState<string>()
  const [showAllDocuments, setShowAllDocuments] = useState(false)
  const [finalOpen, setFinalOpen] = useState(codingCase.status === 'abgeschlossen')

  const hospital = hospitals.find((item) => item.id === codingCase.hospitalId)
  const profile = hospital?.profiles.find((item) => item.siteId === codingCase.siteId && item.year === codingCase.year)
  const currentRun = codingCase.grouperRuns.at(-1)!
  const openRequired = codingCase.decisions.filter((decision) => decision.required && decision.status !== 'belegt' && decision.status !== 'ausgeschlossen')
  const openAlternatives = codingCase.decisions.filter((decision) => !decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status))
  const evidenceCount = codingCase.decisions.filter((decision) => decision.status === 'belegt').length
  const completedChecks = [
    true,
    Boolean(currentRun),
    openAlternatives.length === 0,
    codingCase.decisions.some((decision) => decision.id.includes('therapy') && decision.status === 'belegt') || codingCase.scenario === 'standard',
    openRequired.length === 0,
    codingCase.status === 'abgeschlossen',
  ]
  const progress = Math.round((completedChecks.filter(Boolean).length / completedChecks.length) * 100)

  const orderedDecisions = useMemo(
    () => [...codingCase.decisions].sort((a, b) => {
      const impact = { hoch: 0, mittel: 1, niedrig: 2 }
      const resolvedA = ['belegt', 'ausgeschlossen'].includes(a.status) ? 1 : 0
      const resolvedB = ['belegt', 'ausgeschlossen'].includes(b.status) ? 1 : 0
      return resolvedA - resolvedB || impact[a.impact] - impact[b.impact]
    }),
    [codingCase.decisions],
  )

  const mutateCase = (nextCase: CodingCase) => {
    onDataChange((current) => ({
      ...current,
      cases: current.cases.map((item) => (item.id === nextCase.id ? nextCase : item)),
    }))
  }

  const setTypicality = (value: CodingCase['hospitalTypicality']) => {
    mutateCase({
      ...codingCase,
      hospitalTypicality: value,
      hospitalTypicalitySource: 'manuell',
      hospitalTypicalityReason: `Von der Kodierfachkraft als ${value} eingestuft. Die technische Ersteinschätzung wurde überschrieben.`,
    })
  }

  const setDifficulty = (value: CodingCase['difficulty']) => {
    mutateCase({
      ...codingCase,
      difficulty: value,
      difficultySource: 'manuell',
      difficultyReason: `Von der Kodierfachkraft als ${value} eingestuft. Die technische Ersteinschätzung wurde überschrieben.`,
    })
  }

  const resolveDecision = async (decisionId: string, mode: 'belegt' | 'ausgeschlossen', fileName?: string) => {
    setRunningDecision(decisionId)
    const decision = codingCase.decisions.find((item) => item.id === decisionId)
    if (!decision) return
    const document = mode === 'belegt'
      ? {
          id: `doc-${Date.now()}`,
          name: fileName || `${decision.requestedDocument.toLowerCase().replaceAll(' ', '_')}.pdf`,
          kind: fileName?.split('.').pop()?.toUpperCase() || 'PDF',
          addedAt: new Date().toISOString(),
          status: 'ausgewertet' as const,
          supports: decision.title,
        }
      : undefined
    const updatedCase: CodingCase = {
      ...codingCase,
      documents: document ? [...codingCase.documents, document] : codingCase.documents,
      decisions: codingCase.decisions.map((item) => item.id === decisionId
        ? { ...item, status: mode, resolution: mode === 'belegt' ? `Belegt durch ${document?.name}` : 'Im Demopfad fachlich ausgeschlossen' }
        : item),
    }
    mutateCase(updatedCase)
    const newRun = await grouperClient.group(updatedCase, mode === 'ausgeschlossen' ? `${decisionId} ausgeschlossen` : decisionId)
    mutateCase({ ...updatedCase, grouperRuns: [...updatedCase.grouperRuns, newRun] })
    setRunningDecision(undefined)
  }

  const handleEvidenceUpload = (decisionId: string, files: FileList | null) => {
    const file = files?.[0]
    void resolveDecision(decisionId, 'belegt', file?.name)
  }

  const finalize = () => {
    if (openRequired.length > 0) return
    const next = { ...codingCase, status: 'abgeschlossen' as const }
    mutateCase(next)
    setFinalOpen(true)
  }

  return (
    <div className="page cockpit-page">
      <div className="case-title-row">
        <div>
          <div className="page-kicker">Fall #{codingCase.id.slice(-6)} · illustrative Demodaten</div>
          <h1>{codingCase.label}</h1>
          <p>{hospital?.name} · {profile?.siteName} · Regelpaket {codingCase.year}</p>
        </div>
        <button className="button secondary" type="button" onClick={onNewCase}><Plus aria-hidden="true" /> Neuer Fall</button>
      </div>

      <section className="workflow-progress" aria-label={`Arbeitsfortschritt ${progress} Prozent`}>
        <div className="progress-heading"><span>Arbeitsfortschritt</span><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <ol>
          {['Fall verstehen', 'Basis-DRG', 'Alternativen', 'Entgelte', 'Nachweise', 'Abschluss'].map((label, index) => (
            <li key={label} className={completedChecks[index] ? 'done' : index === completedChecks.findIndex((item) => !item) ? 'current' : ''}>
              <span>{completedChecks[index] ? <Check aria-hidden="true" /> : index + 1}</span>{label}
            </li>
          ))}
        </ol>
      </section>

      <div className="status-strip" aria-label="Fallstatus">
        <div><span>Nachweise</span><strong>{evidenceCount} von {codingCase.decisions.length}</strong></div>
        <div><span>Realistische Alternativen</span><strong>{openAlternatives.length}</strong></div>
        <div><span>Offene Pflichtentscheidungen</span><strong>{openRequired.length}</strong></div>
        <div><span>Aktueller Grouper-Lauf</span><strong>Iteration {currentRun.iteration}</strong></div>
      </div>

      <section className="timeline-section" aria-labelledby="timeline-title">
        <div className="section-title-row">
          <div><span className={`status-pill complexity-${codingCase.complexity}`}>{codingCase.complexity}</span><h2 id="timeline-title">Behandlungskette</h2></div>
          <p>{codingCase.stayDays} Tage · {codingCase.age} Jahre · {codingCase.careForm}</p>
        </div>
        <div className="timeline" role="list" aria-label="Zeitlicher Behandlungsverlauf">
          {codingCase.timeline.map((event) => (
            <div className="timeline-event" role="listitem" key={event.id} style={{ flexGrow: Math.max(1, (event.endDay ?? event.day) - event.day + 1) }}>
              <span className="timeline-dot" />
              <small>Tag {event.day}{event.endDay ? `–${event.endDay}` : ''}</small>
              <strong>{event.label}</strong>
              <span>{event.department}</span>
            </div>
          ))}
        </div>
        <div className="reason-row">{codingCase.complexityReasons.map((reason) => <span key={reason}>{reason}</span>)}</div>
      </section>

      <section className="validation-stage" aria-labelledby="validation-title">
        <div className="section-title-row">
          <div><div className="page-kicker">Validierung 1 · Fall einordnen</div><h2 id="validation-title">Was für ein Fall ist das?</h2></div>
          <span>Technische Ersteinschätzung · manuell änderbar</span>
        </div>
        <div className="validation-grid">
          <article className="validation-result">
            <div className="validation-result-head">
              <span className="validation-icon"><Building2 aria-hidden="true" /></span>
              <span><small>Krankenhausmuster</small><strong>{codingCase.hospitalTypicality === 'typisch' ? 'Typisch für dieses Haus' : codingCase.hospitalTypicality === 'untypisch' ? 'Untypisch für dieses Haus' : 'Noch ungeklärt'}</strong></span>
              <span className={`status-pill status-${codingCase.hospitalTypicality === 'typisch' ? 'belegt' : codingCase.hospitalTypicality === 'untypisch' ? 'widersprüchlich' : 'ungeklärt'}`}>{codingCase.hospitalTypicalitySource === 'technisch' ? 'Technisch' : 'Manuell'}</span>
            </div>
            <p>{codingCase.hospitalTypicalityReason}</p>
            <div className="validation-evidence"><strong>{codingCase.comparableCases}</strong><span>vergleichbare Fälle im Demo-Zeitraum</span></div>
            <label>Einordnung ändern
              <select aria-label="Krankenhaustypik manuell ändern" value={codingCase.hospitalTypicality} onChange={(event) => setTypicality(event.target.value as CodingCase['hospitalTypicality'])}>
                <option value="typisch">Typisch</option>
                <option value="untypisch">Untypisch</option>
                <option value="ungeklärt">Ungeklärt</option>
              </select>
            </label>
          </article>

          <article className="validation-result">
            <div className="validation-result-head">
              <span className="validation-icon"><Gauge aria-hidden="true" /></span>
              <span><small>Prüfaufwand</small><strong>{codingCase.difficulty === 'einfach' ? 'Einfacher Fall' : 'Schwieriger Fall'}</strong></span>
              <span className={`status-pill status-${codingCase.difficulty === 'einfach' ? 'belegt' : 'wahrscheinlich'}`}>{codingCase.difficultySource === 'technisch' ? 'Technisch' : 'Manuell'}</span>
            </div>
            <p>{codingCase.difficultyReason}</p>
            <div className="validation-evidence"><strong>{codingCase.difficulty === 'einfach' ? 'Kurz' : 'Tief'}</strong><span>empfohlene Prüftiefe für den weiteren Workflow</span></div>
            <label>Schwierigkeit ändern
              <select aria-label="Fallschwierigkeit manuell ändern" value={codingCase.difficulty} onChange={(event) => setDifficulty(event.target.value as CodingCase['difficulty'])}>
                <option value="einfach">Einfach</option>
                <option value="schwierig">Schwierig</option>
              </select>
            </label>
          </article>

          <article className="validation-result dkr-result">
            <div className="validation-result-head">
              <span className="validation-icon"><BookOpenCheck aria-hidden="true" /></span>
              <span><small>Regelprüfung {codingCase.year}</small><strong>{codingCase.dkrMatches.filter((rule) => rule.status === 'spezifisch').length} spezifische DKR erkannt</strong></span>
              <span className="status-pill status-belegt">Eingeblendet</span>
            </div>
            <p>Passende Regeln werden vor der Hauptdiagnose- und OPS-Entscheidung gezeigt.</p>
            <div className="dkr-list">
              {codingCase.dkrMatches.map((rule) => (
                <details key={rule.id} open={rule.status === 'spezifisch'}>
                  <summary><span>{rule.title}</span><span className={`status-pill status-${rule.status === 'spezifisch' ? 'wahrscheinlich' : 'ungeklärt'}`}>{rule.status === 'spezifisch' ? 'Spezifisch' : 'Allgemein'}</span></summary>
                  <p>{rule.relevance}</p>
                </details>
              ))}
            </div>
            <small className="demo-rule-note">Illustrative DKR-Demohinweise. Fachinhalt und Jahresversion müssen im echten Regelpaket validiert werden.</small>
          </article>
        </div>
      </section>

      <div className="cockpit-grid">
        <div className="cockpit-main">
          <section className="hypothesis-panel" aria-labelledby="hypothesis-title">
            <div className="section-title-row">
              <div><div className="page-kicker">Aktuelle Arbeitshypothese</div><h2 id="hypothesis-title">{currentRun.drg}</h2></div>
              <span className="status-pill status-wahrscheinlich">Wahrscheinlich</span>
            </div>
            <p><strong>Hauptdiagnose:</strong> {codingCase.currentMainDiagnosis}</p>
            <p><strong>Führender Pfad:</strong> {codingCase.scenario === 'pulmo-onko' ? 'Pulmologische Diagnostik → onkologische Therapie' : 'Konservative pneumologische Behandlung'}</p>
            <div className="code-row">{codingCase.currentProcedures.map((procedure) => <code key={procedure}>{procedure}</code>)}</div>
            <div className="grouper-note"><Sparkles aria-hidden="true" /><span>{currentRun.reason} PCCL {currentRun.pccL}.{currentRun.extras.map((extra) => ` ${extra}`)}</span></div>
          </section>

          <section aria-labelledby="checks-title">
            <div className="section-title-row">
              <div><div className="page-kicker">Nächster sinnvoller Prüfpunkt</div><h2 id="checks-title">Offene Entscheidungen</h2></div>
              <span>{orderedDecisions.filter((item) => !['belegt', 'ausgeschlossen'].includes(item.status)).length} offen</span>
            </div>
            <div className="decision-list">
              {orderedDecisions.map((decision) => {
                const selected = activeDecision === decision.id
                const resolved = ['belegt', 'ausgeschlossen'].includes(decision.status)
                return (
                  <article className={`decision-item ${selected ? 'selected' : ''}`} key={decision.id}>
                    <button className="decision-summary" type="button" aria-expanded={selected} onClick={() => setActiveDecision(selected ? undefined : decision.id)}>
                      <span className={`impact-marker impact-${decision.impact}`}><span className="sr-only">Auswirkung {decision.impact}</span></span>
                      <span className="decision-copy">
                        <span className="decision-meta"><span className={`status-pill status-${decision.status}`}>{statusLabels[decision.status]}</span>{decision.required && <span>Pflichtprüfung</span>}<span>Auswirkung {decision.impact}</span></span>
                        <strong>{decision.title}</strong>
                        <small>{decision.effect}</small>
                      </span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {selected && (
                      <div className="decision-details">
                        <p>{decision.description}</p>
                        <div className="requested-doc"><FileUp aria-hidden="true" /><span><strong>Benötigt:</strong> {decision.requestedDocument}</span></div>
                        {decision.resolution && <div className="resolution"><Check aria-hidden="true" />{decision.resolution}</div>}
                        {!resolved && (
                          <div className="button-row">
                            <label className={`button primary ${runningDecision === decision.id ? 'disabled' : ''}`}>
                              {runningDecision === decision.id ? <RotateCw className="spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />}
                              {runningDecision === decision.id ? 'Grouper läuft …' : 'Nachweis hochladen'}
                              <input className="sr-only" type="file" disabled={runningDecision === decision.id} onChange={(event) => handleEvidenceUpload(decision.id, event.target.files)} />
                            </label>
                            {!decision.required && <button className="button secondary" type="button" disabled={Boolean(runningDecision)} onClick={() => void resolveDecision(decision.id, 'ausgeschlossen')}><X aria-hidden="true" /> Ausschließen</button>}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <section className="entitlement-section" aria-labelledby="entitlement-title">
            <div className="section-title-row"><div><div className="page-kicker">Paralleler Prüfpfad</div><h2 id="entitlement-title">Entgelte und Komplexbehandlungen</h2></div></div>
            <div className="check-grid">
              <CheckRow label="DRG" detail={`${currentRun.drg}, Basis ${currentRun.baseDrg}`} status="geprüft" />
              <CheckRow label="Zusatzentgelte" detail={currentRun.extras[0] ?? 'Therapienachweis noch offen'} status={currentRun.extras.length ? 'geprüft' : 'offen'} />
              <CheckRow label="NUB" detail={`${profile?.nubs.length ?? 0} Vereinbarungen am Standort`} status="geprüft" />
              <CheckRow label="Komplexbehandlungen" detail={`${profile?.structures.length ?? 0} mögliche Strukturmerkmale`} status={openAlternatives.length ? 'offen' : 'geprüft'} />
              <CheckRow label="Altersregeln" detail={`Alter bei Aufnahme: ${codingCase.age}`} status="geprüft" />
              <CheckRow label="Hybrid-DRG" detail="Demo-Abgrenzung geprüft" status="geprüft" />
            </div>
          </section>
        </div>

        <aside className="iteration-sidebar" aria-labelledby="history-title">
          <div className="section-title-row"><div><div className="page-kicker">Nicht überschrieben</div><h2 id="history-title">Iterationen</h2></div><History aria-hidden="true" /></div>
          <ol className="iteration-list">
            {codingCase.grouperRuns.slice().reverse().map((run, index) => (
              <li key={run.id} className={index === 0 ? 'current' : ''}>
                <span className="iteration-node">{run.iteration}</span>
                <div><strong>{run.drg}</strong><small>{new Date(run.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</small><p>{run.reason}</p>{run.changed && <span className="mini-change"><GitBranch aria-hidden="true" /> Pfad geändert</span>}</div>
              </li>
            ))}
          </ol>
          <div className="loop-explainer" aria-label="Iterative Arbeitsweise">
            <span>Hypothese</span><ArrowRight aria-hidden="true" /><span>Groupen</span><ArrowRight aria-hidden="true" /><span>Belegen</span><RotateCw aria-hidden="true" />
          </div>
          <div className="sidebar-block">
            <button className="text-button" type="button" onClick={() => setShowAllDocuments((value) => !value)}>
              <FileCheck2 aria-hidden="true" /> {codingCase.documents.length} Dokumente <ChevronDown aria-hidden="true" />
            </button>
            {showAllDocuments && <ul className="compact-list">{codingCase.documents.map((document) => <li key={document.id}><span>{document.name}</span><small>{document.supports ?? 'Initialer Upload'}</small></li>)}</ul>}
          </div>
        </aside>
      </div>

      <section className="completion-bar" aria-label="Fallabschluss">
        <div>
          {openRequired.length > 0 ? <LockKeyhole aria-hidden="true" /> : <Check aria-hidden="true" />}
          <span><strong>{openRequired.length > 0 ? 'Abschluss noch gesperrt' : 'Pflichtprüfungen abgeschlossen'}</strong><small>{openRequired.length > 0 ? `${openRequired.length} Pflichtentscheidungen sind offen.` : `${openAlternatives.length} unkritische Restunsicherheiten werden dokumentiert.`}</small></span>
        </div>
        <button className="button primary" type="button" disabled={openRequired.length > 0} onClick={finalize}>Abschlussvorschlag <ArrowRight aria-hidden="true" /></button>
      </section>

      {finalOpen && (
        <section className="final-proposal" aria-labelledby="final-title">
          <div className="section-title-row"><div><div className="page-kicker">Belegter Vorschlag</div><h2 id="final-title">Fallabschluss</h2></div><span className="status-pill status-belegt">Abgeschlossen</span></div>
          <div className="final-grid">
            <div><span>Hauptdiagnose</span><strong>{codingCase.currentMainDiagnosis}</strong></div>
            <div><span>DRG</span><strong>{currentRun.drg}</strong></div>
            <div><span>OPS</span><strong>{codingCase.currentProcedures.join(' · ')}</strong></div>
            <div><span>Entgelte</span><strong>{currentRun.extras.join(', ') || 'Keine zusätzlichen Demovorschläge'}</strong></div>
          </div>
          {openAlternatives.length > 0 && <div className="inline-note"><Info aria-hidden="true" /><span>Dokumentierte Restunsicherheiten: {openAlternatives.map((item) => item.title).join('; ')}.</span></div>}
          <p className="demo-disclaimer">Dieser Vorschlag nutzt illustrative Demodaten und ist nicht zur Abrechnung bestimmt.</p>
        </section>
      )}
    </div>
  )
}

function CheckRow({ label, detail, status }: { label: string; detail: string; status: 'offen' | 'geprüft' }) {
  return (
    <div className="check-row">
      <span className={status === 'geprüft' ? 'check-icon done' : 'check-icon'}>{status === 'geprüft' ? <Check aria-hidden="true" /> : <CircleDot aria-hidden="true" />}</span>
      <span><strong>{label}</strong><small>{detail}</small></span>
      <span className={`status-pill status-${status === 'geprüft' ? 'belegt' : 'ungeklärt'}`}>{status === 'geprüft' ? 'Geprüft' : 'Offen'}</span>
    </div>
  )
}
