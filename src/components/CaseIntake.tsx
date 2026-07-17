import { ArrowLeft, ArrowRight, Check, FileImage, FileText, GitMerge, ListPlus, ShieldCheck, Upload } from 'lucide-react'
import { useState } from 'react'
import type { CodingCase, HospitalProfile, IntakeSource, TreatmentEvent } from '../types'
import { TreatmentRibbon } from './TreatmentRibbon'

interface CaseIntakeProps {
  codingCase: CodingCase
  hospitals: HospitalProfile[]
  onBack: () => void
  onAddSource: (source: IntakeSource) => void
  onAddEvent: (event: TreatmentEvent) => void
  onConfirm: () => void
}

export function CaseIntake({ codingCase, hospitals, onBack, onAddSource, onAddEvent, onConfirm }: CaseIntakeProps) {
  const [manualOpen, setManualOpen] = useState(false)
  const [department, setDepartment] = useState('Pneumologie')
  const [day, setDay] = useState(Math.min(2, codingCase.stayDays))
  const [eventType, setEventType] = useState<TreatmentEvent['type']>('Diagnostik')
  const hospital = hospitals.find((item) => item.id === codingCase.hospitalId)
  const profile = hospital?.profiles.find((item) => item.siteId === codingCase.siteId && item.year === codingCase.year)

  const handleFile = (files: FileList | null, kind: 'screenshot' | 'arztbrief') => {
    const file = files?.[0]
    if (!file) return
    onAddSource({
      id: `source-${kind}-${Date.now()}`,
      kind,
      label: file.name,
      status: 'erkannt',
      detail: kind === 'screenshot' ? 'Vorkodierung und Stationsfolge wurden als Vorschlag erkannt.' : 'Überschriften wurden als Verlaufsvorschlag erkannt.',
      addedAt: new Date().toISOString(),
    })
  }

  const addManualEvent = () => {
    onAddEvent({ id: `event-manual-${Date.now()}`, day, department, type: eventType, label: `${eventType} · manuell ergänzt`, linkedDocumentIds: [] })
    onAddSource({ id: `source-manual-${Date.now()}`, kind: 'manuell', label: `${eventType} an Tag ${day}`, status: 'bestätigt', detail: `Von der Kodierfachkraft für ${department} ergänzt.`, addedAt: new Date().toISOString() })
    setManualOpen(false)
  }

  return (
    <div className="page intake-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Zurück zum Fallpool</button>
      <div className="intake-heading"><div><div className="page-kicker">Fallbasis · {codingCase.caseNumber}</div><h1>Stimmt der Behandlungsverlauf?</h1><p className="lead">Das Tool führt alle Quellen in einem Verlauf zusammen. Bestätige nur die Fallbasis, bevor die DRG-Hypothese startet.</p></div><span className="status-pill status-wahrscheinlich">Noch nicht bestätigt</span></div>

      <section className="intake-case-strip" aria-label="Importierte Basisdaten">
        <div><span>Haus</span><strong>{hospital?.name} · {profile?.siteName}</strong></div>
        <div><span>Zeitraum</span><strong>{codingCase.admissionDate && codingCase.dischargeDate ? `${formatDate(codingCase.admissionDate)}–${formatDate(codingCase.dischargeDate)}` : `${codingCase.stayDays} Tage`}</strong></div>
        <div><span>Versorgung</span><strong>{codingCase.careForm}</strong></div>
        <div><span>Vorkodierung</span><strong>{codingCase.currentMainDiagnosis.split('·')[0]}</strong></div>
      </section>

      <section className="intake-ribbon-section" aria-label="Gemeinsame Fallkarte vor Bestätigung">
        <TreatmentRibbon codingCase={codingCase} compact mode="intake" />
      </section>

      <div className="intake-grid">
        <section className="intake-sources" aria-labelledby="intake-sources-title">
          <div className="section-title-row"><div><div className="page-kicker">Herkunft statt Sicherheitsscore</div><h2 id="intake-sources-title">Verwendete Quellen</h2></div></div>
          <div className="source-provenance-list">
            {codingCase.intakeSources.map((source) => (
              <div key={source.id}><span className={`source-kind source-${source.kind}`}>{source.kind === 'batch' ? <GitMerge aria-hidden="true" /> : source.kind === 'screenshot' ? <FileImage aria-hidden="true" /> : source.kind === 'arztbrief' ? <FileText aria-hidden="true" /> : <ListPlus aria-hidden="true" />}</span><span><strong>{source.label}</strong><small>{source.detail}</small></span><span className={`status-pill status-${source.status === 'bestätigt' ? 'belegt' : source.status === 'widersprüchlich' ? 'widersprüchlich' : 'wahrscheinlich'}`}>{source.status}</span></div>
            ))}
          </div>
        </section>

        <section className="intake-add-source" aria-labelledby="intake-add-title">
          <div className="section-title-row"><div><div className="page-kicker">Nur wenn etwas fehlt</div><h2 id="intake-add-title">Verlauf ergänzen</h2></div></div>
          <div className="intake-source-actions">
            <label className="source-action"><FileImage aria-hidden="true" /><span><strong>Screenshot verwenden</strong><small>Vorkodierung oder Stationsverlauf</small></span><Upload aria-hidden="true" /><input className="sr-only" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files, 'screenshot')} /></label>
            <label className="source-action"><FileText aria-hidden="true" /><span><strong>Arztbrief verwenden</strong><small>Verlauf aus Überschriften ergänzen</small></span><Upload aria-hidden="true" /><input className="sr-only" type="file" accept=".pdf,.txt" onChange={(event) => handleFile(event.target.files, 'arztbrief')} /></label>
            <button className="source-action" type="button" onClick={() => setManualOpen((value) => !value)}><ListPlus aria-hidden="true" /><span><strong>Manuell ergänzen</strong><small>Ereignis oder Fachabteilung auswählen</small></span><ArrowRight aria-hidden="true" /></button>
          </div>
          {manualOpen && <div className="manual-event-form"><div className="form-grid"><label>Tag<input type="number" min="1" max={codingCase.stayDays} value={day} onChange={(event) => setDay(Number(event.target.value))} /></label><label>Fachabteilung<select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Pneumologie</option><option>Intensivmedizin</option><option>Onkologie</option><option>Chirurgie</option><option>Kardiologie</option></select></label><label>Ereignis<select value={eventType} onChange={(event) => setEventType(event.target.value as TreatmentEvent['type'])}><option>Diagnostik</option><option>Eingriff</option><option>Therapie</option><option>Verlegung</option><option>Intensiv</option></select></label></div><button className="button secondary" type="button" onClick={addManualEvent}><Check aria-hidden="true" /> Ergänzung übernehmen</button></div>}
        </section>
      </div>

      {codingCase.technicalValues.length > 0 && <div className="intake-technical-note"><ShieldCheck aria-hidden="true" /><span><strong>{codingCase.technicalValues.length} technische Leistungen wurden separat übernommen.</strong><small>Sie erscheinen später bei den Grouper-Eingaben. Dafür wird nicht automatisch ein Dokument verlangt.</small></span></div>}

      <section className="intake-confirm"><div><Check aria-hidden="true" /><span><strong>Aufnahme, Entlassung und Behandlungskette geprüft?</strong><small>Einzelne Details können später ergänzt werden. Die Fallbasis bleibt nachvollziehbar versioniert.</small></span></div><button className="button primary" type="button" onClick={onConfirm}>Fallbasis bestätigen <ArrowRight aria-hidden="true" /></button></section>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
