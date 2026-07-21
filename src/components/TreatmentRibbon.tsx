import { Activity, ArrowRight, BookOpenCheck, Building2, ChevronDown, Cross, Database, FileCheck2, FileCode2, FileQuestion, FileUp, GitBranch, Microscope, NotebookText, Pill, Route, ScanLine, Scissors, ShieldAlert, ShieldCheck, Target } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { CodingCase, CodingEntry, DocumentMapItem, TreatmentEvent } from '../types'
import './TreatmentRibbon.v27.css'

interface TreatmentRibbonProps {
  codingCase: CodingCase
  compact?: boolean
  mode?: 'hypothesis' | 'intake'
  onOpenEvent?: (eventId: string) => void
  onOpenDepartment?: (eventId: string, documentId?: string) => void
  onOpenDecision?: (decisionId: string) => void
  onUploadEventDocument?: (eventId: string, files: FileList | null) => void
  onUploadCourseDocument?: (eventId: string, files: FileList | null) => void
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

export function TreatmentRibbon({ codingCase, compact = false, mode = 'hypothesis', onOpenEvent, onOpenDepartment, onOpenDecision, onUploadEventDocument, onUploadCourseDocument }: TreatmentRibbonProps) {
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

  if (compact) {
    return <V27TreatmentPath codingCase={codingCase} events={events} departments={departments} documents={documents} mode={mode} onOpenEvent={onOpenEvent} onOpenDocument={openDocument} onOpenDecision={onOpenDecision} onOpenDepartment={onOpenDepartment} onUploadEventDocument={onUploadEventDocument} onUploadCourseDocument={onUploadCourseDocument} />
  }

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
        <HypothesisCasePath codingCase={codingCase} events={relevantEvents} departments={departments} documents={documents} mode={mode} onOpenEvent={onOpenEvent} onOpenDocument={openDocument} onOpenDecision={onOpenDecision} />
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

function V27TreatmentPath({ codingCase, events, departments, documents, mode, onOpenEvent, onOpenDocument, onOpenDecision, onOpenDepartment, onUploadEventDocument, onUploadCourseDocument }: {
  codingCase: CodingCase
  events: TreatmentEvent[]
  departments: DepartmentStay[]
  documents: DocumentMapItem[]
  mode: 'hypothesis' | 'intake'
  onOpenEvent?: (eventId: string) => void
  onOpenDocument?: (document: DocumentMapItem) => void
  onOpenDecision?: (decisionId: string) => void
  onOpenDepartment?: (eventId: string, documentId?: string) => void
  onUploadEventDocument?: (eventId: string, files: FileList | null) => void
  onUploadCourseDocument?: (eventId: string, files: FileList | null) => void
}) {
  const intakeMode = mode === 'intake'
  const currentRun = codingCase.grouperRuns.at(-1)
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const relevantDocuments = documents.filter((document) => document.kind !== 'vorkodierung')
  const openDecision = codingCase.decisions.find((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status))
  const focusDocument = intakeMode || !openDecision ? undefined : relevantDocuments.find((document) => document.linkedDecisionId === openDecision.id && document.priority === 'jetzt')
    ?? relevantDocuments.find((document) => document.linkedDecisionId === openDecision.id && getDocumentEvidenceStatus(document).bucket === 'relevant-action')
  const unresolvedCodeEvent = events.find((event) => activeEntries.some((entry) => entry.treatmentEventId === event.id && entry.reviewStatus !== 'belegt'))
  const firstClinicalEvent = events.find((event) => !['Aufnahme', 'Verlegung', 'Entlassung'].includes(event.type))
  const focusEvent = intakeMode ? undefined : (openDecision
    ? events.find((event) => focusDocument && event.linkedDocumentIds?.includes(focusDocument.id)) ?? unresolvedCodeEvent ?? firstClinicalEvent
    : unresolvedCodeEvent)
  const openRequired = codingCase.decisions.filter((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length
  const openAlternatives = codingCase.decisions.filter((decision) => !decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length
  const relevantGaps = relevantDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action').length
  const unvalidatedCodes = activeEntries.filter((entry) => entry.reviewStatus !== 'belegt').length
  const stability = openRequired === 0 ? 'hoch' : openRequired === 1 ? 'mittel' : 'niedrig'
  const evidenceSafety = relevantGaps === 0 ? 'hoch' : relevantGaps === 1 ? 'mittel' : 'niedrig'
  const codingSafety = unvalidatedCodes === 0 ? 'hoch' : unvalidatedCodes <= 3 ? 'mittel' : 'niedrig'
  const focusTitle = openDecision?.title ?? focusDocument?.title ?? focusEvent?.label
  const focusReason = openDecision?.effect ?? focusDocument?.resultImpact ?? 'Den noch offenen Sachverhalt am Behandlungsverlauf prüfen.'
  const stageWidth = Math.max(820, Math.ceil(codingCase.stayDays * (codingCase.stayDays <= 20 ? 48 : codingCase.stayDays <= 40 ? 40 : 34)))
  const eventLayout = layoutTimelineEvents(events, codingCase.stayDays, stageWidth - 148)
  const eventRows = Math.max(1, ...eventLayout.map((item) => item.row + 1))
  const stageHeight = 174 + (eventRows - 1) * 105
  const toneByDepartment = new Map<string, number>()
  departments.forEach((stay) => {
    if (!toneByDepartment.has(stay.department)) toneByDepartment.set(stay.department, toneByDepartment.size % 5)
  })

  const openFocus = () => {
    if (openDecision && onOpenDecision) onOpenDecision(openDecision.id)
    else if (focusDocument && onOpenDocument) onOpenDocument(focusDocument)
    else if (focusEvent) onOpenEvent?.(focusEvent.id)
  }

  return (
    <section className={`v27-treatment-map ${intakeMode ? 'is-intake' : 'is-hypothesis'}`} aria-label="Gemeinsame Fallkarte">
      <header className="v27-map-head">
        {intakeMode ? <>
          <span className="v27-head-primary"><small>Fallbasis</small><strong>{events.length} Behandlungsereignisse</strong><em>Automatisch zusammengeführt</em></span>
          <span><small>Teilaufenthalte</small><strong>{departments.length}</strong><em>{departments.map((stay) => stay.department).filter((value, index, values) => value !== values[index - 1]).join(' → ')}</em></span>
          <span><small>Aufenthalt</small><strong>{codingCase.stayDays} Tage</strong><em>{formatDay(codingCase, 1)}–{formatDay(codingCase, codingCase.stayDays)}</em></span>
          <span><small>Prüfauftrag</small><strong>Zeitfolge prüfen</strong><em>Events und Fachabteilungen</em></span>
        </> : <>
          <span className="v27-head-primary"><small>DRG-Hypothese · Iteration {currentRun?.iteration ?? 1}</small><strong>{currentRun?.drg ?? '–'}</strong><em>{codingCase.currentMainDiagnosis}</em></span>
          <span className={`safety-${stability}`}><small>DRG-Stabilität</small><strong>{stability}</strong><em>{openAlternatives} Alternativpfad{openAlternatives === 1 ? '' : 'e'} offen</em></span>
          <span className={`safety-${evidenceSafety}`}><small>Belegsicherheit</small><strong>{evidenceSafety}</strong><em>{relevantGaps} relevante Lücke{relevantGaps === 1 ? '' : 'n'}</em></span>
          <span className={`safety-${codingSafety}`}><small>Kodiersicherheit</small><strong>{codingSafety}</strong><em>{unvalidatedCodes} Kode{unvalidatedCodes === 1 ? '' : 's'} offen</em></span>
        </>}
      </header>

      {!intakeMode && <V27LengthOfStayCorridor codingCase={codingCase} />}

      {!intakeMode && focusTitle && (
        <button className="v27-next-action" type="button" onClick={openFocus}>
          <b>1</b>
          <span><small>Nächster belastbarer Schritt</small><strong>{focusTitle}</strong><em>{focusReason}</em></span>
          <i>Prüfen <ArrowRight aria-hidden="true" /></i>
        </button>
      )}

      <figure className="v27-timeline-figure">
        <figcaption>
          <span><strong>{intakeMode ? 'Behandlungsverlauf prüfen' : 'Behandlungsverlauf der DRG-Hypothese'}</strong><small>Fachabteilungen und Events auf einer gemeinsamen Zeitachse</small></span>
          <time>{formatDay(codingCase, 1)}–{formatDay(codingCase, codingCase.stayDays)}</time>
        </figcaption>
        <div className="v27-timeline-scroll">
          <div className="v27-timeline-stage" style={{ minWidth: `${stageWidth}px`, height: `${stageHeight}px` }}>
            <div className="v27-timeline-axis">
              {departments.map((stay, index) => {
                const left = ((stay.start - 1) / Math.max(1, codingCase.stayDays)) * 100
                const width = (duration(stay) / Math.max(1, codingCase.stayDays)) * 100
                const stayEvents = events.filter((event) => event.day >= stay.start && event.day <= stay.end)
                const firstEvent = stayEvents.find((event) => event.department === stay.department) ?? stayEvents[0]
                const courseDocuments = documents.filter((document) => document.kind === 'verlaufsbericht' && document.department === stay.department && rangesOverlap(stay.start, stay.end, document.startDay, document.endDay ?? document.startDay))
                const tone = toneByDepartment.get(stay.department) ?? 0
                const head = <><span><strong>{stay.department}</strong><small>{formatDay(codingCase, stay.start)}–{formatDay(codingCase, stay.end)} · {duration(stay)} Tag{duration(stay) === 1 ? '' : 'e'}</small></span>{stay.intensive ? <Activity aria-hidden="true" /> : <Building2 aria-hidden="true" />}</>
                return (
                  <div className={`v27-department-segment tone-${tone} ${stay.intensive ? 'is-intensive' : ''}`} style={{ left: `${left}%`, width: `${width}%` }} key={`${stay.department}-${stay.start}`}>
                    {onOpenDepartment && firstEvent
                      ? <button className="v27-department-head" type="button" aria-label={`${stay.department}, ${duration(stay)} Tage: Teilaufenthalt öffnen`} onClick={() => onOpenDepartment(firstEvent.id, courseDocuments.length === 1 ? courseDocuments[0].id : undefined)}>{head}</button>
                      : <span className="v27-department-head">{head}</span>}
                    {index > 0 && <span className="v27-transfer-boundary" aria-hidden="true"><span><ArrowRight /> Verlegung</span></span>}
                  </div>
                )
              })}
              <span className="v27-time-axis" aria-hidden="true" />
              {eventLayout.map(({ event, row }) => {
                const linkedDocuments = intakeMode ? [] : documents.filter((document) => event.linkedDocumentIds?.includes(document.id) && document.kind !== 'vorkodierung')
                const linkedCodes = intakeMode ? [] : activeEntries.filter((entry) => entry.treatmentEventId === event.id || linkedDocuments.some((document) => document.id === entry.evidenceDocumentId))
                const primaryDocument = linkedDocuments.find((document) => document.priority === 'jetzt') ?? linkedDocuments[0]
                const hasMissingRelevant = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action' && document.availability === 'fehlend')
                const hasCheckedRelevant = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-checked')
                const hasOpenRelevant = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action')
                const isFocus = !intakeMode && event.id === focusEvent?.id
                const state = isFocus ? 'focus' : hasMissingRelevant ? 'missing' : hasCheckedRelevant ? 'checked' : hasOpenRelevant ? 'open' : 'context'
                const statusLabel = isFocus ? 'jetzt prüfen' : hasMissingRelevant ? 'Nachweis fehlt' : hasCheckedRelevant ? 'geprüft' : hasOpenRelevant ? 'offen' : 'Kontext'
                const icdCount = linkedCodes.filter((entry) => entry.type === 'HD' || entry.type === 'ND').length
                const opsCount = linkedCodes.filter((entry) => entry.type === 'OPS').length
                const day = Math.min(Math.max(1, event.day), Math.max(1, codingCase.stayDays))
                const position = ((day - .5) / Math.max(1, codingCase.stayDays)) * 100
                const cardStyle = {
                  left: `${position}%`,
                  top: `${72 + row * 105}px`,
                  '--event-connector-height': `${11 + row * 105}px`,
                } as CSSProperties
                const ariaLabel = `${formatDay(codingCase, event.day)}${event.time ? `, ${event.time} Uhr` : ''}, ${event.department}: ${event.label}.${intakeMode ? '' : ` ${statusLabel}; ${icdCount} ICD und ${opsCount} OPS.`}`
                const content = <>
                  <span className="v27-event-node"><EventIcon event={event} /></span>
                  <span className="v27-event-meta"><time>{formatDay(codingCase, event.day)}{event.time ? ` · ${event.time}` : ''}</time><em>{event.department}</em></span>
                  <strong>{event.label}</strong>
                  {intakeMode
                    ? <span className="v27-event-kind">{event.type}</span>
                    : <span className="v27-event-evidence"><span>{primaryDocument ? statusLabel : 'kein Dokument'}</span><b>{icdCount} ICD · {opsCount} OPS</b></span>}
                </>
                return onOpenEvent
                  ? <button className={`v27-event-card state-${state}`} type="button" style={cardStyle} key={event.id} aria-label={ariaLabel} onClick={() => onOpenEvent(event.id)}>{content}</button>
                  : <div className={`v27-event-card state-${state} is-static`} style={cardStyle} key={event.id} role="group" aria-label={ariaLabel}>{content}</div>
              })}
            </div>
          </div>
        </div>
        <details className="v27-map-legend">
          <summary>Legende</summary>
          <div>{intakeMode ? <>
            <span><i />Farbband = Teilaufenthalt</span><span><i />Karte = Event am Behandlungstag</span><span>Vertikale Linie = Verlegung</span>
          </> : <>
            <span><i className="is-focus" />jetzt prüfen</span><span><i className="is-missing" />Nachweis fehlt</span><span><i className="is-checked" />geprüft</span><span><i />Kontext</span>
          </>}</div>
        </details>
      </figure>

      {!intakeMode && focusEvent && (onUploadEventDocument || onUploadCourseDocument) && (
        <div className="v27-upload-actions" aria-label="Dokument zur Prüfung hochladen">
          <span><small>Quelle zum nächsten Prüfschritt</small><strong>{focusEvent.label}</strong></span>
          {onUploadEventDocument && <label><FileUp aria-hidden="true" /><span><strong>Dokument zu diesem Event</strong><small>{formatDay(codingCase, focusEvent.day)} · {focusEvent.department}</small></span><input className="sr-only" type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={(event) => onUploadEventDocument(focusEvent.id, event.target.files)} /></label>}
          {onUploadCourseDocument && <label><NotebookText aria-hidden="true" /><span><strong>Verlaufsdokument</strong><small>Aufenthalt oder Teilaufenthalt</small></span><input className="sr-only" type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={(event) => onUploadCourseDocument(focusEvent.id, event.target.files)} /></label>}
        </div>
      )}
    </section>
  )
}

function V27LengthOfStayCorridor({ codingCase }: { codingCase: CodingCase }) {
  const currentRun = codingCase.grouperRuns.at(-1)
  const profile = currentRun?.lengthOfStay
  const lower = profile?.lowerFirstDiscountDay
  const mean = profile?.meanDays
  const upper = profile?.upperFirstSurchargeDay
  const catalogAvailable = Boolean(profile && mean && mean > 0)
  const maximum = Math.max(2, Math.ceil(codingCase.stayDays), Math.ceil(lower ?? 0), Math.ceil(mean ?? 0), Math.ceil(upper ?? 0))
  const position = (day?: number) => day === undefined ? undefined : Math.min(100, Math.max(0, ((day - 1) / Math.max(1, maximum - 1)) * 100))
  const lowerPosition = position(lower) ?? 0
  const meanPosition = position(mean)
  const upperPosition = position(upper) ?? 100
  const currentPosition = position(codingCase.stayDays) ?? 0
  const status = !catalogAvailable
    ? 'Katalogwerte fehlen'
    : lower !== undefined && codingCase.stayDays <= lower
      ? 'unterhalb uGVD'
      : upper !== undefined && codingCase.stayDays >= upper
        ? 'ab oGVD'
        : 'im DRG-Korridor'
  const outside = status === 'unterhalb uGVD' || status === 'ab oGVD'
  const formatValue = (value?: number) => value === undefined || value <= 0 ? '–' : `${value.toLocaleString('de-DE')} T.`

  return (
    <section className="v27-stay-corridor" aria-label={`Verweildauer ${codingCase.stayDays} Tage, untere Grenzverweildauer ${lower ?? 'nicht verfügbar'}, mittlere Verweildauer ${mean ?? 'nicht verfügbar'}, obere Grenzverweildauer ${upper ?? 'nicht verfügbar'}`}>
      <span className="v27-stay-title"><small>Verweildauer · {currentRun?.drg ?? 'DRG offen'}</small><strong>Aktueller Fall im DRG-Korridor</strong><em className={`v27-stay-status ${outside ? 'is-outside' : ''} ${!catalogAvailable ? 'is-missing' : ''}`}>{status}</em></span>
      <span className="v27-stay-track-wrap" aria-hidden="true">
        <span className="v27-stay-track">
          {lower !== undefined && <i className="v27-stay-zone is-lower" style={{ width: `${lowerPosition}%` }} />}
          <i className="v27-stay-zone is-normal" style={{ left: `${lowerPosition}%`, width: `${Math.max(0, upperPosition - lowerPosition)}%` }} />
          {upper !== undefined && <i className="v27-stay-zone is-upper" style={{ left: `${upperPosition}%` }} />}
          {lower !== undefined && <i className="v27-stay-marker" style={{ left: `${lowerPosition}%` }} />}
          {meanPosition !== undefined && <i className="v27-stay-marker is-mean" style={{ left: `${meanPosition}%` }} />}
          {upper !== undefined && <i className="v27-stay-marker" style={{ left: `${upperPosition}%` }} />}
          <b className="v27-stay-current" style={{ left: `${currentPosition}%` }} />
        </span>
        <span className="v27-stay-scale-labels"><span>Tag 1</span><span>Tag {maximum}</span></span>
      </span>
      <span className="v27-stay-values">
        <span className="is-current"><small>VWD aktuell</small><strong>{codingCase.stayDays} T.</strong></span>
        <span><small>uGVD</small><strong>{formatValue(lower)}</strong></span>
        <span><small>mVWD</small><strong>{formatValue(mean)}</strong></span>
        <span><small>oGVD</small><strong>{formatValue(upper)}</strong></span>
      </span>
    </section>
  )
}

function layoutTimelineEvents(events: TreatmentEvent[], stayDays: number, availableWidth: number) {
  const cardWidth = 148
  const pixelsPerDay = availableWidth / Math.max(1, stayDays)
  const requiredGap = Math.max(1, cardWidth / Math.max(1, pixelsPerDay))
  const latestDayByRow: number[] = []
  return events.map((event) => {
    let row = latestDayByRow.findIndex((lastDay) => event.day - lastDay >= requiredGap)
    if (row === -1) row = latestDayByRow.length
    latestDayByRow[row] = event.day
    return { event, row }
  })
}

function HypothesisCasePath({ codingCase, events, departments, documents, mode, onOpenEvent, onOpenDocument, onOpenDecision, onUploadEventDocument, onUploadCourseDocument }: {
  codingCase: CodingCase
  events: TreatmentEvent[]
  departments: DepartmentStay[]
  documents: DocumentMapItem[]
  mode: 'hypothesis' | 'intake'
  onOpenEvent?: (eventId: string) => void
  onOpenDocument?: (document: DocumentMapItem) => void
  onOpenDecision?: (decisionId: string) => void
  onUploadEventDocument?: (eventId: string, files: FileList | null) => void
  onUploadCourseDocument?: (eventId: string, files: FileList | null) => void
}) {
  const intakeMode = mode === 'intake'
  const currentRun = codingCase.grouperRuns.at(-1)
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const openDecision = codingCase.decisions.find((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status))
  const relevantDocuments = documents.filter((document) => document.kind !== 'vorkodierung')
  const focusDocument = intakeMode || !openDecision ? undefined : relevantDocuments.find((document) => document.linkedDecisionId === openDecision.id && document.priority === 'jetzt')
    ?? relevantDocuments.find((document) => document.linkedDecisionId === openDecision.id && getDocumentEvidenceStatus(document).bucket === 'relevant-action')
  const focusEvent = intakeMode || !openDecision ? undefined : events.find((event) => focusDocument && event.linkedDocumentIds?.includes(focusDocument.id))
    ?? events.find((event) => codingCase.codingEntries.some((entry) => entry.treatmentEventId === event.id && entry.reviewStatus !== 'belegt'))
    ?? events[0]
  const openRequired = codingCase.decisions.filter((decision) => decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length
  const relevantGaps = relevantDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action').length
  const openAlternatives = codingCase.decisions.filter((decision) => !decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length
  const unvalidatedCodes = activeEntries.filter((entry) => entry.reviewStatus !== 'belegt').length
  const stability = openRequired === 0 ? 'hoch' : openRequired === 1 ? 'mittel' : 'niedrig'
  const evidenceSafety = relevantGaps === 0 ? 'hoch' : relevantGaps === 1 ? 'mittel' : 'niedrig'
  const codingSafety = unvalidatedCodes === 0 ? 'hoch' : unvalidatedCodes <= 3 ? 'mittel' : 'niedrig'
  const focusTitle = openDecision?.title ?? focusDocument?.title ?? focusEvent?.label ?? 'Abschlussprüfung'
  const focusReason = openDecision?.effect ?? focusDocument?.resultImpact ?? 'Die verbleibende Belegkette gegen die aktuelle DRG-Hypothese prüfen.'
  const pathEvents = intakeMode ? events : events.filter((event) => {
    const linkedDocuments = documents.filter((document) => event.linkedDocumentIds?.includes(document.id))
    const linkedCodes = activeEntries.filter((entry) => entry.treatmentEventId === event.id)
    return linkedDocuments.length > 0 || linkedCodes.length > 0 || ['Eingriff', 'Therapie', 'Intensiv'].includes(event.type)
  })
  const leadingStay = departments.reduce<DepartmentStay | undefined>((longest, stay) => !longest || duration(stay) > duration(longest) ? stay : longest, undefined)
  const deferredDocuments = relevantDocuments.filter((document) => getDocumentEvidenceStatus(document).bucket === 'nonrelevant-missing').length
  const firstMissingEventIds = new Set<string>()
  const seenMissingDocumentIds = new Set<string>()
  pathEvents.forEach((event) => {
    event.linkedDocumentIds?.forEach((documentId) => {
      const document = documents.find((candidate) => candidate.id === documentId)
      if (!document) return
      if (getDocumentEvidenceStatus(document).bucket === 'relevant-action' && document.availability === 'fehlend') {
        if (!seenMissingDocumentIds.has(documentId)) firstMissingEventIds.add(event.id)
        seenMissingDocumentIds.add(documentId)
      }
    })
  })
  const stayProfile = currentRun?.lengthOfStay
  const upperStay = stayProfile?.upperFirstSurchargeDay
  const stayScale = Math.max(codingCase.stayDays, stayProfile?.meanDays ?? 0, upperStay ?? 0, 2)
  const stayPosition = Math.min(100, Math.max(0, ((codingCase.stayDays - 1) / (stayScale - 1)) * 100))

  const openFocus = () => {
    if (openDecision && onOpenDecision) onOpenDecision(openDecision.id)
    else if (focusDocument && onOpenDocument) onOpenDocument(focusDocument)
    else if (focusEvent) onOpenEvent?.(focusEvent.id)
  }

  return (
    <section className="quiet-case-map" aria-label="Gemeinsame Fallkarte">
      <header className={`case-map-summary ${intakeMode ? 'is-intake' : 'is-hypothesis'}`}>
        {intakeMode ? <>
          <span className="case-map-drg case-map-basis"><small>Fallbasis · automatisch zusammengeführt</small><strong>{events.length} zentrale Behandlungsereignisse</strong><em>Bitte nur Zeitfolge, Fachabteilung und Behandlung prüfen</em></span>
          <span className="case-map-safety safety-intake"><small>Prüfstatus</small><strong>noch offen</strong><em>{events.length} erkannte Ereignisse</em></span>
          <span className="case-map-stay case-map-basis-stay" aria-label={`Aufenthalt ${codingCase.stayDays} Tage`}>
            <span><small>Aufenthalt</small><strong>{codingCase.stayDays} Tage</strong></span>
            <i><b style={{ left: '100%' }} /></i>
            <em>{formatDay(codingCase, 1)}–{formatDay(codingCase, codingCase.stayDays)}</em>
          </span>
        </> : <>
          <span className="case-map-drg"><small>DRG-Hypothese · Iteration {currentRun?.iteration ?? 1}</small><strong>{currentRun?.drg ?? '–'}</strong><em>{codingCase.currentMainDiagnosis}</em></span>
          <span className={`case-map-signal safety-${stability}`}><small>DRG-Stabilität</small><strong>{stability}</strong><em>{openAlternatives} Pfad{openAlternatives === 1 ? '' : 'e'} offen</em></span>
          <span className={`case-map-signal safety-${evidenceSafety}`}><small>Belegsicherheit</small><strong>{evidenceSafety}</strong><em>{relevantGaps} relevante Lücke{relevantGaps === 1 ? '' : 'n'}</em></span>
          <span className={`case-map-signal safety-${codingSafety}`}><small>Kodiersicherheit</small><strong>{codingSafety}</strong><em>{unvalidatedCodes} Kode{unvalidatedCodes === 1 ? '' : 's'} offen</em></span>
          <span className="case-map-stay" aria-label={`Verweildauer ${codingCase.stayDays} Tage, mittlere Verweildauer ${stayProfile?.meanDays ?? 'nicht ausgewiesen'}, obere Grenzverweildauer ${upperStay ?? 'nicht ausgewiesen'}`}>
            <span><small>Verweildauer</small><strong>{codingCase.stayDays} Tage</strong></span>
            <i><b style={{ left: `${stayPosition}%` }} /></i>
            <em>MVD {stayProfile?.meanDays ?? '–'} · OGV {upperStay ?? '–'}</em>
          </span>
        </>}
      </header>

      {intakeMode ? (
        <div className="case-map-intake-guidance">
          <span><ShieldCheck aria-hidden="true" /></span>
          <span><small>Vor der DRG-Hypothese</small><strong>Passen Fachabteilungen, Zeitfolge und zentrale Behandlungen?</strong><em>Bestätige hier nur die gemeinsame Fallbasis. Kodierentscheidungen folgen danach.</em></span>
        </div>
      ) : (
        <>
          <button className="case-map-next-action" type="button" onClick={openFocus} disabled={!openDecision && !focusEvent && !focusDocument}>
            <span className="case-map-next-number">1</span>
            <span><small>Nächster belastbarer Schritt</small><strong>{focusTitle}</strong><em>{focusReason}</em></span>
            <span>Prüfen <ArrowRight aria-hidden="true" /></span>
          </button>
          <div className="case-map-priority-rail" aria-label="Reihenfolge der offenen Prüfungen">
            <span className="current"><small>Jetzt klären</small><strong>{openDecision || focusDocument || focusEvent ? 1 : 0}</strong></span>
            <span><small>Danach</small><strong>{Math.max(0, openRequired - (openDecision ? 1 : 0))}</strong></span>
            <span><small>Nur wenn</small><strong>{codingCase.decisions.filter((decision) => !decision.required && !['belegt', 'ausgeschlossen'].includes(decision.status)).length}</strong></span>
            <span><small>Nachgeordnet</small><strong>{deferredDocuments}</strong></span>
          </div>
        </>
      )}

      <figure className="case-map-figure">
        <figcaption><span><strong>{intakeMode ? 'Behandlungsereignisse' : 'Dokumente und Kodes am Behandlungsverlauf'}</strong><small>{intakeMode ? 'Nur Events prüfen · Dokumente und Kodes folgen im nächsten Schritt' : 'Gleiche Fallkarte · pro Event nur Status und Anzahl, Details nach Klick'}</small></span><span>{formatDay(codingCase, 1)}–{formatDay(codingCase, codingCase.stayDays)}</span></figcaption>
        <div className="case-map-departments" aria-label="Fachabteilungen im Verlauf">
          {departments.map((stay) => <span className={`${stay.intensive ? 'is-intensive' : ''} ${stay === leadingStay ? 'is-leading' : ''}`} style={{ width: `${(duration(stay) / codingCase.stayDays) * 100}%` }} key={`${stay.department}-${stay.start}`}><strong>{stay.department}</strong><small>{duration(stay)} Tag{duration(stay) === 1 ? '' : 'e'}</small></span>)}
        </div>
        <div className="case-map-event-scroll">
          <div className="case-map-event-track" style={{ gridTemplateColumns: `repeat(${pathEvents.length}, minmax(112px, 1fr))` }}>
            {pathEvents.map((event) => {
              const linkedDocuments = intakeMode ? [] : documents.filter((document) => event.linkedDocumentIds?.includes(document.id) && document.kind !== 'vorkodierung')
              const linkedCodes = intakeMode ? [] : activeEntries.filter((entry) => entry.treatmentEventId === event.id || linkedDocuments.some((document) => document.id === entry.evidenceDocumentId))
              const primaryDocument = linkedDocuments.find((document) => document.priority === 'jetzt') ?? linkedDocuments[0]
              const isFocus = !intakeMode && event.id === focusEvent?.id
              const hasMissingRelevant = firstMissingEventIds.has(event.id)
              const hasCheckedRelevant = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-checked')
              const hasOpenRelevant = linkedDocuments.some((document) => getDocumentEvidenceStatus(document).bucket === 'relevant-action')
              const state = isFocus ? 'focus' : hasMissingRelevant ? 'missing' : hasCheckedRelevant ? 'checked' : 'context'
              const statusLabel = isFocus ? 'jetzt prüfen' : hasMissingRelevant ? 'Nachweis fehlt' : hasCheckedRelevant ? 'geprüft' : hasOpenRelevant ? 'gleicher Nachweis' : 'Kontext'
              const kindLabel = primaryDocument?.kind === 'verlaufsbericht' ? 'Verlauf' : primaryDocument?.kind === 'ereignisbericht' ? 'Bericht' : primaryDocument?.kind === 'nachweis' ? 'Nachweis' : 'Arztbrief'
              const groupingCodes = linkedCodes.filter((entry) => (entry.groupingImpact ?? 'potenziell') !== 'ohne-änderung')
              const groupingRelevant = groupingCodes.length > 0 || linkedDocuments.some((document) => [document.outcomeDimensions.drg, document.outcomeDimensions.ops, document.outcomeDimensions.entgelte].includes('relevant'))
              const icdCount = linkedCodes.filter((entry) => entry.type === 'HD' || entry.type === 'ND').length
              const opsCount = linkedCodes.filter((entry) => entry.type === 'OPS').length
              const label = intakeMode
                ? `${formatDay(codingCase, event.day)}, ${event.department}, ${event.type}: ${event.label}. Behandlungsereignis der Fallbasis.`
                : `${formatDay(codingCase, event.day)}, ${event.department}, ${event.label}. ${primaryDocument ? `${primaryDocument.title}: ${statusLabel}` : 'Kein Dokument verknüpft'}. ${icdCount} ICD, ${opsCount} OPS. ${groupingRelevant ? 'Mögliche Grouperwirkung.' : 'Derzeit keine Grouperwirkung.'}`
              const content = <>
                  <span className="case-map-event-meta">{formatDay(codingCase, event.day)}<em>{event.department}</em></span>
                  <span className="case-map-event-node"><EventIcon event={event} /></span>
                  <strong>{event.label}</strong>
                  {intakeMode ? <span className="case-map-event-kind">{event.type}</span> : <>
                    <span className="case-map-document-state">
                      {state === 'checked' ? <FileCheck2 aria-hidden="true" /> : state === 'missing' ? <ShieldAlert aria-hidden="true" /> : state === 'focus' ? <FileQuestion aria-hidden="true" /> : <NotebookText aria-hidden="true" />}
                      <span>{primaryDocument ? `${kindLabel} · ${statusLabel}` : 'kein Dokument'}</span>{linkedDocuments.length > 1 && <b>+{linkedDocuments.length - 1}</b>}
                    </span>
                    <span className={`case-map-code-state ${groupingRelevant ? 'is-grouping' : ''}`}><FileCode2 aria-hidden="true" /> {icdCount} ICD · {opsCount} OPS{groupingRelevant && <b aria-label="mögliche Grouperwirkung">◆</b>}</span>
                  </>}
                </>
              return onOpenEvent ? (
                <button className={`case-map-event state-${state} ${intakeMode ? 'is-intake' : ''}`} type="button" key={event.id} aria-label={label} title={primaryDocument?.title} onClick={() => onOpenEvent(event.id)}>{content}</button>
              ) : <div className={`case-map-event state-${state} is-static ${intakeMode ? 'is-intake' : ''}`} key={event.id} aria-label={label} title={primaryDocument?.title}>{content}</div>
            })}
          </div>
        </div>
        <details className="case-map-legend-toggle" open={intakeMode}>
          <summary>Legende <ChevronDown aria-hidden="true" /></summary>
          <div className="case-map-legend" aria-label="Legende">
            {intakeMode ? <>
              <span><i><Building2 aria-hidden="true" /></i> Band = Fachabteilung</span>
              <span><i><ScanLine aria-hidden="true" /></i> Symbol = Ereignisart</span>
              <span><i>→</i> Zeitfolge von links nach rechts</span>
            </> : <>
              <span className="state-checked"><i>✓</i> geprüft</span>
              <span className="state-focus"><i>?</i> jetzt prüfen</span>
              <span className="state-missing"><i>!</i> relevanter Nachweis fehlt</span>
              <span className="state-context"><i>○</i> Kontext</span>
              <span><i>◆</i> mögliche Grouperwirkung</span>
            </>}
          </div>
        </details>
      </figure>

      {!intakeMode && focusEvent && (onUploadEventDocument || onUploadCourseDocument) && (
        <div className="case-map-upload-actions" aria-label="Dokument zur Prüfung hochladen">
          <div><small>Dokument fehlt oder soll nachvalidiert werden?</small><strong>Direkt dem richtigen Kontext zuordnen</strong><span>Nach dem Upload folgen Kodeprüfung und neue Grouper-Iteration.</span></div>
          {onUploadEventDocument && <label className="case-map-upload-action">
            <FileUp aria-hidden="true" /><span><strong>Dokument zu diesem Event</strong><small>{focusEvent.label} · {formatDay(codingCase, focusEvent.day)}</small></span>
            <input className="sr-only" type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={(event) => onUploadEventDocument(focusEvent.id, event.target.files)} />
          </label>}
          {onUploadCourseDocument && <label className="case-map-upload-action">
            <NotebookText aria-hidden="true" /><span><strong>Verlaufsdokument</strong><small>{focusEvent.department} · Aufenthalt oder Teilaufenthalt</small></span>
            <input className="sr-only" type="file" accept=".pdf,.txt,.doc,.docx,image/*" onChange={(event) => onUploadCourseDocument(focusEvent.id, event.target.files)} />
          </label>}
        </div>
      )}

      <footer className="case-map-footer">
        {intakeMode ? <details><summary>Was wird hier bestätigt?</summary><p>Nur die zeitliche Fallbasis aus Aufnahme, Fachabteilungen und Behandlungsereignissen. Dokumente, Kodes und die DRG- und Entgelthypothese werden erst danach bewertet.</p></details> : <details><summary>Warum dieser Schritt?</summary><p>Vorgesehen ist die Ableitung aus Vorkodierung, DKR, ICD-10-GM, OPS, Grouperpfad sowie Haus- und Vergleichsfällen. Im Prototyp sind diese Signale simuliert.</p></details>}
        <span>{intakeMode ? 'Dokument- und Kodeebene bewusst ausgeblendet' : deferredDocuments ? `${deferredDocuments} derzeit nicht benötigte${deferredDocuments === 1 ? 's' : ''} fehlende${deferredDocuments === 1 ? 's' : ''} Dokument${deferredDocuments === 1 ? '' : 'e'} ausgeblendet` : 'Keine derzeit irrelevanten Dokumentlücken'}</span>
      </footer>
    </section>
  )
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
  if (event.type === 'Diagnostik' && /(CT|Röntgen|Bildgebung|Restaging|Kontrolle)/i.test(event.label)) return <ScanLine aria-hidden="true" />
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

  transitions.forEach((event) => {
    const transitionDay = Math.min(stayDays, Math.max(1, event.day))
    const effectiveStart = Math.max(currentStart, transitionDay)
    if (effectiveStart > currentStart) stays.push({ department: currentDepartment, start: currentStart, end: effectiveStart - 1, intensive: currentDepartment === 'Intensivmedizin' })
    if (event.type === 'Intensiv') {
      const intensiveEnd = Math.min(stayDays, Math.max(effectiveStart, event.endDay ?? effectiveStart))
      stays.push({ department: event.department, start: effectiveStart, end: intensiveEnd, intensive: true })
      currentStart = intensiveEnd + 1
    } else {
      currentDepartment = event.department
      currentStart = effectiveStart
    }
  })

  if (currentStart <= stayDays) stays.push({ department: currentDepartment, start: currentStart, end: stayDays, intensive: currentDepartment === 'Intensivmedizin' })
  return stays.filter((stay) => stay.end >= stay.start).reduce<DepartmentStay[]>((merged, stay) => {
    const previous = merged.at(-1)
    if (previous && previous.department === stay.department && previous.intensive === stay.intensive && previous.end + 1 === stay.start) {
      previous.end = stay.end
      return merged
    }
    return [...merged, { ...stay }]
  }, [])
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
