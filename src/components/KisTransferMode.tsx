import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, ClipboardCopy, Database, Info, Pencil, Send } from 'lucide-react'
import type { CodingCase, CodingEntry, TechnicalCaseValue } from '../types'
import './KisTransferMode.css'

export interface KisTransferModeProps {
  codingCase: CodingCase
  onConfirm: (completedRowIds: string[]) => void | Promise<void>
  onBack?: () => void
  onEditCodingEntry?: (entryId: string) => void
  onEditTechnicalValue?: (valueId: string) => void
  onOpenGrouperInputs?: () => void
  initialCompletedRowIds?: string[]
  confirming?: boolean
  onProgressChange?: (completed: number, total: number) => void
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
  initialCompletedRowIds = [],
  confirming,
  onProgressChange,
}: KisTransferModeProps) {
  const rows = useMemo(() => buildTransferRows(codingCase), [codingCase])
  const rowSignature = rows.map((row) => row.id).join('|')
  const initialSignature = initialCompletedRowIds.join('|')
  const [completedRows, setCompletedRows] = useState<Set<string>>(() => new Set(initialCompletedRowIds))
  const [copied, setCopied] = useState<string>()
  const [localConfirming, setLocalConfirming] = useState(false)
  const currentRun = codingCase.grouperRuns.at(-1)

  useEffect(() => {
    const available = new Set(rows.map((row) => row.id))
    setCompletedRows(new Set(initialCompletedRowIds.filter((id) => available.has(id))))
  }, [codingCase.id, initialSignature, rowSignature])

  useEffect(() => {
    onProgressChange?.(completedRows.size, rows.length)
  }, [completedRows, onProgressChange, rows.length])

  const total = rows.length
  const completed = completedRows.size
  const allCompleted = total > 0 && completed === total
  const busy = confirming ?? localConfirming

  const toggleCompleted = (rowId: string, checked: boolean) => {
    setCompletedRows((current) => {
      const next = new Set(current)
      if (checked) next.add(rowId)
      else next.delete(rowId)
      return next
    })
  }

  const copyRows = async () => {
    await copyToClipboard(rows.map(formatRowForClipboard).join('\n'))
    setCopied('all')
  }

  const copyRow = async (row: KisTransferRow) => {
    await copyToClipboard(formatRowForClipboard(row))
    setCopied(row.id)
  }

  const confirm = async () => {
    if (!allCompleted || busy) return
    setLocalConfirming(true)
    try {
      await onConfirm(rows.map((row) => row.id))
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
          <strong>{completed} von {total} erledigt</strong>
          <span>{allCompleted ? 'Bereit zum Fallabschluss' : 'Zeilen nach der Eingabe im KIS bestätigen'}</span>
        </div>
        <progress aria-label={`${completed} von ${total} KIS-Einträgen erledigt`} max={Math.max(total, 1)} value={completed} />
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
          <span role="columnheader">KIS</span>
        </div>

        {rows.map((row) => {
          const checked = completedRows.has(row.id)
          return (
            <div className={`kis-transfer-mode__row ${checked ? 'is-completed' : ''}`} role="row" key={row.id}>
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
              <label className="kis-transfer-mode__check" role="cell">
                <input type="checkbox" checked={checked} onChange={(event) => toggleCompleted(row.id, event.target.checked)} />
                <span>{checked && <Check aria-hidden="true" />}<b>im KIS erledigt</b></span>
              </label>
            </div>
          )
        })}

        {!rows.length && <div className="kis-transfer-mode__empty"><CheckCircle2 aria-hidden="true" /><span><strong>Keine Übertragungszeilen vorhanden</strong><small>Kodieränderungen oder Beatmungswerte fehlen.</small></span></div>}
      </div>

      <div className="kis-transfer-mode__interface-note"><Info aria-hidden="true" /><span><strong>Keine Schnittstelle zum Primärsystem</strong><small>Jede Zeile im KIS eintragen oder abgleichen und anschließend hier bestätigen.</small></span></div>

      <footer className="kis-transfer-mode__footer">
        <span aria-live="polite">{allCompleted ? 'Alle KIS-Einträge bestätigt.' : `${total - completed} offen`}</span>
        <button className="kis-transfer-mode__confirm" type="button" disabled={!allCompleted || busy} onClick={() => void confirm()}>
          {busy ? <span className="kis-transfer-mode__spinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
          {busy ? 'Wird abgeschlossen …' : 'KIS-Übernahme bestätigen und Fall abschließen'}
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
