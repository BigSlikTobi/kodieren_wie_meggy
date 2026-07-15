import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

describe('Kodierpfad prototype', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    localStorage.clear()
  })

  it('führt vom Fallkontext bis zum Cockpit', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /In drei Schritten/i })).toBeInTheDocument()
    expect(screen.getByText(/Profil aktiv/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Erste Dokumente/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Bereit für die erste Iteration/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))
    expect(screen.getByRole('heading', { name: /Pulmologisch-onkologischer Demofall/i })).toBeInTheDocument()
    expect(screen.getByText('Typisch für dieses Haus')).toBeInTheDocument()
    expect(screen.getByText('Schwieriger Fall')).toBeInTheDocument()
    expect(screen.getByText('1 spezifische DKR erkannt')).toBeInTheDocument()
    expect(screen.getByText(/Iteration 1/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeDisabled()
  })

  it('strukturiert, testet und genehmigt eine neue Regel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Regeln$/i }))
    await user.click(screen.getByRole('button', { name: /Neue Regel/i }))
    await user.clear(screen.getByLabelText(/^Name$/i))
    await user.type(screen.getByLabelText(/^Name$/i), 'Pneumonie-Demoregel')
    await user.click(screen.getByRole('button', { name: /Regel strukturieren/i }))

    expect(screen.getByText(/Passende Bildgebung ist dokumentiert/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Gegen historische Fälle testen/i }))
    expect(screen.getByText(/Auswirkung simuliert/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Regel freigeben/i }))
    expect(screen.getByRole('heading', { name: 'Pneumonie-Demoregel' })).toBeInTheDocument()
    expect(screen.getAllByText(/Freigegeben/i).length).toBeGreaterThan(0)
  })

  it('speichert den aktuellen Stand lokal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    const stored = JSON.parse(localStorage.getItem('kodierpfad-demo-v2') ?? '{}') as { cases?: unknown[] }
    expect(stored.cases).toHaveLength(1)
  })

  it('erlaubt die manuelle Korrektur von Typik und Schwierigkeit', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    await user.selectOptions(screen.getByLabelText('Krankenhaustypik manuell ändern'), 'untypisch')
    await user.selectOptions(screen.getByLabelText('Fallschwierigkeit manuell ändern'), 'einfach')

    expect(screen.getByText('Untypisch für dieses Haus')).toBeInTheDocument()
    expect(screen.getByText('Einfacher Fall')).toBeInTheDocument()
    expect(screen.getAllByText('Manuell').length).toBe(2)
  })

  it('erzeugt Iterationen und entsperrt den Abschluss nach Pflichtnachweisen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'epikrise.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: /Systemische Tumortherapie prüfen/i }))
    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'therapie.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeEnabled())

    await user.click(screen.getByRole('button', { name: /Abschlussvorschlag/i }))
    expect(screen.getByRole('heading', { name: /Fallabschluss/i })).toBeInTheDocument()
  })
})
