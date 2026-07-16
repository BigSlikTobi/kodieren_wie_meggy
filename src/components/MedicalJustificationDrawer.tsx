import { useState } from 'react'
import { Check, Clipboard, FileCheck2, Info, Monitor, ShieldCheck, X } from 'lucide-react'
import type { CodingCase, KisGuide, MbegStatus } from '../types'

interface MedicalJustificationDrawerProps {
  codingCase: CodingCase
  kisGuides: KisGuide[]
  onClose: () => void
  onReview: () => void
}

const statusLabels: Record<MbegStatus, string> = {
  'entwurf-belegbar': 'Entwurf belegbar',
  'nachweis-fehlt': 'Nachweis fehlt',
  fachprüfung: 'Fachliche Prüfung nötig',
  'kein-bedarf': 'Kein Begründungsbedarf erkannt',
  'nicht-belastbar': 'Nicht belastbar erstellbar',
}

export function MedicalJustificationDrawer({ codingCase, kisGuides, onClose, onReview }: MedicalJustificationDrawerProps) {
  const [copied, setCopied] = useState(false)
  const mbeg = codingCase.medicalJustification
  const evidence = mbeg.evidenceDocumentIds
    .map((id) => codingCase.documentMap.find((document) => document.id === id))
    .filter(Boolean)
  const medicationGuide = kisGuides.find((guide) => `${guide.id} ${guide.documentKind}`.toLowerCase().includes('medikation'))

  const copyDraft = async () => {
    await navigator.clipboard?.writeText(mbeg.draft)
    setCopied(true)
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer mbeg-drawer" role="dialog" aria-modal="true" aria-labelledby="mbeg-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Optionaler Abschlussbaustein</div><h2 id="mbeg-drawer-title">Medizinische Begründung</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="mbeg-status-row">
          <span className={`status-pill ${mbeg.reviewed ? 'status-belegt' : mbeg.status === 'entwurf-belegbar' ? 'status-wahrscheinlich' : 'status-ungeklärt'}`}>{mbeg.reviewed ? 'Fachlich geprüft' : statusLabels[mbeg.status]}</span>
          <span>Keine automatische Übermittlung</span>
        </div>

        <div className="mbeg-boundary"><ShieldCheck aria-hidden="true" /><span><strong>Nur belegte Aussagen</strong><small>Das Tool formuliert einen Entwurf. Eine Kodierfachkraft prüft ihn vor der Weiterleitung an die Krankenkasse.</small></span></div>

        <section className="mbeg-section" aria-labelledby="mbeg-basis-title">
          <h3 id="mbeg-basis-title">Begründungsbasis</h3>
          <ul className="mbeg-category-list">{mbeg.categories.map((category) => <li key={category}><Check aria-hidden="true" />{category}</li>)}</ul>
        </section>

        <section className="mbeg-section" aria-labelledby="mbeg-evidence-title">
          <h3 id="mbeg-evidence-title">Verknüpfte Belege</h3>
          <ul className="mbeg-evidence-list">
            {evidence.map((document) => document && <li key={document.id}><FileCheck2 aria-hidden="true" /><span><strong>{document.title}</strong><small>{document.department} · {document.reviewLevel === 'validiert' ? 'validiert' : 'vorläufig geprüft'}</small></span></li>)}
          </ul>
        </section>

        {mbeg.missingEvidence.length > 0 && (
          <section className="mbeg-section mbeg-missing" aria-labelledby="mbeg-missing-title">
            <h3 id="mbeg-missing-title">Noch nicht im Entwurf verwendet</h3>
            {mbeg.missingEvidence.map((item) => <div key={item}><Info aria-hidden="true" /><span><strong>{item}</strong><small>Der Entwurf bleibt ohne diese Aussage nutzbar. Für mehr Spezifität nachfordern.</small></span></div>)}
            {medicationGuide && <details className="mbeg-kis-help"><summary><Monitor aria-hidden="true" /> Fundort im KIS anzeigen</summary><p><strong>{medicationGuide.module}:</strong> {medicationGuide.navigationPath.join(' → ')}</p><p>{medicationGuide.instruction}</p></details>}
          </section>
        )}

        <section className="mbeg-draft" aria-labelledby="mbeg-draft-title">
          <div className="section-title-row"><div><div className="page-kicker">Entwurf</div><h3 id="mbeg-draft-title">Vollstationäre Erforderlichkeit</h3></div><button className="button secondary" type="button" onClick={() => void copyDraft()}><Clipboard aria-hidden="true" /> {copied ? 'Kopiert' : 'Text kopieren'}</button></div>
          <blockquote>{mbeg.draft}</blockquote>
        </section>

        <div className="mbeg-footer">
          <p>Illustrative Demodaten. Keine automatische medizinische oder rechtliche Freigabe.</p>
          {!mbeg.reviewed && <button className="button primary full" type="button" onClick={onReview}><ShieldCheck aria-hidden="true" /> Fachlich geprüft markieren</button>}
        </div>
      </aside>
    </div>
  )
}
