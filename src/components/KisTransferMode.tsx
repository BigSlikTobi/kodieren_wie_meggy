import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ClipboardCopy, Database, Info, Pencil, Send } from 'lucide-react'
import type { CodingCase, CodingEntry, TechnicalCaseValue } from '../types'
import './KisTransferMode.css'

export interface KisTransferModeProps {
  codingCase: CodingCase
  onConfirm: () => void | Promise<void>
  onBack?: () => void
  onEditCodingEntry?: (entryId: string) => void
  onEditTechnicalValue?: (valueId: string) => void
  onOpenGrouperInputs?: () => void
  confirming?: boolean
}

type TransferAction = 'add' | 'change' | 'remove' | 'check'
type TransferKind = 'HD' | 'ND' | 'OPS' | 'Beatmung' | 'Fall'

interface KisTransferRow {
  id: string
  action: TransferAction
  kind: TransferKind
  code: string
  description: string
  date?: string
  time?: string
  location?: string
  department?: string
  source: string
  entryId?: string
  technicalValueId?: string
}

const actionLabels: Record<TransferAction, string> = {
  add: 'Hinzufügen',
  change: 'Ändern',
  remove: 'Entfernen',
  check: 'Abgleichen',
}

export function KisTransferMode({
  codingCase,
  onConfirm,
  onBack,
  onEditCodingEntry,
  onEditTechnicalValue,
  onOpenGrouperInputs,
  confirming,
}: KisTransferModeProps) {
  const rows = useMemo(() => buildTransferRows(codingCase), [codingCase])
  const [copied, setCopied] = useState<string>()
  const [localConfirming, setLocalConfirming] = useState(false)
  const currentRun = codingCase.grouperRuns.at(-1)

  const total = rows.length
  const busy = confirming ?? localConfirming

  const copyRows = async () => {
    await copyToClipboard(rows.map(formatRowForClipboard).join('\n'))
    setCopied('all')
  }

  const copyRow = async (row: KisTransferRow) => {
    await copyToClipboard(formatRowForClipboard(row))
    setCopied(row.id)
  }

  const confirm = async () => {
    if (!rows.length || busy) return
    setLocalConfirming(true)
    try {
      await onConfirm()
    } finally {
      setLocalConfirming(false)
    }
  }

  return (
    <section className="kis-transfer-mode" aria-labelledby="kis-transfer-mode-title">
      <header className="kis-transfer-mode__header">
        <div>
          {onBack && <button className="kis-transfer-mode__back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> Fallcockpit</button>}
          <span className="kis-transfer-mode__kicker">KIS-Abschluss · Fall {codingCase.caseNumber}</span>
          <h2 id="kis-transfer-mode-title">Im KIS übertragen</h2>
        </div>
        <div className="kis-transfer-mode__result" aria-label="Bestätigtes Groupergebnis">
          <span><small>DRG</small><strong>{currentRun?.drg ?? '–'}</strong></span>
          <span><small>Iteration</small><strong>{currentRun?.iteration ?? '–'}</strong></span>
          <span><small>PCCL</small><strong>{currentRun?.pccL ?? '–'}</strong></span>
        </div>
      </header>

      <div className="kis-transfer-mode__toolbar">
        <div className="kis-transfer-mode__progress-copy">
          <strong>{total} {total === 1 ? 'Änderung' : 'Änderungen'} für die KIS-Übernahme</strong>
          <span>Alle Positionen werden mit einem Klick gemeinsam bestätigt.</span>
        </div>
        <div className="kis-transfer-mode__toolbar-actions">
          {onOpenGrouperInputs && <button type="button" onClick={onOpenGrouperInputs}><Database aria-hidden="true" /> Grouper-Eingaben</button>}
          <button type="button" onClick={() => void copyRows()} disabled={!rows.length}><ClipboardCopy aria-hidden="true" /> {copied === 'all' ? 'Liste kopiert' : 'Liste kopieren'}</button>
        </div>
      </div>

      <div className="kis-transfer-mode__table" role="table" aria-label="KIS-Übertragungsliste">
        <div className="kis-transfer-mode__table-head" role="row">
          <span role="columnheader">Aktion</span>
          <span role="columnheader">Typ</span>
          <span role="columnheader">Kode und Bezeichnung</span>
          <span role="columnheader">Grouper-Angaben</span>
          <span role="columnheader">Quelle</span>
        </div>

        {rows.map((row) => (
            <div className="kis-transfer-mode__row" role="row" key={row.id}>
              <span role="cell"><b className={`kis-transfer-mode__action action-${row.action}`}>{actionLabels[row.action]}</b></span>
              <span role="cell"><b className={`kis-transfer-mode__kind kind-${row.kind.toLowerCase()}`}>{row.kind}</b></span>
              <span className="kis-transfer-mode__code" role="cell"><code>{row.code}</code><strong>{row.description}</strong></span>
              <span className="kis-transfer-mode__metadata" role="cell">
                {row.date && <small><b>Datum</b>{row.date}</small>}
                {row.time && <small><b>Uhrzeit</b>{row.time}</small>}
                {row.location && <small><b>Lokalisation</b>{row.location}</small>}
                {row.department && <small><b>Fachabteilung</b>{row.department}</small>}
                {!row.date && !row.time && !row.location && !row.department && <small>–</small>}
              </span>
              <span className="kis-transfer-mode__source" role="cell"><small>{row.source}</small><span className="kis-transfer-mode__row-actions">
                <button type="button" aria-label={`${row.kind} ${row.code} kopieren`} onClick={() => void copyRow(row)}><ClipboardCopy aria-hidden="true" /> {copied === row.id ? 'Kopiert' : 'Kopieren'}</button>
                {row.entryId && onEditCodingEntry && <button type="button" onClick={() => onEditCodingEntry(row.entryId!)}><Pencil aria-hidden="true" /> Korrigieren</button>}
                {row.technicalValueId && onEditTechnicalValue && <button type="button" onClick={() => onEditTechnicalValue(row.technicalValueId!)}><Pencil aria-hidden="true" /> Korrigieren</button>}
              </span></span>
            </div>
        ))}

        {!rows.length && <div className="kis-transfer-mode__empty"><CheckCircle2 aria-hidden="true" /><span><strong>Keine Übertragungszeilen vorhanden</strong><small>Kodieränderungen oder Beatmungswerte fehlen.</small></span></div>}
      </div>

      <div className="kis-transfer-mode__interface-note"><Info aria-hidden="true" /><span><strong>Keine Schnittstelle zum Primärsystem</strong><small>Übertrage die angezeigte Liste vollständig in das KIS. Ein Klick bestätigt anschließend alle Positionen gemeinsam, dokumentiert den Abgleich und schließt den Fall ab.</small></span></div>

      <footer className="kis-transfer-mode__footer">
        <span aria-live="polite">Alle {total} Positionen werden gemeinsam bestätigt.</span>
        <button className="kis-transfer-mode__confirm" type="button" disabled={!rows.length || busy} onClick={() => void confirm()}>
          {busy ? <span className="kis-transfer-mode__spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
          <span><strong>{busy ? 'Wird abgeschlossen …' : 'Alle Änderungen als im KIS übernommen bestätigen'}</strong>{!busy && <small>und Fall abschließen</small>}</span>
        </button>
      </footer>
    </section>
  )
}

function buildTransferRows(codingCase: CodingCase): KisTransferRow[] {
  const changedEntries = codingCase.codingEntries.filter((entry) => entry.change !== 'unchanged' || !entry.active)
  const codingRows = (changedEntries.length ? changedEntries : codingCase.codingEntries.filter((entry) => entry.active))
    .map((entry) => codingEntryToRow(entry, codingCase, changedEntries.length === 0))

  const ventilationRows = codingCase.technicalValues
    .filter((value) => value.kind === 'beatmung')
    .map((value) => ventilationValueToRow(value))

  const rows = [...codingRows, ...ventilationRows]
  if (rows.length) return rows

  const currentRun = codingCase.grouperRuns.at(-1)
  return [{
    id: `kis-fallabgleich-${codingCase.id}`,
    action: 'check',
    kind: 'Fall',
    code: currentRun?.drg ?? '–',
    description: 'Kodierung und Groupergebnis im KIS abgleichen',
    source: 'Bestätigtes Kodierergebnis',
  }]
}

function codingEntryToRow(entry: CodingEntry, codingCase: CodingCase, forceCheck = false): KisTransferRow {
  const event = codingCase.timeline.find((candidate) => candidate.id === entry.treatmentEventId)
  const evidence = codingCase.documentMap.find((candidate) => candidate.id === entry.evidenceDocumentId)
  const action: TransferAction = forceCheck
    ? 'check'
    : !entry.active || entry.change === 'deleted'
    ? 'remove'
    : entry.change === 'added'
      ? 'add'
      : 'change'
  const code = action === 'change' && entry.originalCode
    ? `${entry.originalCode} → ${entry.code}`
    : action === 'remove'
      ? entry.originalCode ?? entry.code
      : entry.code
  const description = action === 'remove'
    ? entry.originalDescription ?? entry.description
    : entry.description

  return {
    id: `kis-code-${entry.id}`,
    action,
    kind: entry.type,
    code,
    description,
    date: formatDate(entry.serviceDate ?? dateForTreatmentDay(codingCase.admissionDate, event?.day)),
    time: entry.serviceTime ?? event?.time,
    location: entry.laterality && entry.laterality !== 'keine' ? capitalize(entry.laterality) : undefined,
    department: entry.department ?? event?.department,
    source: evidence?.title ?? entry.source,
    entryId: entry.id,
  }
}

function ventilationValueToRow(value: TechnicalCaseValue): KisTransferRow {
  const firstInterval = value.intervals[0]
  const lastInterval = value.intervals.at(-1)
  const intervalStart = formatDateTime(firstInterval?.start)
  const intervalEnd = formatDateTime(lastInterval?.end)
  const interval = [intervalStart, intervalEnd].filter(Boolean).join('–')
  const amount = value.aggregateValue === undefined ? 'Wert offen' : `${value.aggregateValue} ${value.unit ?? ''}`.trim()

  return {
    id: `kis-technical-${value.id}`,
    action: value.status === 'korrigiert' ? 'change' : 'check',
    kind: 'Beatmung',
    code: value.code ?? 'Beatmung',
    description: `${value.label} · ${amount}`,
    date: interval || undefined,
    source: value.source,
    technicalValueId: value.id,
  }
}

function dateForTreatmentDay(admissionDate?: string, day?: number) {
  if (!admissionDate || !day) return undefined
  const date = new Date(`${admissionDate}T12:00:00`)
  date.setDate(date.getDate() + day - 1)
  return date.toISOString().slice(0, 10)
}

function formatDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatRowForClipboard(row: KisTransferRow) {
  const metadata = [row.date, row.time, row.location, row.department].filter(Boolean).join(' · ')
  return [actionLabels[row.action], row.kind, row.code, row.description, metadata, row.source].filter(Boolean).join('\t')
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Browser ohne freigegebenen Clipboard-Zugriff: mit lokaler Auswahl fortfahren.
    }
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}
