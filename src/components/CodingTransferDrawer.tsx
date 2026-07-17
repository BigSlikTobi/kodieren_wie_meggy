import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, Info, ServerCog, X } from 'lucide-react'
import type { CodingCase, CodingChange, CodingEntry } from '../types'

interface CodingTransferDrawerProps {
  codingCase: CodingCase
  onClose: () => void
}

const changeLabels: Record<CodingChange, string> = {
  unchanged: 'Unverändert',
  added: 'Ergänzt',
  changed: 'Geändert',
  deleted: 'Gelöscht',
}

export function CodingTransferDrawer({ codingCase, onClose }: CodingTransferDrawerProps) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'changes' | 'full'>('changes')
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const deletedEntries = codingCase.codingEntries.filter((entry) => !entry.active || entry.change === 'deleted')
  const addedEntries = activeEntries.filter((entry) => entry.change === 'added')
  const changedEntries = activeEntries.filter((entry) => entry.change === 'changed')
  const currentRun = codingCase.grouperRuns.at(-1)!
  const counts = useMemo(() => ({
    active: activeEntries.length,
    added: codingCase.codingEntries.filter((entry) => entry.change === 'added' && entry.active).length,
    changed: codingCase.codingEntries.filter((entry) => entry.change === 'changed' && entry.active).length,
    deleted: deletedEntries.length,
  }), [activeEntries.length, codingCase.codingEntries, deletedEntries.length])

  const fullCodingRows = (['HD', 'ND', 'OPS'] as const).flatMap((type) => {
    const rows = activeEntries.filter((entry) => entry.type === type)
    return rows.length ? [type, ...rows.map((entry) => `${entry.code}\t${entry.description}\t${changeLabels[entry.change]}`), ''] : []
  })
  const changeRows = [
    ...(addedEntries.length ? ['ERGÄNZEN', ...addedEntries.map((entry) => `${entry.type}\t${entry.code}\t${entry.description}`), ''] : []),
    ...(changedEntries.length ? ['ÄNDERN', ...changedEntries.map((entry) => `${entry.type}\t${entry.originalCode ?? '–'} → ${entry.code}\t${entry.description}`), ''] : []),
    ...(deletedEntries.length ? ['LÖSCHEN', ...deletedEntries.map((entry) => `${entry.type}\t${entry.originalCode ?? entry.code}\t${entry.originalDescription ?? entry.description}`), ''] : []),
  ]
  const copyText = [
    `Fall ${codingCase.caseNumber} · illustrative Demodaten`,
    `DRG ${currentRun.drg} · Iteration ${currentRun.iteration}`,
    '',
    ...(view === 'changes' ? changeRows : fullCodingRows),
    ...(view === 'full' && deletedEntries.length ? ['ZU LÖSCHEN', ...deletedEntries.map((entry) => `${entry.type}\t${entry.originalCode ?? entry.code}\t${entry.originalDescription ?? entry.description}`), ''] : []),
    ...(codingCase.technicalValues.length ? ['TECHNISCHE GROUPER-WERTE', ...codingCase.technicalValues.map((value) => `${value.code ?? value.label}\t${value.aggregateValue ?? ''} ${value.unit ?? ''}\t${value.status}`)] : []),
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(copyText)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="collaboration-drawer coding-transfer-drawer" role="dialog" aria-modal="true" aria-labelledby="coding-transfer-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><div className="page-kicker">Kodierergebnis · Fall {codingCase.caseNumber}</div><h2 id="coding-transfer-title">Kodierergebnis &amp; KIS-Übernahme</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="coding-transfer-head">
          <div><span>Aktuelle Gruppierung</span><strong>{currentRun.drg}</strong><small>Iteration {currentRun.iteration} · Basis {currentRun.baseDrg} · PCCL {currentRun.pccL}</small></div>
          <button className="button primary" type="button" onClick={() => void copy()}>{copied ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}{copied ? 'Kopiert' : view === 'changes' ? 'Änderungsliste kopieren' : 'Vollständige Liste kopieren'}</button>
        </div>

        <div className="coding-change-summary" aria-label="Änderungen gegenüber der Vorkodierung">
          <div><strong>{counts.active}</strong><span>aktive Kodes</span></div>
          <div><strong>{counts.added}</strong><span>ergänzt</span></div>
          <div><strong>{counts.changed}</strong><span>geändert</span></div>
          <div><strong>{counts.deleted}</strong><span>zu löschen</span></div>
        </div>

        <div className="transfer-note"><Info aria-hidden="true" /><span><strong>Arbeitsliste für die manuelle KIS-Übertragung.</strong><small>Keine Schnittstelle. Vor dem Übertragen müssen Kode, Jahr und Fallbezug fachlich geprüft werden.</small></span></div>

        <div className="coding-transfer-view" role="group" aria-label="Ansicht des Kodierergebnisses">
          <button className={view === 'changes' ? 'active' : ''} type="button" aria-pressed={view === 'changes'} onClick={() => { setView('changes'); setCopied(false) }}><strong>Änderungen fürs KIS</strong><small>{addedEntries.length + changedEntries.length + deletedEntries.length} zu übertragen</small></button>
          <button className={view === 'full' ? 'active' : ''} type="button" aria-pressed={view === 'full'} onClick={() => { setView('full'); setCopied(false) }}><strong>Vollständige Kodierung</strong><small>{activeEntries.length} aktive Kodes</small></button>
        </div>

        {view === 'changes' ? <>
          <CodingChangeGroup title="Im KIS ergänzen" detail="Neue ICD- oder OPS-Kodes" badge="+" entries={addedEntries} codingCase={codingCase} />
          <CodingChangeGroup title="Im KIS ändern" detail="Bestehenden Kode ersetzen" badge="↺" entries={changedEntries} codingCase={codingCase} />
          <CodingChangeGroup title="Im KIS löschen" detail="Vorkodierte Einträge entfernen" badge="–" entries={deletedEntries} codingCase={codingCase} deleted />
          {!addedEntries.length && !changedEntries.length && !deletedEntries.length && <div className="coding-transfer-no-changes"><Check aria-hidden="true" /><span><strong>Keine Änderung gegenüber der Vorkodierung</strong><small>Die vollständige, validierte Kodierung bleibt über die zweite Ansicht verfügbar.</small></span></div>}
        </> : <>
          {(['HD', 'ND', 'OPS'] as const).map((type) => (
            <CodingGroup key={type} type={type} entries={activeEntries.filter((entry) => entry.type === type)} codingCase={codingCase} />
          ))}
          {deletedEntries.length > 0 && <CodingChangeGroup title="Im KIS löschen" detail="Diese Einträge waren in der Vorkodierung aktiv." badge="–" entries={deletedEntries} codingCase={codingCase} deleted />}
        </>}

        <section className="coding-transfer-group" aria-labelledby="technical-transfer-title">
          <div className="coding-transfer-group-title"><div><span className="coding-type-badge"><ServerCog aria-hidden="true" /></span><span><h3 id="technical-transfer-title">Technische Grouper-Werte</h3><small>Separat übernehmen oder gegen das KIS prüfen.</small></span></div><span>{codingCase.technicalValues.length}</span></div>
          {codingCase.technicalValues.length ? (
            <div className="coding-transfer-list">
              {codingCase.technicalValues.map((value) => (
                <div className="coding-transfer-row" key={value.id}>
                  <code>{value.code ?? 'Wert'}</code>
                  <span><strong>{value.label}</strong><small>{value.source}</small></span>
                  <span className="transfer-value">{value.aggregateValue} {value.unit}</span>
                  <span className={`status-pill status-${['bestätigt', 'korrigiert'].includes(value.status) ? 'belegt' : 'ungeklärt'}`}>{value.status}</span>
                </div>
              ))}
            </div>
          ) : <p className="coding-transfer-empty">Keine zusätzlichen technischen Grouper-Werte im Fall.</p>}
        </section>

        <p className="demo-disclaimer">Alle ICD-, OPS- und DRG-Werte sind illustrative Demodaten. Keine automatische Übertragung.</p>
      </aside>
    </div>
  )
}

