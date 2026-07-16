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
  MessageCircle,
  Play,
  Plus,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRoundCheck,
  Users,
  X,
} from 'lucide-react'
import type { GrouperClient } from '../services/grouper'
import type { AppData, CaseDecision, CodingCase, CodingConsultation, EvidenceStatus, HospitalProfile } from '../types'
import { CollaborationDrawer } from './CollaborationDrawer'
import { DocumentLandscape } from './DocumentLandscape'
import { MedicalJustificationDrawer } from './MedicalJustificationDrawer'

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
  const [collaboration, setCollaboration] = useState<{ mode: 'consult' | 'wiki'; decisionId: string }>()
  const [mbegOpen, setMbegOpen] = useState(false)

  const hospital = hospitals.find((item) => item.id === codingCase.hospitalId)
  const profile = hospital?.profiles.find((item) => item.siteId === codingCase.siteId && item.year === codingCase.year)
  const currentRun = codingCase.grouperRuns.at(-1)!
  const firstOpenDecision = codingCase.decisions.find((decision) => !['belegt', 'ausgeschlossen'].includes(decision.status))
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

  const setDecisionKnowledge = (decisionId: string, knowledge: CaseDecision['knowledge']) => {
    mutateCase({
      ...codingCase,
      decisions: codingCase.decisions.map((decision) => decision.id === decisionId ? { ...decision, knowledge } : decision),
    })
  }

  const createConsultation = (decisionId: string, input: Pick<CodingConsultation, 'specialty' | 'question' | 'expert' | 'priority'>) => {
    mutateCase({
      ...codingCase,
      consultations: [
        ...codingCase.consultations,
        {
          id: `consult-${Date.now()}`,
          decisionId,
          ...input,
          status: 'angefragt',
          createdAt: new Date().toISOString(),
        },
      ],
    })
  }

  const completeConsultation = async (consultationId: string, result: NonNullable<CodingConsultation['result']>, finding: string) => {
    const consultation = codingCase.consultations.find((item) => item.id === consultationId)
    if (!consultation) return
    setRunningDecision(consultation.decisionId)
    const updatedCase: CodingCase = {
      ...codingCase,
      consultations: codingCase.consultations.map((item) => item.id === consultationId ? { ...item, status: 'abgeschlossen', result, finding } : item),
      decisions: codingCase.decisions.map((decision) => decision.id === consultation.decisionId ? {
        ...decision,
        status: result === 'bestätigt' ? 'belegt' : result === 'geändert' ? 'entscheidung' : 'ungeklärt',
        resolution: `Kodierkonsil ${consultation.specialty}: ${result}. ${finding}`,
      } : decision),
    }
    mutateCase(updatedCase)
    if (result === 'bestätigt') {
      const newRun = await grouperClient.group(updatedCase, `Konsil ${consultation.specialty}`)
      mutateCase({ ...updatedCase, grouperRuns: [...updatedCase.grouperRuns, newRun] })
    }
    setRunningDecision(undefined)
  }

  const sendWikiMessage = (decisionId: string, text: string) => {
    const now = new Date().toISOString()
    const userMessage = { id: `wiki-user-${Date.now()}`, author: 'Kodierfachkraft' as const, text, createdAt: now }
    const assistantMessage = {
      id: `wiki-assistant-${Date.now() + 1}`,
      author: 'Wiki-Assistent' as const,
      text: 'Der Wiki-Hinweis ordnet den Begriff und die Regel ein. Er ersetzt keinen Fallnachweis. Bei gruppierungsrelevanter Unsicherheit bleibt ein menschliches Kodierkonsil erforderlich.',
      createdAt: now,
    }
    const existing = codingCase.wikiThreads.find((thread) => thread.decisionId === decisionId)
    mutateCase({
      ...codingCase,
      wikiThreads: existing
        ? codingCase.wikiThreads.map((thread) => thread.id === existing.id ? { ...thread, messages: [...thread.messages, userMessage, assistantMessage] } : thread)
        : [...codingCase.wikiThreads, {
            id: `wiki-${Date.now()}`,
            decisionId,
            title: codingCase.decisions.find((decision) => decision.id === decisionId)?.title ?? 'Wissensfrage',
            messages: [userMessage, assistantMessage],
            createdAt: now,
          }],
    })
  }

  const confirmDocumentReview = async (documentId: string) => {
    const documentItem = codingCase.documentMap.find((item) => item.id === documentId)
    if (!documentItem) return
    setRunningDecision(documentItem.linkedDecisionId)
    const updatedCase: CodingCase = {
      ...codingCase,
      documentMap: codingCase.documentMap.map((item) => item.id === documentId ? {
        ...item,
        relevance: 'stimmig',
        reviewLevel: 'validiert',
        priority: 'erledigt',
      } : item),
    }
    mutateCase(updatedCase)
    const newRun = await grouperClient.group(updatedCase, `Nachvalidierung ${documentItem.title}`)
    mutateCase({
      ...updatedCase,
      documentMap: updatedCase.documentMap.map((item) => item.id === documentId ? { ...item, assessedIteration: newRun.iteration } : item),
      grouperRuns: [...updatedCase.grouperRuns, newRun],
    })
    setRunningDecision(undefined)
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
      documentMap: codingCase.documentMap.map((item) => item.linkedDecisionId === decisionId && item.availability === 'fehlend'
        ? mode === 'belegt'
          ? { ...item, availability: 'vorhanden', relevance: 'stimmig', reviewLevel: 'validiert', priority: 'erledigt' }
          : { ...item, relevance: 'neutral', reviewLevel: 'nicht-angefordert', priority: 'erledigt' }
        : item),
      decisions: codingCase.decisions.map((item) => item.id === decisionId
        ? { ...item, status: mode, resolution: mode === 'belegt' ? `Belegt durch ${document?.name}` : 'Im Demopfad fachlich ausgeschlossen' }
        : item),
    }
    mutateCase(updatedCase)
    const newRun = await grouperClient.group(updatedCase, mode === 'ausgeschlossen' ? `${decisionId} ausgeschlossen` : decisionId)
    mutateCase({
      ...updatedCase,
      documentMap: updatedCase.documentMap.map((item) => item.linkedDecisionId === decisionId ? { ...item, assessedIteration: newRun.iteration } : item),
      grouperRuns: [...updatedCase.grouperRuns, newRun],
    })
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

  const reviewMbeg = () => {
    mutateCase({
      ...codingCase,
      medicalJustification: { ...codingCase.medicalJustification, reviewed: true, reviewer: 'Kodierfachkraft · Demo' },
    })
  }

  return (
    <div className="page cockpit-page">
      <div className="case-title-row">
        <div>
          <div className="page-kicker">Fall #{codingCase.id.slice(-6)} · illustrative Demodaten</div>
          <h1>{codingCase.label}</h1>
          <p>{hospital?.name} · {profile?.siteName} · Regelpaket {codingCase.year}</p>
        </div>
        <div className="case-actions">
          <div className="collaboration-counts">
            <button type="button" disabled={!firstOpenDecision} onClick={() => firstOpenDecision && setCollaboration({ mode: 'consult', decisionId: firstOpenDecision.id })}><Users aria-hidden="true" /> Kodierkonsil · {codingCase.consultations.filter((item) => item.status !== 'abgeschlossen').length}</button>
            <button type="button" disabled={!firstOpenDecision} onClick={() => firstOpenDecision && setCollaboration({ mode: 'wiki', decisionId: firstOpenDecision.id })}><MessageCircle aria-hidden="true" /> Wiki-Chat · {codingCase.wikiThreads.length}</button>
          </div>
          <button className="button secondary" type="button" onClick={onNewCase}><Plus aria-hidden="true" /> Neuer Fall</button>
        </div>
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

      <DocumentLandscape
        codingCase={codingCase}
        onOpenDecision={(decisionId) => {
          setActiveDecision(decisionId)
          window.setTimeout(() => document.getElementById('checks-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
        }}
        onOpenCollaboration={(mode, decisionId) => setCollaboration({ mode, decisionId })}
        onConfirmReview={(documentId) => void confirmDocumentReview(documentId)}
        kisGuides={profile?.kisGuides ?? []}
      />

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
                const route = getCollaborationRoute(decision)
                return (
                  <article className={`decision-item ${selected ? 'selected' : ''}`} key={decision.id}>
                    <button className="decision-summary" type="button" aria-expanded={selected} onClick={() => setActiveDecision(selected ? undefined : decision.id)}>
                      <span className={`impact-marker impact-${decision.impact}`}><span className="sr-only">Auswirkung {decision.impact}</span></span>
                      <span className="decision-copy">
                        <span className="decision-meta"><span className={`status-pill status-${decision.status}`}>{statusLabels[decision.status]}</span>{decision.required && <span>Pflichtprüfung</span>}<span>Gruppierung {decision.groupingRelevance}</span><span>Auswirkung {decision.impact}</span></span>
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
                          <>
                            <div className={`routing-box route-${route.kind}`}>
                              <div className="routing-copy">
                                {route.kind === 'consult' ? <Stethoscope aria-hidden="true" /> : route.kind === 'wiki' ? <MessageCircle aria-hidden="true" /> : <UserRoundCheck aria-hidden="true" />}
                                <span><small>Empfohlener Weg</small><strong>{route.title}</strong><span>{route.reason}</span></span>
                              </div>
                              <label>Eigene Fachkenntnis
                                <select aria-label={`Fachkenntnis für ${decision.title}`} value={decision.knowledge} onChange={(event) => setDecisionKnowledge(decision.id, event.target.value as CaseDecision['knowledge'])}>
                                  <option value="vertraut">Fachgebiet vertraut</option>
                                  <option value="unsicher">Grundkenntnisse, aber unsicher</option>
                                  <option value="fremd">Nicht mein Fachgebiet</option>
                                </select>
                              </label>
                              <div className="routing-actions">
                                <button className={`button ${route.kind === 'wiki' ? 'primary' : 'secondary'}`} type="button" onClick={() => setCollaboration({ mode: 'wiki', decisionId: decision.id })}><MessageCircle aria-hidden="true" /> Wiki fragen</button>
                                <button className={`button ${route.kind === 'consult' ? 'primary' : 'secondary'}`} type="button" onClick={() => setCollaboration({ mode: 'consult', decisionId: decision.id })}><Stethoscope aria-hidden="true" /> Kodierkonsil</button>
                              </div>
                            </div>
                            <div className="button-row">
                              <label className={`button ${route.kind === 'self' ? 'primary' : 'secondary'} ${runningDecision === decision.id ? 'disabled' : ''}`}>
                                {runningDecision === decision.id ? <RotateCw className="spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />}
                                {runningDecision === decision.id ? 'Grouper läuft …' : 'Nachweis hochladen'}
                                <input className="sr-only" type="file" disabled={runningDecision === decision.id} onChange={(event) => handleEvidenceUpload(decision.id, event.target.files)} />
                              </label>
                              {!decision.required && <button className="button secondary" type="button" disabled={Boolean(runningDecision)} onClick={() => void resolveDecision(decision.id, 'ausgeschlossen')}><X aria-hidden="true" /> Ausschließen</button>}
                            </div>
                          </>
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
            <button className="mbeg-check" type="button" onClick={() => setMbegOpen(true)}>
              <span className={`check-icon ${codingCase.medicalJustification.reviewed ? 'done' : ''}`}><ShieldCheck aria-hidden="true" /></span>
              <span><small>Optionaler Parallelpfad</small><strong>Medizinische Begründung vollstationär</strong><span>{codingCase.medicalJustification.reviewed ? 'Fachlich geprüft' : codingCase.medicalJustification.status === 'entwurf-belegbar' ? 'Entwurf belegbar' : 'Fachliche Prüfung nötig'}</span></span>
              <ArrowRight aria-hidden="true" />
            </button>
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
          <details className="final-mbeg">
            <summary><span><ShieldCheck aria-hidden="true" /><span><strong>Medizinische Begründung vollstationär</strong><small>{codingCase.medicalJustification.reviewed ? 'Fachlich geprüft und optional weiterleitbar' : 'Optional anzeigen und fachlich prüfen'}</small></span></span><ChevronDown aria-hidden="true" /></summary>
            <div><p>{codingCase.medicalJustification.draft}</p><button className="button secondary" type="button" onClick={() => setMbegOpen(true)}>Begründung und Belege öffnen <ArrowRight aria-hidden="true" /></button></div>
          </details>
          <p className="demo-disclaimer">Dieser Vorschlag nutzt illustrative Demodaten und ist nicht zur Abrechnung bestimmt.</p>
        </section>
      )}
      {collaboration && (() => {
        const decision = codingCase.decisions.find((item) => item.id === collaboration.decisionId)
        return decision ? (
          <CollaborationDrawer
            mode={collaboration.mode}
            codingCase={codingCase}
            decision={decision}
            onClose={() => setCollaboration(undefined)}
            onCreateConsultation={(input) => createConsultation(decision.id, input)}
            onCompleteConsultation={(consultationId, result, finding) => void completeConsultation(consultationId, result, finding)}
            onSendWikiMessage={(text) => sendWikiMessage(decision.id, text)}
          />
        ) : null
      })()}
      {mbegOpen && <MedicalJustificationDrawer codingCase={codingCase} kisGuides={profile?.kisGuides ?? []} onClose={() => setMbegOpen(false)} onReview={reviewMbeg} />}
    </div>
  )
}

function getCollaborationRoute(decision: CaseDecision): { kind: 'self' | 'wiki' | 'consult'; title: string; reason: string } {
  if (decision.knowledge === 'fremd') {
    return { kind: 'consult', title: 'Menschliches Kodierkonsil', reason: 'Ohne Grundkenntnisse kann bereits die Arbeitshypothese falsch sein.' }
  }
  if (decision.status === 'widersprüchlich' || (decision.groupingRelevance === 'relevant' && decision.knowledge !== 'vertraut')) {
    return { kind: 'consult', title: 'Menschliches Kodierkonsil', reason: 'Die offene Frage ist gruppierungsrelevant und fachlich nicht sicher.' }
  }
  if (decision.groupingRelevance === 'keine' || decision.groupingRelevance === 'möglich') {
    return { kind: 'wiki', title: 'Wiki-Chat zur Einordnung', reason: 'Grundwissen reicht aus; der Chat liefert Hintergrund, aber keine Fallfreigabe.' }
  }
  return { kind: 'self', title: 'Geführte Eigenprüfung', reason: 'Der Sachverhalt ist bekannt und kann mit Dokumenten und Regeln sicher validiert werden.' }
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
