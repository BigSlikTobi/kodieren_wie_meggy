import { useMemo, useState } from 'react'
import { BookOpen, Check, FileText, Send, ShieldAlert, Stethoscope, Users, X } from 'lucide-react'
import type { CaseDecision, CodingCase, CodingConsultation, WikiThread } from '../types'

interface SharedContextSection {
  label: string
  detail: string
}

interface CollaborationDrawerProps {
  mode: 'consult' | 'wiki'
  codingCase: CodingCase
  decision: CaseDecision
  onClose: () => void
  onCreateConsultation: (input: Pick<CodingConsultation, 'specialty' | 'question' | 'expert' | 'priority'>) => void
  onCompleteConsultation: (consultationId: string, result: NonNullable<CodingConsultation['result']>, finding: string) => void
  onSendWikiMessage: (text: string) => void
}

const specialties = ['Unfallchirurgie', 'Herzchirurgie', 'Intensivmedizin', 'Onkologie', 'Nephrologie', 'Pneumologie']

export function CollaborationDrawer({
  mode,
  codingCase,
  decision,
  onClose,
  onCreateConsultation,
  onCompleteConsultation,
  onSendWikiMessage,
}: CollaborationDrawerProps) {
  const [specialty, setSpecialty] = useState(decision.title.includes('Tumor') ? 'Onkologie' : 'Pneumologie')
  const [expert, setExpert] = useState('Nächster verfügbarer Fachexperte')
  const [priority, setPriority] = useState<CodingConsultation['priority']>('normal')
  const [question, setQuestion] = useState(`Bitte validiere folgenden Sachverhalt: ${decision.title}. ${decision.effect}`)
  const [result, setResult] = useState<NonNullable<CodingConsultation['result']>>('bestätigt')
  const [finding, setFinding] = useState('Die vorliegende Dokumentation und der Behandlungspfad stützen die aktuelle Hypothese.')
  const [message, setMessage] = useState('')

  const consultation = codingCase.consultations.find((item) => item.decisionId === decision.id && item.status !== 'abgeschlossen')
    ?? codingCase.consultations.find((item) => item.decisionId === decision.id)
  const thread = codingCase.wikiThreads.find((item) => item.decisionId === decision.id)
  const currentRun = codingCase.grouperRuns.at(-1)

  const contextSections = useMemo<SharedContextSection[]>(() => [
    {
      label: 'Fallrahmen',
      detail: `${codingCase.year} · ${codingCase.age} Jahre · ${codingCase.stayDays} Tage · ${codingCase.careForm} · ${codingCase.complexity} · ${codingCase.hospitalTypicality} für das Haus · ${codingCase.difficulty}`,
    },
    {
      label: 'Behandlungskette',
      detail: codingCase.timeline.map((event) => `Tag ${event.day}${event.endDay ? `–${event.endDay}` : ''}: ${event.department}, ${event.label}`).join(' · '),
    },
    {
      label: 'Aktuelle Kodierung',
      detail: `${codingCase.currentMainDiagnosis} · ${codingCase.currentProcedures.join(' · ')}`,
    },
    {
      label: `Dokumente (${codingCase.documents.length})`,
      detail: codingCase.documents.map((document) => `${document.name}${document.supports ? ` – ${document.supports}` : ''}`).join(' · ') || 'Noch keine Dokumente hochgeladen.',
    },
    {
      label: `Grouper-Historie (${codingCase.grouperRuns.length})`,
      detail: codingCase.grouperRuns.map((run) => `Iteration ${run.iteration}: ${run.drg}, ${run.reason}`).join(' · ') || `Aktueller Grouper-Lauf: ${currentRun?.drg ?? 'offen'}`,
    },
    {
      label: `DKR- und Regelhinweise (${codingCase.dkrMatches.length})`,
      detail: codingCase.dkrMatches.map((rule) => `${rule.title}: ${rule.relevance}`).join(' · ') || 'Keine spezifischen Hinweise erkannt.',
    },
  ], [codingCase, currentRun])

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="page-kicker">{mode === 'consult' ? 'Menschliche Fallentscheidung' : 'Wissenshilfe ohne Fallfreigabe'}</div>
            <h2 id="drawer-title">{mode === 'consult' ? 'Kodierkonsil' : 'Wiki-Chat'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <section className="drawer-decision">
          <span className={`status-pill status-${decision.groupingRelevance === 'relevant' ? 'widersprüchlich' : 'ungeklärt'}`}>Gruppierung: {decision.groupingRelevance}</span>
          <h3>{decision.title}</h3>
          <p>{decision.description}</p>
        </section>

        {mode === 'consult' ? (
          consultation ? (
            <ConsultationResult
              consultation={consultation}
              contextSections={contextSections}
              result={result}
              finding={finding}
              setResult={setResult}
              setFinding={setFinding}
              onComplete={onCompleteConsultation}
            />
          ) : (
            <form className="consult-form" onSubmit={(event) => {
              event.preventDefault()
              onCreateConsultation({ specialty, question, expert, priority })
            }}>
              <div className="context-banner"><Users aria-hidden="true" /><span><strong>Vollständiger Fallkontext wird geteilt</strong><small>Behandlungskette, Dokumente, Kodierung, Grouper-Läufe und Regeln.</small></span></div>
              <div className="form-grid two">
                <label>Benötigte Profession<select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>{specialties.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Priorität<select value={priority} onChange={(event) => setPriority(event.target.value as CodingConsultation['priority'])}><option value="normal">Normal</option><option value="dringend">Dringend</option></select></label>
              </div>
              <label>Experte<select value={expert} onChange={(event) => setExpert(event.target.value)}><option>Nächster verfügbarer Fachexperte</option><option>Dr. Demo · Fachkodierung</option><option>Team Medizincontrolling</option></select></label>
              <label>Konsilfrage<textarea rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
              <button className="button primary full" type="submit"><Stethoscope aria-hidden="true" /> Konsil anfordern</button>
            </form>
          )
        ) : (
          <WikiChat thread={thread} decision={decision} message={message} setMessage={setMessage} onSend={onSendWikiMessage} />
        )}
      </aside>
    </div>
  )
}

function ConsultationResult({
  consultation,
  contextSections,
  result,
  finding,
  setResult,
  setFinding,
  onComplete,
}: {
  consultation: CodingConsultation
  contextSections: SharedContextSection[]
  result: NonNullable<CodingConsultation['result']>
  finding: string
  setResult: (value: NonNullable<CodingConsultation['result']>) => void
  setFinding: (value: string) => void
  onComplete: (id: string, result: NonNullable<CodingConsultation['result']>, finding: string) => void
}) {
  if (consultation.status === 'abgeschlossen') {
    return (
      <div className="consult-complete">
        <span className="validation-icon"><Check aria-hidden="true" /></span>
        <h3>Konsil abgeschlossen: {consultation.result}</h3>
        <p>{consultation.finding}</p>
        <small>{consultation.specialty} · {consultation.expert}</small>
      </div>
    )
  }

  return (
    <div className="expert-view">
      <div className="consult-status"><span className="status-pill status-wahrscheinlich">Angefragt</span><strong>{consultation.specialty}</strong><small>{consultation.expert}</small></div>
      <blockquote>{consultation.question}</blockquote>
      <section>
        <h3>Freigegebener Fallkontext</h3>
        <div className="shared-context-list">
          {contextSections.map((item, index) => (
            <details key={item.label} open={index === 0}>
              <summary><FileText aria-hidden="true" />{item.label}</summary>
              <p>{item.detail}</p>
            </details>
          ))}
        </div>
      </section>
      <div className="expert-response">
        <div className="page-kicker">Simulierte Expertenantwort</div>
        <label>Ergebnis<select value={result} onChange={(event) => setResult(event.target.value as NonNullable<CodingConsultation['result']>)}><option value="bestätigt">Hypothese bestätigt</option><option value="geändert">Änderung empfohlen</option><option value="weiter ungeklärt">Weiter ungeklärt</option></select></label>
        <label>Fachliche Begründung<textarea rows={5} value={finding} onChange={(event) => setFinding(event.target.value)} /></label>
        <button className="button primary full" type="button" onClick={() => onComplete(consultation.id, result, finding)}><Check aria-hidden="true" /> Konsilergebnis übernehmen</button>
      </div>
    </div>
  )
}

function WikiChat({
  thread,
  decision,
  message,
  setMessage,
  onSend,
}: {
  thread?: WikiThread
  decision: CaseDecision
  message: string
  setMessage: (value: string) => void
  onSend: (value: string) => void
}) {
  const send = () => {
    if (!message.trim()) return
    onSend(message.trim())
    setMessage('')
  }
  return (
    <div className="wiki-chat">
      <div className="wiki-boundary"><BookOpen aria-hidden="true" /><span><strong>Nur Hintergrundwissen</strong><small>Der Wiki-Chat kann diese Fallentscheidung nicht als belegt markieren.</small></span></div>
      {decision.groupingRelevance === 'relevant' && <div className="wiki-warning"><ShieldAlert aria-hidden="true" /><span>Diese Frage ist gruppierungsrelevant. Bei Unsicherheit ist ein Kodierkonsil erforderlich.</span></div>}
      <div className="chat-messages" aria-live="polite">
        {(thread?.messages ?? []).length === 0 && <div className="chat-empty"><BookOpen aria-hidden="true" /><p>Frage nach DKR, ICD-/OPS-Systematik oder einem medizinischen Grundbegriff.</p></div>}
        {thread?.messages.map((item) => <div key={item.id} className={`chat-message ${item.author === 'Kodierfachkraft' ? 'own' : ''}`}><small>{item.author}</small><p>{item.text}</p></div>)}
      </div>
      <div className="chat-compose">
        <label className="sr-only" htmlFor="wiki-message">Frage an den Wiki-Chat</label>
        <textarea id="wiki-message" rows={3} placeholder="Grundlagenfrage stellen …" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button className="button primary" type="button" disabled={!message.trim()} onClick={send}><Send aria-hidden="true" /> Senden</button>
      </div>
    </div>
  )
}