function CodingGroup({ type, entries, codingCase }: { type: CodingEntry['type']; entries: CodingEntry[]; codingCase: CodingCase }) {
  const labels = {
    HD: ['Hauptdiagnose', 'Genau eine aktive Hauptdiagnose'],
    ND: ['Nebendiagnosen', 'Aktive ICD-Nebendiagnosen'],
    OPS: ['Prozeduren', 'Aktive OPS-Kodes'],
  }
  return (
    <section className="coding-transfer-group" aria-labelledby={`coding-group-${type}`}>
      <div className="coding-transfer-group-title"><div><span className="coding-type-badge">{type}</span><span><h3 id={`coding-group-${type}`}>{labels[type][0]}</h3><small>{labels[type][1]}</small></span></div><span>{entries.length}</span></div>
      {entries.length ? <div className="coding-transfer-list">{entries.map((entry) => <CodingTransferRow key={entry.id} entry={entry} codingCase={codingCase} />)}</div> : <p className="coding-transfer-empty">Keine aktiven Einträge.</p>}
    </section>
  )
}

function CodingChangeGroup({ title, detail, badge, entries, codingCase, deleted = false }: { title: string; detail: string; badge: string; entries: CodingEntry[]; codingCase: CodingCase; deleted?: boolean }) {
  if (!entries.length) return null
  const id = `coding-change-${badge.codePointAt(0)}`
  return (
    <section className={`coding-transfer-group ${deleted ? 'coding-transfer-deleted' : ''}`} aria-labelledby={id}>
      <div className="coding-transfer-group-title"><div><span className={`coding-type-badge ${deleted ? 'deleted' : ''}`}>{badge}</span><span><h3 id={id}>{title}</h3><small>{detail}</small></span></div><span>{entries.length}</span></div>
      <div className="coding-transfer-list">{entries.map((entry) => <CodingTransferRow key={entry.id} entry={entry} codingCase={codingCase} />)}</div>
    </section>
  )
}

function CodingTransferRow({ entry, codingCase }: { entry: CodingEntry; codingCase: CodingCase }) {
  const document = codingCase.documentMap.find((item) => item.id === entry.evidenceDocumentId)
  return (
    <div className="coding-transfer-row">
      <code>{entry.code}</code>
      <span>
        <strong>{entry.description || 'Keine Beschreibung'}</strong>
        {entry.change === 'changed' && <small>Vorher: {entry.originalCode} · {entry.originalDescription}</small>}
        {entry.change === 'deleted' && <small>Aus Vorkodierung entfernen</small>}
        <small>Quelle: {document?.title ?? entry.source} · Iteration {entry.assessedIteration}</small>
      </span>
      <span className={`coding-change-badge change-${entry.change}`}>{changeLabels[entry.change]}</span>
    </div>
  )
}
