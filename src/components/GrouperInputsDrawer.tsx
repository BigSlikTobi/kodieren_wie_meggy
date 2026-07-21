import { Activity, CalendarDays, ClipboardList, FileCode2, Hospital, Scale, Timer, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { CodingCase, CodingEntry } from '../types'

interface GrouperInputsDrawerProps {
  codingCase: CodingCase
  onClose: () => void
}

type GrouperInputView = 'case' | 'diagnoses' | 'procedures'

export function GrouperInputsDrawer({ codingCase, onClose }: GrouperInputsDrawerProps) {
  const [view, setView] = useState<GrouperInputView>('case')
  const currentRun = codingCase.grouperRuns.at(-1)!
  const diagnoses = codingCase.codingEntries.filter((entry) => entry.active && (entry.type === 'HD' || entry.type === 'ND'))
  const procedures = codingCase.codingEntries.filter((entry) => entry.active && entry.type === 'OPS')
  const ventilationHours = codingCase.technicalValues
    .filter((value) => value.kind === 'beatmung' && value.unit === 'Stunden')
    .reduce((sum, value) => sum + (value.aggregateValue ?? 0), 0)
  const departments = departmentPath(codingCase)

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer grouper-inputs-drawer" role="dialog" aria-modal="true" aria-labelledby="grouper-inputs-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Sekundäre Fallinformation · Iteration {currentRun.iteration}</div><h2 id="grouper-inputs-title">Grouper-Eingaben</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="grouper-result-strip" aria-label="Aktuelles Groupingergebnis">
          <span><small>DRG</small><strong>{currentRun.drg}</strong></span>
          <span><small>MDC</small><strong>{currentRun.mdc ?? 'offen'}</strong></span>
          <span><small>Partition</small><strong>{currentRun.partition ?? 'offen'}</strong></span>
          <span><small>PCCL</small><strong>{currentRun.pccL}</strong></span>
          <span><small>Verweildauer</small><strong>{codingCase.stayDays} Tage</strong></span>
        </div>

        <div className="grouper-los-strip" aria-label="Verweildauergrenzen der Arbeits-DRG">
          <span><small>uGVD</small><strong>{currentRun.lengthOfStay.lowerFirstDiscountDay ?? '–'}</strong></span>
          <span><small>mVWD</small><strong>{currentRun.lengthOfStay.meanDays}</strong></span>
          <span><small>aktuell</small><strong>{codingCase.stayDays}</strong></span>
          <span><small>oGVD</small><strong>{currentRun.lengthOfStay.upperFirstSurchargeDay ?? '–'}</strong></span>
        </div>

        <div className="grouper-input-tabs" role="tablist" aria-label="Grouper-Eingaben nach Bereich">
          <GrouperTab active={view === 'case'} label="Falldaten" count={8} onClick={() => setView('case')} />
          <GrouperTab active={view === 'diagnoses'} label="Diagnosen" count={diagnoses.length} onClick={() => setView('diagnoses')} />
          <GrouperTab active={view === 'procedures'} label="Prozeduren" count={procedures.length} onClick={() => setView('procedures')} />
        </div>

        {view === 'case' && (
          <section className="grouper-input-panel" role="tabpanel" aria-label="Falldaten">
            <div className="grouper-field-grid">
              <GrouperField icon={<ClipboardList aria-hidden="true" />} label="Aufnahmegrund" value={codingCase.grouperAdministrativeData.admissionReasonCode} detail={codingCase.grouperAdministrativeData.admissionReasonLabel} />
              <GrouperField icon={<ClipboardList aria-hidden="true" />} label="Entlassungsgrund" value={codingCase.grouperAdministrativeData.dischargeReasonCode} detail={codingCase.grouperAdministrativeData.dischargeReasonLabel} />
              <GrouperField icon={<UserRound aria-hidden="true" />} label="Alter bei Aufnahme" value={`${codingCase.age} Jahre`} detail="Aus administrativen Falldaten" />
              <GrouperField icon={<Scale aria-hidden="true" />} label="Aufnahmegewicht" value={codingCase.grouperAdministrativeData.admissionWeightGrams ? `${codingCase.grouperAdministrativeData.admissionWeightGrams.toLocaleString('de-DE')} g` : 'Nicht geliefert'} detail={codingCase.grouperAdministrativeData.admissionWeightGrams ? 'Strukturierter Grouper-Wert' : 'Im aktuellen Fall ohne Wert'} muted={!codingCase.grouperAdministrativeData.admissionWeightGrams} />
              <GrouperField icon={<Timer aria-hidden="true" />} label="Beatmungszeit" value={`${ventilationHours} Stunden`} detail={ventilationHours ? 'Aus strukturierten Intervallen summiert' : 'Keine Beatmungszeit geliefert'} />
              <GrouperField icon={<CalendarDays aria-hidden="true" />} label="Aufenthalt" value={`${formatDate(codingCase.admissionDate)}–${formatDate(codingCase.dischargeDate)}`} detail={`${codingCase.stayDays} Tage · uGVD ${currentRun.lengthOfStay.lowerFirstDiscountDay ?? '–'} · mVWD ${currentRun.lengthOfStay.meanDays} · oGVD ${currentRun.lengthOfStay.upperFirstSurchargeDay ?? '–'}`} />
              <GrouperField icon={<Hospital aria-hidden="true" />} label="Fachabteilungen" value={departments.join(' → ')} detail={codingCase.careForm} />
              <GrouperField icon={<Activity aria-hidden="true" />} label="Versorgungsart" value={currentRun.lengthOfStay.careSetting} detail={`Regelpaket ${codingCase.year}`} />
            </div>

            <section className="grouper-technical-section" aria-labelledby="grouper-technical-title">
              <div><span>Weitere strukturierte Werte</span><h3 id="grouper-technical-title">Technische Grouper-Eingaben</h3></div>
              {codingCase.technicalValues.length ? codingCase.technicalValues.map((value) => (
                <div className="grouper-technical-row" key={value.id}>
                  <span><strong>{value.code ?? value.label}</strong><small>{value.label} · {value.source}</small></span>
                  <b>{value.aggregateValue ?? '–'} {value.unit ?? ''}</b>
                  <span className={`status-pill status-${['bestätigt', 'korrigiert'].includes(value.status) ? 'belegt' : 'wahrscheinlich'}`}>{value.status}</span>
                </div>
              )) : <p>Keine weiteren technischen Grouper-Werte geliefert.</p>}
            </section>
          </section>
        )}

        {view === 'diagnoses' && (
          <section className="grouper-input-panel" role="tabpanel" aria-label="Diagnosen">
            <div className="grouper-code-heading"><span><FileCode2 aria-hidden="true" /><strong>ICD-Haupt- und Nebendiagnosen</strong></span><small>{diagnoses.length} aktive Diagnosen · vollständig scrollbar</small></div>
            <div className="grouper-code-table">
              {diagnoses.map((entry) => <GrouperCodeRow key={entry.id} entry={entry} codingCase={codingCase} />)}
            </div>
          </section>
        )}

        {view === 'procedures' && (
          <section className="grouper-input-panel" role="tabpanel" aria-label="Prozeduren">
            <div className="grouper-code-heading"><span><FileCode2 aria-hidden="true" /><strong>OPS mit Leistungszeitpunkt</strong></span><small>{procedures.length} aktive Prozeduren · Datum und Uhrzeit aus Eventbezug</small></div>
            <div className="grouper-code-table">
              {procedures.map((entry) => <GrouperCodeRow key={entry.id} entry={entry} codingCase={codingCase} />)}
            </div>
          </section>
        )}

      </aside>
    </div>
  )
}

function GrouperTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button className={active ? 'active' : ''} role="tab" aria-selected={active} type="button" onClick={onClick}><strong>{label}</strong><span>{count}</span></button>
}

function GrouperField({ icon, label, value, detail, muted = false }: { icon: ReactNode; label: string; value: string; detail: string; muted?: boolean }) {
  return <div className={`grouper-field ${muted ? 'is-muted' : ''}`}><span>{icon}</span><span><small>{label}</small><strong>{value}</strong><em>{detail}</em></span></div>
}

function GrouperCodeRow({ entry, codingCase }: { entry: CodingEntry; codingCase: CodingCase }) {
  const event = codingCase.timeline.find((item) => item.id === entry.treatmentEventId)
  const date = entry.serviceDate ? formatDate(entry.serviceDate) : 'Datum offen'
  const time = entry.serviceTime ?? event?.time
  const timeLabel = time ? ` · ${time}` : ''
  return (
    <div className="grouper-code-row">
      <span className="coding-type-badge">{entry.type}</span>
      <code>{entry.code}</code>
      <span><strong>{entry.description}</strong><small>{entry.type === 'OPS' ? `${date}${timeLabel} · ${entry.department ?? event?.department ?? 'Fachabteilung offen'}${entry.quantity ? ` · Menge ${entry.quantity}` : ''}` : `${entry.department ?? 'Gesamtfall'} · ${groupingImpactLabel(entry)}${entry.laterality && entry.laterality !== 'keine' ? ` · ${entry.laterality}` : ''}`}</small><em>Quelle: {entry.source}</em></span>
      <span className={`status-pill status-${entry.reviewStatus === 'belegt' ? 'belegt' : entry.reviewStatus === 'widersprüchlich' ? 'widersprüchlich' : 'wahrscheinlich'}`}>{entry.reviewStatus}</span>
    </div>
  )
}

function departmentPath(codingCase: CodingCase) {
  const candidates = [...codingCase.timeline]
    .sort((a, b) => a.day - b.day)
    .filter((event, index, events) => event.type === 'Aufnahme' || event.type === 'Verlegung' || event.type === 'Intensiv' || index === events.length - 1)
    .map((event) => event.department)
  return candidates.filter((department, index) => department !== candidates[index - 1])
}

function groupingImpactLabel(entry: CodingEntry) {
  return {
    pfadbestimmend: 'pfadbestimmend',
    'split-relevant': 'split-relevant',
    potenziell: 'potenziell gruppierungsrelevant',
    'ohne-änderung': 'aktuell ohne DRG-Änderung',
  }[entry.groupingImpact ?? 'potenziell']
}

function formatDate(value?: string) {
  if (!value) return 'nicht geliefert'
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
