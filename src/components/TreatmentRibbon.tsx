import { Activity, ArrowRight, BookOpenCheck, Building2, Cross, Database, FileCheck2, FileCode2, FileQuestion, GitBranch, Microscope, NotebookText, Pill, Route, Scissors, ShieldAlert, ShieldCheck, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CodingCase, CodingEntry, DocumentMapItem, TreatmentEvent } from '../types'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
  onOpenEvent?: (eventId: string) => void
  onOpenDepartment?: (eventId: string, documentId?: string) => void
  onOpenDecision?: (decisionId: string) => void
}

interface DepartmentStay {
  department: string
  start: number
  end: number
  intensive: boolean
}

type ActivityLaneKey = 'diagnostic-non-invasive' | 'diagnostic-invasive' | 'intervention' | 'therapy' | 'complex'
type DocumentHypothesisBucket = 'precode' | 'validated' | 'provisional' | 'action' | 'neutral'
type DocumentEvidenceBucket = 'relevant-checked' | 'relevant-action' | 'nonrelevant-checked' | 'nonrelevant-missing'

const laneConfig: Array<{ key: ActivityLaneKey; label: string; shortLabel: string }> = [
  { key: 'diagnostic-non-invasive', label: 'Nicht-invasive Diagnostik', shortLabel: 'Nicht-invasiv' },
  { key: 'diagnostic-invasive', label: 'Invasive Diagnostik', shortLabel: 'Invasiv' },
  { key: 'intervention', label: 'Interventionen und Operationen', shortLabel: 'Eingriffe' },
  { key: 'therapy', label: 'Konservative und medikamentöse Therapie', shortLabel: 'Therapie' },
  { key: 'complex', label: 'Komplex- und Intensivbehandlung', shortLabel: 'Komplex' },
]

