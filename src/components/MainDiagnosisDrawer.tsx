import { useState } from 'react'
import { FileCode2, RotateCw, Save, ShieldAlert, X } from 'lucide-react'
import type { CodingEntry } from '../types'

interface MainDiagnosisDrawerProps {
  currentEntry?: CodingEntry
  nextIteration: number
  running: boolean
  onClose: () => void
  onSave: (input: { code: string; description: string }) => Promise<void>
}

export function MainDiagnosisDrawer({ currentEntry, nextIteration, running, onClose, onSave }: MainDiagnosisDrawerProps) {
  const [code, setCode] = useState(currentEntry?.code ?? '')
  const [description, setDescription] = useState(currentEntry?.description ?? '')
  const [error, setError] = useState('')

  const submit = async () => {
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) {
      setError('Bitte einen ICD-Kode eingeben.')
      return
    }
    setError('')
    await onSave({ code: normalizedCode, description: description.trim() })
  }

  return (
    <div className="drawer-backdrop coding-entry-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer coding-entry-drawer main-diagnosis-drawer" role="dialog" aria-modal="true" aria-labelledby="main-diagnosis-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Früher Arbeitskode · neue Iteration</div><h2 id="main-diagnosis-title">Hauptdiagnose eingeben</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="coding-source-strip manual-code-source">
          <FileCode2 aria-hidden="true" />
          <span>
            <small>Direkteingabe der Kodierfachkraft</small>
            <strong>{currentEntry ? `Aktive Hauptdiagnose: ${currentEntry.code}` : 'Noch keine aktive Hauptdiagnose'}</strong>
            <span>Die Eingabe wird als manueller Arbeitskode gespeichert.</span>
          </span>
        </div>

        <div className="manual-code-warning">
          <ShieldAlert aria-hidden="true" />
          <span><strong>Noch kein Dokumentnachweis</strong><small>Die DRG-Hypothese wird neu berechnet. Die Pflichtprüfung der Hauptdiagnose bleibt offen, bis der Fallbezug belegt ist.</small></span>
        </div>

        <div className="coding-entry-fields">
          <label>ICD-Kode
            <input aria-label="ICD-Kode der Hauptdiagnose" value={code} onChange={(event) => setCode(event.target.value)} placeholder="z. B. C34.1" autoComplete="off" autoFocus />
          </label>
          <label>Beschreibung <span>(optional)</span>
            <textarea aria-label="Beschreibung der Hauptdiagnose" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Kurze Bezeichnung oder fallbezogene Einordnung" />
          </label>
        </div>

        <div className="coding-iteration-preview">
          <RotateCw aria-hidden="true" />
          <span><strong>Die Änderung erzeugt Iteration {nextIteration}.</strong><small>Die bisherige Hauptdiagnose bleibt für die spätere KIS-Übergabe als Vorwert erhalten.</small></span>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="button-row end">
          <button className="button secondary" type="button" disabled={running} onClick={onClose}>Abbrechen</button>
          <button className="button primary" type="button" disabled={running} onClick={() => void submit()}>{running ? <RotateCw className="spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{running ? 'Grouper läuft …' : 'Als Arbeitskode übernehmen'}</button>
        </div>
      </aside>
    </div>
  )
}
