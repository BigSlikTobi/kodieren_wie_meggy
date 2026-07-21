import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { demoCodeCatalog, getCatalogText } from '../data/codeCatalog'
import { CodeCatalogSearch } from './CodeCatalogSearch'

describe('CodeCatalogSearch', () => {
  afterEach(() => cleanup())

  it('findet ICD und OPS sowohl über Kode als auch medizinischen Begriff', () => {
    expect(demoCodeCatalog.search('ICD', 'Pneumonie')[0]?.code).toBe('J18.9')
    expect(demoCodeCatalog.search('OPS', '1-620')[0]?.shortText).toMatch(/Tracheobronchoskopie/i)
  })

  it('übernimmt OPS-Kode, amtlichen Kurztext und sichtbare Jahresquelle gemeinsam', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [code, setCode] = useState('')
      const [text, setText] = useState('')
      return <CodeCatalogSearch kind="OPS" value={code} fallbackText={text} onSelect={(nextCode, nextText) => {
        setCode(nextCode)
        setText(nextText)
      }} />
    }

    render(<Harness />)
    await user.type(screen.getByRole('combobox', { name: /OPS-Code oder Begriff suchen/i }), 'Bronchoskopie')
    await user.click(screen.getByRole('option', { name: /1-620.0/i }))

    expect(screen.getByRole('combobox', { name: /OPS-Code oder Begriff suchen/i })).toHaveValue('1-620.0')
    expect(screen.getByText(/Diagnostische Tracheobronchoskopie: Mit flexiblem Instrument/i)).toBeInTheDocument()
    expect(screen.getByText('BfArM · 2026 · Demoindex')).toBeInTheDocument()
  })

  it('kennzeichnet einen Treffer auf einer Oberkategorie ausdrücklich als nicht exakt', () => {
    expect(demoCodeCatalog.resolve('OPS', '8-837.01')).toBeUndefined()
    expect(demoCodeCatalog.resolveCategory('OPS', '8-837.01')?.code).toBe('8-837')

    const catalog = getCatalogText('OPS', '8-837.01')
    expect(catalog.official).toBe(false)
    expect(catalog.matchLevel).toBe('category')
    expect(catalog.shortText).toMatch(/Oberkategorie 8-837/i)
    expect(catalog.sourceLabel).toMatch(/kein exakter Treffer/i)
  })

  it('entfernt beim Tippen eines unbekannten Kodes den veralteten Katalogtext', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [code, setCode] = useState('1-620.0')
      const [text, setText] = useState('Diagnostische Tracheobronchoskopie: Mit flexiblem Instrument')
      return <>
        <CodeCatalogSearch kind="OPS" value={code} fallbackText={text} onSelect={(nextCode, nextText) => {
          setCode(nextCode)
          setText(nextText)
        }} />
        <output aria-label="Arbeitsbeschreibung">{text || 'leer'}</output>
      </>
    }

    render(<Harness />)
    const input = screen.getByRole('combobox', { name: /OPS-Code oder Begriff suchen/i })
    await user.clear(input)
    await user.type(input, '8-837.01')

    expect(screen.getByLabelText('Arbeitsbeschreibung')).toHaveTextContent('leer')
    expect(screen.queryByText(/Mit flexiblem Instrument/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/nur Oberkategorie 8-837, kein exakter Treffer/i).length).toBeGreaterThan(0)
  })
})
