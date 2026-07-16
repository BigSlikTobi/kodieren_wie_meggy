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
  const activeEntries = codingCase.codingEntries.filter((entry) => entry.active)
  const deletedEntries = codingCase.codingEntries.filter((entry) => !entry.active || entry.change === 'deleted')
  const currentRun = codingCase.grouperRuns.at(-1)!
  const counts = useMemo(() => ({
    active: activeEntries.length,
    added: codingCase.codingEntries.filter((entry) => entry.change === 'added' && entry.active).length,
    changed: codingCase.codingEntries.filter((entry) => entry.change === 'changed' && entry.active).length,
    deleted: deletedEntries.length,
  }), [activeEntries.length, codingCase.codingEntries, deletedEntries.length])

  const copyText = [
    `Fall ${codingCase.caseNumber} · illustrative Demodaten`,
    `DRG ${currentRun.drg} · Iteration ${currentRun.iteration}`,
    '',
    ...(['HD', 'ND', 'OPS'] as const).flatMap((type) => {
      const rows = activeEntries.filter((entry) => entry.type === type)
      return rows.length ? [type, ...rows.map((entry) => `${entry.code}\t${entry.description}\t${changeLabels[entry.change]}`), ''] : []
    }),
    ...(deletedEntries.length ? ['ZU LÖSCHEN', ...deletedEntries.map((entry) => `${entry.type}\t${entry.originalCode ?? entry.code}\t${entry.originalDescription ?? entry.description}`), ''] : []),
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
          <div><div className="page-kicker">KIS-Übergabe · Fall {codingCase.caseNumber}</div><h2 id="coding-transfer-title">Vollständige Kodierung</h2></div>
          <button className="icon-button" type="button" aria-label="Schließen" onClick={onClose}><X aria-hidden="true" /></button>
        </div>

        <div className="coding-transfer-head">
          <div><span>Aktuelle Gruppierung</span><strong>{currentRun.drg}</strong><small>Iteration {currentRun.iteration} · Basis {currentRun.baseDrg} · PCCL {currentRun.pccL}</small></div>
          <button className="button primary" type="button" onClick={() => void copy()}>{copied ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}{copied ? 'Kopiert' : 'KIS-Liste kopieren'}</button>
        </div>

        <div className="coding-change-summary" aria-label="Änderungen gegenüber der Vorkodierung">
          <div><strong>{counts.active}</strong><span>aktive Kodes</span></div>
          <div><strong>{counts.added}</strong><span>ergänzt</span></div>
          <div><strong>{counts.changed}</strong><span>geändert</span></div>
          <div><strong>{counts.deleted}</strong><span>zu löschen</span></div>
        </div>

        <div className="transfer-note"><Info aria-hidden="true" /><span><strong>Arbeitsliste für die manuelle KIS-Übertragung.</strong><small>Keine Schnittstelle. Vor dem Übertragen müssen Kode, Jahr und Fallbezug fachlich geprüft werden.</small></span></div>

        {(['HD', 'ND', 'OPS'] as const).map((type) => (
          <CodingGroup key={type} type={type} entries={activeEntries.filter((entry) => entry.type === type)} codingCase={codingCase} />
        ))}

        {deletedEntries.length > 0 && (
          <section className="coding-transfer-group coding-transfer-deleted" aria-labelledby="deleted-coding-title">
            <div className="coding-transfer-group-title"><div><span className="coding-type-badge deleted">–</span><span><h3 id="deleted-coding-title">Im KIS löschen</h3><small>Diese Einträge waren in der Vorkodierung aktiv.</small></span></div><span>{deletedEntries.length}</span></div>
            <div className="coding-transfer-list">{deletedEntries.map((entry) => <CodingTransferRow key={entry.id} entry={entry} codingCase={codingCase} />)}</div>
          </section>
        )}

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
