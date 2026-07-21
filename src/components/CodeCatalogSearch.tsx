import { BookOpenCheck, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { demoCodeCatalog, getCatalogText, type CodeCatalogEntry, type CodeCatalogKind } from '../data/codeCatalog'
import './CodeCatalogSearch.css'

interface CodeCatalogSearchProps {
  kind: CodeCatalogKind
  value: string
  fallbackText?: string
  disabled?: boolean
  onSelect: (code: string, shortText: string) => void
}

export function CodeCatalogSearch({ kind, value, fallbackText = '', disabled, onSelect }: CodeCatalogSearchProps) {
  const id = useId()
  const listId = `${id}-results`
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const results = useMemo(() => demoCodeCatalog.search(kind, query), [kind, query])
  const selected = demoCodeCatalog.resolve(kind, value)

  useEffect(() => setQuery(value), [kind, value])

  const choose = (entry: CodeCatalogEntry) => {
    setQuery(entry.code)
    setOpen(false)
    onSelect(entry.code, entry.shortText)
  }

  const changeQuery = (raw: string) => {
    setQuery(raw)
    setOpen(true)
    if (!raw.trim()) {
      onSelect('', '')
      return
    }
    if (looksLikeCode(kind, raw)) {
      const normalized = raw.trim().toUpperCase()
      const match = demoCodeCatalog.resolve(kind, normalized)
      onSelect(normalized, match?.shortText ?? '')
    }
  }

  return <div className="catalog-search">
    <label htmlFor={id}>{kind === 'OPS' ? 'OPS-Code oder Begriff suchen' : 'ICD-Code oder Begriff suchen'}</label>
    <div className="catalog-search-control">
      <Search aria-hidden="true" />
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-label={kind === 'OPS' ? 'OPS-Code oder Begriff suchen' : 'ICD-Code oder Begriff suchen'}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder={kind === 'OPS' ? 'z. B. 1-620.0 oder Bronchoskopie' : 'z. B. J18.9 oder Pneumonie'}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => changeQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && results[0]) {
            event.preventDefault()
            choose(results[0])
          }
        }}
      />
    </div>
    <small className="catalog-search-hint">Kode oder medizinischen Begriff eingeben und einen Treffer auswählen.</small>

    {open && query.trim().length >= 2 && <div className="catalog-results" id={listId} role="listbox" aria-label={`${kind}-Suchergebnisse`}>
      {results.length ? results.map((entry) => <button
        key={`${entry.kind}-${entry.code}`}
        type="button"
        role="option"
        aria-selected={entry.code === selected?.code}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(entry)}
      >
        <code>{entry.code}</code>
        <span>{entry.shortText}</span>
      </button>) : <p>Kein Treffer im Demoindex. Ein gültiger Kode kann trotzdem direkt eingegeben werden.</p>}
    </div>}

    {(value || fallbackText) && <CatalogCodeText kind={kind} code={value} fallbackText={fallbackText} />}
  </div>
}

export function CatalogCodeText({ kind, code, fallbackText = '', compact = false }: {
  kind: CodeCatalogKind
  code: string
  fallbackText?: string
  compact?: boolean
}) {
  const catalog = getCatalogText(kind, code, fallbackText)
  return <div className={`catalog-code-text ${catalog.official ? 'is-official' : 'is-fallback'} ${compact ? 'is-compact' : ''}`}>
    <BookOpenCheck aria-hidden="true" />
    <span>
      <strong>{catalog.shortText}</strong>
      <small>{catalog.sourceLabel}</small>
    </span>
  </div>
}

function looksLikeCode(kind: CodeCatalogKind, raw: string) {
  const normalized = raw.trim().toUpperCase()
  return kind === 'OPS' ? /^\d-/.test(normalized) : /^[A-Z]\d/.test(normalized)
}