export function TreatmentRibbon({ codingCase, compact = false, onOpenEvent, onOpenDepartment, onOpenDecision }: TreatmentRibbonProps) {
  const events = [...codingCase.timeline].sort((a, b) => a.day - b.day || (a.time ?? '').localeCompare(b.time ?? ''))
  const departments = getDepartmentStays(events, codingCase.stayDays)
  const documents = codingCase.documentMap ?? []
  const courseDocuments = documents.filter((item) => item.kind === 'verlaufsbericht')
  const eventDocuments = documents.filter((item) => item.kind === 'ereignisbericht')
  const proofDocuments = documents.filter((item) => item.kind === 'nachweis')
  const leadingStay = departments.reduce<DepartmentStay | undefined>((longest, stay) => !longest || duration(stay) > duration(longest) ? stay : longest, undefined)
  const intensiveDays = departments.filter((stay) => stay.intensive).reduce((sum, stay) => sum + duration(stay), 0)
  const transitionCount = Math.max(0, departments.length - 1)
  const relevantEvents = events.filter((event) => !['Aufnahme', 'Verlegung', 'Entlassung'].includes(event.type))
  const currentRun = codingCase.grouperRuns.at(-1)
  const openDocument = onOpenDepartment || onOpenEvent ? (document: DocumentMapItem) => {
    const linkedEvent = events.find((event) => event.linkedDocumentIds?.includes(document.id))
      ?? events.find((event) => event.department === document.department && event.day >= document.startDay && event.day <= (document.endDay ?? document.startDay))
    if (!linkedEvent) return
    if (onOpenDepartment) onOpenDepartment(linkedEvent.id, document.id)
    else onOpenEvent?.(linkedEvent.id)
  } : undefined

  return (
    <section className={`treatment-ribbon treatment-overview ${compact ? 'is-compact' : ''}`} aria-label="Behandlungsverlauf">
      <header className="treatment-overview-head">
        <div>
          <span className="ribbon-eyebrow">Fallverständnis auf einen Blick</span>
          <strong>{departments.length} Teilaufenthalt{departments.length === 1 ? '' : 'e'} · {codingCase.stayDays} Tage</strong>
          <small>{transitionCount} Wechsel · {intensiveDays ? `${intensiveDays} Intensivtag${intensiveDays === 1 ? '' : 'e'}` : 'kein Intensivaufenthalt'} · führend: {leadingStay?.department ?? 'ungeklärt'}</small>
        </div>
        <div className="treatment-overview-facts" aria-label="Zusammenfassung relevanter Leistungen">
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'diagnostic-non-invasive').length}</b> nicht-invasiv</span>
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'diagnostic-invasive').length}</b> invasiv</span>
          <span><b>{relevantEvents.filter((event) => getActivityLane(event) === 'intervention').length}</b> Eingriffe</span>
          <span><b>{relevantEvents.filter((event) => ['therapy', 'complex'].includes(getActivityLane(event))).length}</b> Therapien</span>
        </div>
      </header>

      {compact && currentRun?.lengthOfStay && <LengthOfStayBand codingCase={codingCase} />}

      <div className="stay-map">
        <div className="ribbon-axis">
          <span>{formatDay(codingCase, 1)}</span>
          <strong>Teilaufenthalte · Breite entspricht Dauer</strong>
          <span>{formatDay(codingCase, codingCase.stayDays)}</span>
        </div>
        <div className="department-route proportional-stays" aria-label="Fachabteilungen im Fall">
          {departments.map((stay, index) => {
            const courseDocs = courseDocuments.filter((item) => item.department === stay.department && rangesOverlap(stay.start, stay.end, item.startDay, item.endDay ?? item.startDay))
            const firstEvent = events.find((event) => event.department === stay.department && event.day >= stay.start && event.day <= stay.end)
            const days = duration(stay)
            const percent = Math.round((days / codingCase.stayDays) * 100)
            const leading = stay === leadingStay
            const content = (
              <>
                <span className="department-stay-icon">{stay.intensive ? <Activity aria-hidden="true" /> : <Building2 aria-hidden="true" />}</span>
                <span className="department-stay-copy">
                  <strong>{stay.department}</strong>
                  <small>{formatDay(codingCase, stay.start)}–{formatDay(codingCase, stay.end)} · {days} Tag{days === 1 ? '' : 'e'} · {percent}%</small>
                </span>
                <span className={`stay-role ${stay.intensive ? 'intensive' : leading ? 'leading' : days <= 2 ? 'short' : ''}`}>{stay.intensive ? 'Intensivphase' : leading ? 'führend' : days <= 2 ? 'kurz' : 'Teilaufenthalt'}</span>
                <span className={`department-document-count ${courseDocs.some((item) => item.availability === 'fehlend') ? 'has-missing' : ''}`} title={`${courseDocs.length} Verlaufsdokumente`}><NotebookText aria-hidden="true" /><b>{courseDocs.length}</b></span>
                {onOpenDepartment && firstEvent && <ArrowRight className="department-stay-arrow" aria-hidden="true" />}
              </>
            )
            const style = { width: `${(days / codingCase.stayDays) * 100}%` }
            const label = `${index + 1}. Teilaufenthalt: ${stay.department}, ${formatDay(codingCase, stay.start)} bis ${formatDay(codingCase, stay.end)}, ${days} Tage, ${percent} Prozent des Falls, ${courseDocs.length} Verlaufsdokument${courseDocs.length === 1 ? '' : 'e'}${leading ? ', führender Aufenthalt' : ''}`
            return onOpenDepartment && firstEvent ? (
              <button className={`department-stay ${stay.intensive ? 'is-intensive' : ''} ${leading ? 'is-leading' : ''}`} style={style} type="button" key={`${stay.department}-${stay.start}`} aria-label={`${label}. Verlaufsdokumente öffnen.`} onClick={() => onOpenDepartment(firstEvent.id, courseDocs.length === 1 ? courseDocs[0].id : undefined)}>{content}</button>
            ) : (
              <div className={`department-stay ${stay.intensive ? 'is-intensive' : ''} ${leading ? 'is-leading' : ''}`} style={style} key={`${stay.department}-${stay.start}`} aria-label={label}>{content}</div>
            )
          })}
        </div>
      </div>

      {compact ? (
        <HypothesisCasePath codingCase={codingCase} events={relevantEvents} documents={documents} onOpenEvent={onOpenEvent} onOpenDocument={openDocument} onOpenDecision={onOpenDecision} />
      ) : <>
      <div className="document-grammar" aria-label="Dokumenttypen im Behandlungsverlauf">
        <DocumentGrammarCard icon={<NotebookText aria-hidden="true" />} title="Verlaufsdokumentation" count={courseDocuments.length} detail="Zeitraum · meist ICD und grobe OPS" className="course" />
        <DocumentGrammarCard icon={<FileCheck2 aria-hidden="true" />} title="Ereignisdokumentation" count={eventDocuments.length} detail="Zeitpunkt · gezielte ICD oder OPS" className="event" />
        <DocumentGrammarCard icon={<ShieldCheck aria-hidden="true" />} title="Leistungsnachweise" count={proofDocuments.length} detail="Zeitraum/Punkt · OPS, ZE oder NUB" className="proof" />
      </div>

      <DocumentHypothesisPanel documents={documents} codingEntries={codingCase.codingEntries} onOpenDocument={openDocument} />

      {courseDocuments.length > 0 && (
        <div className="course-document-lane">
          <span className="activity-lane-label"><NotebookText aria-hidden="true" /><span><strong>Verlaufsberichte</strong><small>spannen einen oder mehrere Aufenthaltsteile auf</small></span></span>
          <div className="course-document-track" aria-label="Verlaufsdokumente über der Zeitachse">
            {courseDocuments.map((document) => {
              const start = ((document.startDay - 1) / codingCase.stayDays) * 100
              const width = (((document.endDay ?? document.startDay) - document.startDay + 1) / codingCase.stayDays) * 100
              const linkedEvent = events.find((event) => event.linkedDocumentIds?.includes(document.id)) ?? events.find((event) => event.department === document.department)
              const status = getDocumentHypothesisStatus(document)
              const label = `${document.title}, ${formatDay(codingCase, document.startDay)} bis ${formatDay(codingCase, document.endDay ?? document.startDay)}, ${status.detail}`
              return onOpenDepartment && linkedEvent ? (
                <button key={document.id} className={`course-document-band hypothesis-${status.bucket}`} style={{ left: `${start}%`, width: `${Math.max(width, 8)}%` }} type="button" title={label} aria-label={`${label}. Zugeordnetes Dokument öffnen.`} onClick={() => onOpenDepartment(linkedEvent.id, document.id)}><span>{document.title}</span><i aria-hidden="true" /></button>
              ) : <span key={document.id} className={`course-document-band hypothesis-${status.bucket}`} style={{ left: `${start}%`, width: `${Math.max(width, 8)}%` }} title={label}><span>{document.title}</span><i aria-hidden="true" /></span>
            })}
          </div>
        </div>
      )}

      <div className="activity-lanes" aria-label="Medizinisch relevante Ereignisse nach Art">
        {laneConfig.map((lane) => {
          const laneEvents = relevantEvents.filter((event) => getActivityLane(event) === lane.key)
          if (laneEvents.length === 0) return null
          const labels = laneEvents.map((event) => event.label)
          return (
            <div className={`activity-lane lane-${lane.key}`} key={lane.key}>
              <span className="activity-lane-label"><LaneIcon lane={lane.key} /><span><strong>{lane.label}</strong><small>{summarizeLabels(labels)}</small></span><b>{laneEvents.length}</b></span>
              <div className="activity-lane-track" aria-label={`${lane.label}: ${labels.join(', ')}`}>
                {groupEventsByDay(laneEvents).map((group) => {
                  const event = group.events[0]
                  const visibleDay = Math.min(codingCase.stayDays, Math.max(1, event.day))
                  const position = codingCase.stayDays <= 1 ? 0 : ((visibleDay - 1) / (codingCase.stayDays - 1)) * 100
                  const linkedDocs = uniqueDocuments(group.events.flatMap((item) => documents.filter((document) => item.linkedDocumentIds?.includes(document.id))))
                  const eventDocCount = linkedDocs.filter((document) => document.kind === 'ereignisbericht').length
                  const proofDocCount = linkedDocs.filter((document) => document.kind === 'nachweis').length
                  const codeCount = group.events.reduce((sum, item) => sum + codingCase.codingEntries.filter((entry) => entry.treatmentEventId === item.id).length, 0)
                  const markerBucket = getDominantDocumentBucket(linkedDocs)
                  const markerLabel = `${formatDay(codingCase, event.day)}: ${group.events.map((item) => item.label).join(', ')}. ${eventDocCount} Ereignisdokumente, ${proofDocCount} Nachweise, ${codeCount} Kodes.${linkedDocs.length ? ` Dokumentenlage: ${linkedDocs.map((document) => `${document.title} – ${getDocumentHypothesisStatus(document).detail}`).join('; ')}.` : ''}`
                  const marker = (
                    <>
                      <span className="activity-marker-icon"><EventIcon event={event} /></span>
                      {group.events.length > 1 && <b>{group.events.length}</b>}
                      <span className="activity-marker-date">{formatDay(codingCase, event.day)}</span>
                      {(eventDocCount > 0 || proofDocCount > 0) && <span className="marker-document-shapes" aria-hidden="true"><i className={eventDocCount ? 'event-document-dot' : ''} /><i className={proofDocCount ? 'proof-document-square' : ''} /></span>}
                    </>
                  )
                  return onOpenEvent ? (
                    <button className={`activity-marker hypothesis-${markerBucket}`} style={{ left: `${position}%` }} type="button" key={`${lane.key}-${event.day}`} title={markerLabel} aria-label={`${markerLabel} Falllandkarte öffnen.`} onClick={() => onOpenEvent(event.id)}>{marker}</button>
                  ) : <span className={`activity-marker hypothesis-${markerBucket}`} style={{ left: `${position}%` }} key={`${lane.key}-${event.day}`} title={markerLabel}>{marker}</span>
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="timeline-legend" aria-label="Legende der Behandlungsübersicht">
        <span><i className="legend-course" />Band = zusammenfassender Verlauf</span>
        <span><i className="legend-event" />Punkt = Ereignisbericht</span>
        <span><i className="legend-proof" />Quadrat = Leistungsnachweis</span>
        <span><FileCode2 aria-hidden="true" />Klick öffnet die passende Stelle der Dokumentenlandkarte</span>
      </div>
      </>}

      {codingCase.technicalValues.length > 0 && (
        <div className="ribbon-technical" aria-label="Importierte technische Leistungen">
          {codingCase.technicalValues.map((value) => <span key={value.id}><ShieldAlert aria-hidden="true" />{value.code ?? value.label}{value.aggregateValue ? ` · ${value.aggregateValue} ${value.unit}` : ''}</span>)}
        </div>
      )}
    </section>
  )
}

function HypothesisCasePath({ codingCase, events, documents, onOpenEvent, onOpenDocument, onOpenDecision }: {
  codingCase: CodingCase
  events: TreatmentEvent[]
  documents: DocumentMapItem[]
  onOpenEvent?: (eventId: string) => void
  onOpenDocument?: (document: DocumentMapItem) => void
  onOpenDecision?: (decisionId: string) => void
}) {
  const currentRun = codingCase.grouperRuns.at(-1)
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const openDecision = codingCase.decisions.find((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status))
  const relevantDocuments = documents.filter((document) => document.kind !== 'vorkodierung')
  const focusDocument = relevantDocuments.find((document) => document.linkedDecisionId === openDecision?.id && document.priority === 'jetzt')
    ?? relevantDocuments.find((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action')
  const focusEvent = events.find((event) => focusDocument && event.linkedDocumentIds?.includes(focusDocument.id))
    ?? events.find((event) => codingCase.codingEntries.some((entry) => entry.treatmentEventId === event.id && entry.reviewStatus !== 'belegt'))
    ?? events[0]
  const openRequired = codingCase.decisions.filter((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length
  const relevantGaps = relevantDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action').length
  const safety = openRequired === 0 && relevantGaps === 0 ? 'hoch' : openRequired <= 1 && relevantGaps <= 1 ? 'mittel' : 'niedrig'
  const focusTitle = openDecision?.title ?? focusDocument?.title ?? focusEvent?.label ?? 'Abschlussprüfung'
  const focusReason = openDecision?.effect ?? focusDocument?.resultImpact ?? 'Die verbleibende Belegkette gegen die aktuelle DRG-Hypothese prüfen.'
  const pathEvents = events.filter((event) => {
    const linkedDocuments = documents.filter((document) => event.linkedDocumentIds?.includes(document.id))
    const linkedCodes = activeEntries.filter((entry) => entry.treatmentEventId === event.id)
    return linkedDocuments.length > 0 || linkedCodes.length > 0 || ['Eingriff', 'Therapie', 'Intensiv'].includes(event.type)
  })

  const openFocus = () => {
    if (openDecision && onOpenDecision) onOpenDecision(openDecision.id)
    else if (focusDocument && onOpenDocument) onOpenDocument(focusDocument)
    else if (focusEvent) onOpenEvent?.(focusEvent.id)
  }

  return (
    <section className="hypothesis-case-path" aria-label="Hypothesengesteuerter Fallpfad">
      <header className="hypothesis-path-head">
        <span className="hypothesis-target-icon"><Target aria-hidden="true" /></span>
        <span>
          <small>Prüfziel · Iteration {currentRun?.iteration ?? 1}</small>
          <strong>DRG {currentRun?.drg ?? '–'} belastbar verifizieren oder falsifizieren</strong>
          <p>Nur die nächste ergebnisrelevante Belegkette öffnen – nicht vorsorglich den ganzen Fall neu kodieren.</p>
        </span>
        <span className="simulation-label">Simulierte Prüfsignale</span>
      </header>

      <div className="hypothesis-sources" aria-label="Vorgesehene Quellen der Hypothese">
        <HypothesisSource icon={<FileCode2 aria-hidden="true" />} label="Ausgangskodierung" value={`${activeEntries.filter((entry) => entry.origin === 'vorkodierung').length} Vorkodes`} detail="Startpunkt, kein Beleg" />
        <HypothesisSource icon={<BookOpenCheck aria-hidden="true" />} label="Regelwerke" value="DKR · ICD-10-GM · OPS" detail="Prüfung vorgesehen" />
        <HypothesisSource icon={<GitBranch aria-hidden="true" />} label="Grouperraum" value={`Pfad ${currentRun?.drg ?? 'offen'}`} detail="bis zu 1.450 Fallpauschalen · Änderungsvarianz vorgesehen" />
        <HypothesisSource icon={<Database aria-hidden="true" />} label="Haus- & Verlaufswissen" value={`${codingCase.comparableCases} Vergleichsfälle`} detail={`${codingCase.hospitalTypicality} · Fachabteilung ↔ MDC`} />
      </div>

      <article className="shortest-path-action">
        <span className="shortest-path-number">1</span>
        <span>
          <small>Nächster kürzester belastbarer Schritt</small>
          <strong>{focusTitle}</strong>
          <p>{focusReason}</p>
        </span>
        <button type="button" onClick={openFocus} disabled={!openDecision && !focusEvent && !focusDocument}>Gezielt prüfen <ArrowRight aria-hidden="true" /></button>
      </article>

      <section className="evidence-chain" aria-label="Verlauf, Dokumente und Kodierung als gemeinsame Belegkette">
        <header><span><Route aria-hidden="true" /><strong>Behandlungsverlauf als Belegkette</strong></span><small>LLM-Entwurf aus den hochgeladenen Entlassungsberichten</small></header>
        <div className="evidence-chain-list">
          {pathEvents.map((event) => {
            const linkedDocuments = documents.filter((document) => event.linkedDocumentIds?.includes(document.id))
            const linkedCodes = activeEntries.filter((entry) => entry.treatmentEventId === event.id)
            const hasRelevantGap = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action')
            const hasUnprovenCode = linkedCodes.some((entry) => entry.reviewStatus !== 'belegt' && entry.groupingImpact !== 'ohne-änderung')
            const hasProof = linkedDocuments.some((document) => ['grob-geprüft', 'validiert'].includes(document.reviewLevel)) && linkedCodes.some((entry) => entry.reviewStatus === 'belegt')
            const state = hasRelevantGap || hasUnprovenCode ? 'open' : hasProof ? 'checked' : 'context'
            const isFocus = event.id === focusEvent?.id
            return (
              <button className={`evidence-chain-row state-${state} ${isFocus ? 'is-focus' : ''}`} type="button" key={event.id} onClick={() => onOpenEvent?.(event.id)}>
                <span className="chain-event"><EventIcon event={event} /><span><small>{formatDay(codingCase, event.day)} · {event.department}</small><strong>{event.label}</strong></span></span>
                <span className="chain-documents"><small>Dokumentbezug</small><strong>{linkedDocuments.length ? linkedDocuments.map((document) => document.title).join(' · ') : 'Noch kein Einzeldokument'}</strong><em>{linkedDocuments.length ? linkedDocuments.map((document) => getDocumentEvidenceStatus(document).detail).join(' · ') : 'aus Entlassungsbericht abgeleitet'}</em></span>
                <span className="chain-coding"><small>Kodierwirkung</small><strong>{linkedCodes.length ? linkedCodes.map((entry) => `${entry.type} ${entry.code}`).join(' · ') : 'Kodierung offen'}</strong><em>{linkedCodes.length ? linkedCodes.map((entry) => groupingImpactLabels[entry.groupingImpact ?? 'potenziell'].label).join(' · ') : 'erst bei Ergebnisrelevanz bearbeiten'}</em></span>
                <span className={`chain-state ${state}`}>{state === 'checked' ? <ShieldCheck aria-hidden="true" /> : state === 'open' ? <ShieldAlert aria-hidden="true" /> : <FileQuestion aria-hidden="true" />}{isFocus ? 'Jetzt prüfen' : state === 'checked' ? 'Belegt' : state === 'open' ? 'Offen' : 'Kontext'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <GroupingInfluencePanel codingEntries={codingCase.codingEntries} />

      <footer className={`case-safety safety-${safety}`}>
        <ShieldCheck aria-hidden="true" />
        <span><small>Arbeitsstand, keine fachliche Garantie</small><strong>Fallsicherheit {safety}</strong><p>{openRequired} Pflichtentscheidung{openRequired === 1 ? '' : 'en'} und {relevantGaps} ergebnisrelevante Dokumentlücke{relevantGaps === 1 ? '' : 'n'} verbleiben.</p></span>
      </footer>
    </section>
  )
}

function HypothesisSource({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <span>{icon}<span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></span>
}

function LengthOfStayBand({ codingCase }: { codingCase: CodingCase }) {
  const currentRun = codingCase.grouperRuns.at(-1)
  const profile = currentRun?.lengthOfStay
  if (!currentRun || !profile || profile.meanDays <= 0) return null

  const lower = profile.lowerFirstDiscountDay
  const upper = profile.upperFirstSurchargeDay
  const scaleMaximum = Math.max(codingCase.stayDays, profile.meanDays, upper ?? 0, 2)
  const position = (day: number) => `${Math.min(100, Math.max(0, ((day - 1) / (scaleMaximum - 1)) * 100))}%`
  const meanDelta = codingCase.stayDays - profile.meanDays
  const status = lower !== undefined && codingCase.stayDays <= lower
    ? 'Unterer Abschlagsbereich'
    : upper !== undefined && codingCase.stayDays >= upper
      ? 'Oberer Zuschlagsbereich'
      : 'Innerhalb der Grenzverweildauer'
  const distanceToUpper = upper === undefined ? undefined : upper - codingCase.stayDays

  return (
    <section className="drg-stay-band" aria-label="Verweildauer zur aktuellen DRG-Hypothese">
      <header>
        <span><strong>Verweildauer im DRG-Kontext</strong><small>{currentRun.drg} · {profile.careSetting} · Katalog {profile.catalogYear}</small></span>
        <span className={`stay-corridor-status ${status.includes('Zuschlag') || status.includes('Abschlag') ? 'is-outside' : ''}`}>{status}</span>
      </header>
      <div className="drg-stay-scale" aria-hidden="true">
        <div className="drg-stay-track">
          <span className="drg-stay-progress" style={{ width: position(codingCase.stayDays) }} />
          {lower !== undefined && <i className="stay-threshold lower" style={{ left: position(lower) }} />}
          <i className="stay-threshold mean" style={{ left: position(profile.meanDays) }} />
          <i className="stay-threshold current" style={{ left: position(codingCase.stayDays) }} />
          {upper !== undefined && <i className="stay-threshold upper" style={{ left: position(upper) }} />}
        </div>
      </div>
      <div className="drg-stay-values">
        <span><small>UGV</small><strong>{lower === undefined ? '–' : `Tag ${lower}`}</strong><em>erster Abschlagstag</em></span>
        <span><small>MVD</small><strong>{profile.meanDays.toLocaleString('de-DE')} Tage</strong><em>{meanDelta === 0 ? 'Fall entspricht MVD' : `${Math.abs(meanDelta).toLocaleString('de-DE')} Tage ${meanDelta > 0 ? 'darüber' : 'darunter'}`}</em></span>
        <span className="is-current"><small>Aktueller Fall</small><strong>{codingCase.stayDays} Tage</strong><em>{distanceToUpper === undefined ? 'OGV nicht ausgewiesen' : distanceToUpper > 0 ? `${distanceToUpper} Tage bis OGV` : distanceToUpper === 0 ? 'erster Zuschlagstag' : `${Math.abs(distanceToUpper)} Tage über OGV`}</em></span>
        <span><small>OGV</small><strong>{upper === undefined ? '–' : `Tag ${upper}`}</strong><em>erster Zuschlagstag</em></span>
      </div>
    </section>
  )
}

const groupingImpactLabels = {
  pfadbestimmend: { label: 'Pfadbestimmend', detail: 'Bestimmt MDC oder führenden DRG-Pfad' },
  'split-relevant': { label: 'Split-relevant', detail: 'Kann die konkrete DRG innerhalb des Pfads verändern' },
  potenziell: { label: 'DRG/ZE möglich', detail: 'Wirkung hängt vom vollständigen Nachweis ab' },
  'ohne-änderung': { label: 'Aktuell ohne Änderung', detail: 'Gegenprobe verändert das Ergebnis derzeit nicht' },
} as const

function GroupingInfluencePanel({ codingEntries }: { codingEntries: CodingEntry[] }) {
  const activeEntries = codingEntries.filter((entry) => entry.active)
  return (
    <section className="grouping-influence-panel" aria-label="Einfluss von Diagnosen und Prozeduren auf die aktuelle DRG-Hypothese">
      <header><span><strong>Diagnosen und Prozeduren im Grouperpfad</strong><small>Definitionspfad und Gegenprobe gelten für die aktuelle Iteration.</small></span><span>{activeEntries.length} aktive Kodes</span></header>
      <div className="grouping-influence-list">
        {activeEntries.map((entry) => {
          const impactKey = entry.groupingImpact ?? (entry.type === 'HD' ? 'pfadbestimmend' : entry.type === 'OPS' ? 'potenziell' : 'ohne-änderung')
          const impact = groupingImpactLabels[impactKey]
          const reviewLabel = entry.reviewStatus === 'belegt' ? 'belegt' : entry.reviewStatus === 'wahrscheinlich' ? 'vorläufig' : entry.reviewStatus === 'widersprüchlich' ? 'widersprüchlich' : 'ungeprüft'
          return (
            <div className={`grouping-influence-row impact-${impactKey}`} key={entry.id}>
              <span className="coding-type">{entry.type}</span>
              <span><strong><code>{entry.code}</code> · {entry.description}</strong><small>{reviewLabel} · bewertet in Iteration {entry.assessedIteration}</small></span>
              <span><strong>{impact.label}</strong><small>{entry.groupingImpactReason ?? impact.detail}</small></span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DocumentGrammarCard({ icon, title, count, detail, className }: { icon: ReactNode; title: string; count: number; detail: string; className: string }) {
  return <div className={`document-grammar-card grammar-${className}`}>{icon}<span><strong>{title}</strong><small>{detail}</small></span><b>{count}</b></div>
}

const evidenceGroupConfig: Array<{ bucket: DocumentEvidenceBucket; label: string; description: string; icon: ReactNode }> = [
  { bucket: 'relevant-checked', label: 'Relevant · geprüft', description: 'Stützt oder falsifiziert die Hypothese', icon: <ShieldCheck aria-hidden="true" /> },
  { bucket: 'relevant-action', label: 'Relevant · offen oder fehlend', description: 'Höchster möglicher Ergebnisbeitrag', icon: <ShieldAlert aria-hidden="true" /> },
  { bucket: 'nonrelevant-checked', label: 'Derzeit nicht relevant · geprüft', description: 'Gegenprobe ohne Ergebnisänderung', icon: <FileCheck2 aria-hidden="true" /> },
  { bucket: 'nonrelevant-missing', label: 'Derzeit nicht relevant · fehlt', description: 'Keine Nachforderung ohne neue Hinweise', icon: <FileQuestion aria-hidden="true" /> },
]

function DocumentHypothesisPanel({ documents, codingEntries, onOpenDocument }: { documents: DocumentMapItem[]; codingEntries: CodingEntry[]; onOpenDocument?: (document: DocumentMapItem) => void }) {
  const evidenceDocuments = documents.filter((document) => document.kind !== 'vorkodierung')
  const precodeCount = codingEntries.filter((entry) => entry.active && entry.origin === 'vorkodierung').length
  const relevantOpen = evidenceDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action').length
  const checked = evidenceDocuments.filter((document) => ['relevant-checked', 'nonrelevant-checked'].includes(getDocumentEvidenceStatus(document).bucket)).length
  return (
    <section className="document-hypothesis-panel" aria-label="Dokumentenbewertung zur DRG-Hypothese">
      <header>
        <span><strong>Beweislage zur aktuellen DRG- und Entgelthypothese</strong><small>Relevanz, Verfügbarkeit und Prüfstand werden je Iteration neu bewertet.</small></span>
        <span>{relevantOpen} relevante Lücke{relevantOpen === 1 ? '' : 'n'} · {checked} geprüft · {precodeCount} Vorkodes</span>
      </header>
      <div className="precode-context"><FileCode2 aria-hidden="true" /><span><strong>Vorkodierung ist der Ausgangspunkt</strong><small>Sie priorisiert die Prüfung, zählt aber nicht als Fallnachweis.</small></span></div>
      <div className="document-hypothesis-groups evidence-matrix">
        {evidenceGroupConfig.map((group) => {
          const groupedDocuments = evidenceDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === group.bucket)
          return (
            <section className={`document-hypothesis-group hypothesis-${group.bucket}`} key={group.bucket}>
              <div className="document-hypothesis-group-head">{group.icon}<span><strong>{group.label}</strong><small>{group.description}</small></span><b>{groupedDocuments.length}</b></div>
              <div className="hypothesis-document-list">
                {groupedDocuments.length === 0 && <p className="empty-evidence-bucket">Keine Dokumente in diesem Status</p>}
                {groupedDocuments.map((document) => {
                  const status = getDocumentEvidenceStatus(document)
                  const linkedEntries = document.kind === 'vorkodierung'
                    ? codingEntries.filter((entry) => entry.active && entry.origin === 'vorkodierung')
                    : codingEntries.filter((entry) => entry.active && entry.evidenceDocumentId === document.id)
                  const content = <><span>{document.availability === 'fehlend' ? <FileQuestion aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}</span><span><strong>{document.title}</strong><small>{status.detail}{linkedEntries.length ? ` · ${linkedEntries.length} Kode${linkedEntries.length === 1 ? '' : 's'}` : ''}</small><small className="document-result-impact">{document.resultImpact}</small></span>{onOpenDocument && <ArrowRight aria-hidden="true" />}</>
                  return onOpenDocument ? <button type="button" key={document.id} onClick={() => onOpenDocument(document)}>{content}</button> : <div key={document.id}>{content}</div>
                })}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function getDocumentEvidenceStatus(document: DocumentMapItem): { bucket: DocumentEvidenceBucket; detail: string } {
  const groupingRelevant = document.priority === 'jetzt' || [document.outcomeDimensions.drg, document.outcomeDimensions.ops, document.outcomeDimensions.entgelte].includes('relevant')
  const reviewed = document.availability === 'vorhanden' && ['grob-geprüft', 'validiert'].includes(document.reviewLevel)
  if (groupingRelevant && reviewed) return { bucket: 'relevant-checked', detail: document.reviewLevel === 'validiert' ? 'vorhanden · validiert' : 'vorhanden · geprüft' }
  if (groupingRelevant) return { bucket: 'relevant-action', detail: document.availability === 'fehlend' ? 'fehlt · gruppierungsrelevant' : 'vorhanden · Nachvalidierung nötig' }
  if (document.availability === 'vorhanden') return { bucket: 'nonrelevant-checked', detail: 'vorhanden · Relevanz geprüft' }
  return { bucket: 'nonrelevant-missing', detail: 'fehlt · Relevanz geprüft' }
}

function getDocumentHypothesisStatus(document: DocumentMapItem): { bucket: DocumentHypothesisBucket; detail: string } {
  if (document.kind === 'vorkodierung') return { bucket: 'precode', detail: document.reviewLevel === 'validiert' ? 'vorhanden · validiert' : 'vorhanden · grob geprüft' }
  if (document.reviewLevel === 'validiert') return { bucket: 'validated', detail: 'vorhanden · validiert' }
  if (document.priority === 'jetzt' || document.reviewLevel === 'nachvalidierung') return { bucket: 'action', detail: document.availability === 'fehlend' ? 'fehlend · potentiell relevant' : 'vorhanden · Nachvalidierung nötig' }
  if (document.relevance === 'neutral' || document.reviewLevel === 'nicht-angefordert') return { bucket: 'neutral', detail: document.availability === 'fehlend' ? 'fehlend · vermutlich nicht relevant' : 'vorhanden · vermutlich nicht relevant' }
  return { bucket: 'provisional', detail: document.availability === 'fehlend' ? 'fehlend · vorläufig stimmig' : 'vorhanden · vorläufig stimmig' }
}

function getDominantDocumentBucket(documents: DocumentMapItem[]): DocumentHypothesisBucket {
  const priority: DocumentHypothesisBucket[] = ['action', 'validated', 'provisional', 'precode', 'neutral']
  return priority.find((bucket) => documents.some((document) => getDocumentHypothesisStatus(document).bucket === bucket)) ?? 'neutral'
}

function uniqueDocuments(documents: DocumentMapItem[]) {
  return [...new Map(documents.map((document) => [document.id, document])).values()]
}

function LaneIcon({ lane }: { lane: ActivityLaneKey }) {
  if (lane === 'diagnostic-non-invasive' || lane === 'diagnostic-invasive') return <Microscope aria-hidden="true" />
  if (lane === 'intervention') return <Scissors aria-hidden="true" />
  if (lane === 'complex') return <Activity aria-hidden="true" />
  return <Pill aria-hidden="true" />
}

export function EventIcon({ event }: { event: TreatmentEvent }) {
  if (event.type === 'Eingriff') return <Scissors aria-hidden="true" />
  if (event.type === 'Diagnostik') return <Microscope aria-hidden="true" />
  if (event.type === 'Therapie') return <Pill aria-hidden="true" />
  if (event.type === 'Intensiv') return <Activity aria-hidden="true" />
  return <Cross aria-hidden="true" />
}

export function dateForEvent(codingCase: CodingCase, event: TreatmentEvent) {
  return codingCase.admissionDate ? addDays(codingCase.admissionDate, event.day - 1) : undefined
}

export function formatDay(codingCase: CodingCase, day: number) {
  if (!codingCase.admissionDate) return `Tag ${day}`
  return new Date(`${addDays(codingCase.admissionDate, day - 1)}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDepartmentStays(events: TreatmentEvent[], stayDays: number): DepartmentStay[] {
  const admission = events.find((event) => event.type === 'Aufnahme') ?? events[0]
  if (!admission) return []
  const transitions = events.filter((event) => event.type === 'Verlegung' || event.type === 'Intensiv').sort((a, b) => a.day - b.day)
  const stays: DepartmentStay[] = []
  let currentDepartment = admission.department
  let currentStart = 1

  transitions.forEach((event, index) => {
    if (event.day > currentStart) stays.push({ department: currentDepartment, start: currentStart, end: event.day - 1, intensive: currentDepartment === 'Intensivmedizin' })
    if (event.type === 'Intensiv') {
      const intensiveEnd = Math.min(stayDays, event.endDay ?? event.day)
      stays.push({ department: event.department, start: event.day, end: intensiveEnd, intensive: true })
      currentStart = intensiveEnd + 1
      const nextTransition = transitions[index + 1]
      if (!nextTransition || nextTransition.day > currentStart) currentDepartment = admission.department
    } else {
      currentDepartment = event.department
      currentStart = event.day
    }
  })

  if (currentStart <= stayDays) stays.push({ department: currentDepartment, start: currentStart, end: stayDays, intensive: currentDepartment === 'Intensivmedizin' })
  return stays.filter((stay) => stay.end >= stay.start)
}

function getActivityLane(event: TreatmentEvent): ActivityLaneKey {
  const label = event.label.toLowerCase()
  if (event.type === 'Intensiv' || /komplex|palliativ|organersatz|beatmung/.test(label)) return 'complex'
  if (event.type === 'Eingriff' && /bronchos|biops|punktion|gewebe|endoson|diagnost/.test(label)) return 'diagnostic-invasive'
  if (event.type === 'Eingriff') return 'intervention'
  if (event.type === 'Diagnostik' && /bronchos|biops|punktion|endoson|invasiv/.test(label)) return 'diagnostic-invasive'
  if (event.type === 'Diagnostik') return 'diagnostic-non-invasive'
  return 'therapy'
}

function groupEventsByDay(events: TreatmentEvent[]) {
  const groups = new Map<number, TreatmentEvent[]>()
  events.forEach((event) => groups.set(event.day, [...(groups.get(event.day) ?? []), event]))
  return [...groups.entries()].sort(([dayA], [dayB]) => dayA - dayB).map(([day, groupedEvents]) => ({ day, events: groupedEvents }))
}

function summarizeLabels(labels: string[]) {
  if (labels.length <= 2) return labels.join(' · ')
  return `${labels.slice(0, 2).join(' · ')} · +${labels.length - 2} weitere`
}

function duration(stay: DepartmentStay) {
  return stay.end - stay.start + 1
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA <= endB && startB <= endA
}
