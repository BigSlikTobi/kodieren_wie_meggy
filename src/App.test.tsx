import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.getByRole('heading', { name: 'Falllandkarte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierkonsil · 0/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wiki-Chat · 0/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Iteration 1/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeDisabled()
  })

  it('sortiert Verlaufs- und Ereignisberichte auf der Falllandkarte', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    expect(screen.getByText('Verlaufsberichte')).toBeInTheDocument()
    expect(screen.getByText('Ereignisse und Nachweise')).toBeInTheDocument()
    expect(screen.getByText('Jetzt prüfen')).toBeInTheDocument()
    expect(screen.getByText('Vorläufig erledigt')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bronchoskopie- und Biopsiebericht, Vorprüfung · nachvalidieren, Tag 3' }))
    const documentDialog = screen.getByRole('dialog', { name: 'Dokument einordnen' })
    expect(within(documentDialog).getByText(/Originalbericht geprüft/i)).toBeInTheDocument()
    await user.click(within(documentDialog).getByRole('button', { name: /Wiki fragen/i }))
    const wikiDialog = screen.getByRole('dialog', { name: 'Wiki-Chat' })
    await user.click(within(wikiDialog).getByRole('button', { name: 'Schließen' }))

    await user.click(screen.getByRole('button', { name: 'Bronchoskopie- und Biopsiebericht, Vorprüfung · nachvalidieren, Tag 3' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Dokument einordnen' })).getByRole('button', { name: /Nachvalidierung abschließen/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: 'Bronchoskopie- und Biopsiebericht, Validiert · stimmig, Tag 3' })).toBeInTheDocument()
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

    const stored = JSON.parse(localStorage.getItem('kodierpfad-demo-v4') ?? '{}') as { cases?: unknown[] }
    expect(stored.cases).toHaveLength(1)
  })

  it('leitet eine fachfremde gruppierungsrelevante Frage ins Kodierkonsil', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    expect(screen.getByText('Geführte Eigenprüfung')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Fachkenntnis für Hauptdiagnose/i), 'fremd')
    expect(screen.getByText('Menschliches Kodierkonsil')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Kodierkonsil$/i }))
    expect(screen.getByRole('heading', { name: 'Kodierkonsil' })).toBeInTheDocument()
    expect(screen.getByText(/Vollständiger Fallkontext wird geteilt/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Konsil anfordern/i }))
    expect(screen.getByText(/Simulierte Expertenantwort/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Konsilergebnis übernehmen/i }))
    await waitFor(() => expect(screen.getByText(/Konsil abgeschlossen: bestätigt/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
  })

  it('nutzt den Wiki-Chat nur als Wissenshilfe und löst keine Fallentscheidung', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))

    await user.click(screen.getByRole('button', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i }))
    expect(screen.getByText('Wiki-Chat zur Einordnung')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Wiki fragen/i }))
    await user.type(screen.getByLabelText(/Frage an den Wiki-Chat/i), 'Welche Mindestmerkmale sind hier grundsätzlich wichtig?')
    await user.click(screen.getByRole('button', { name: /Senden/i }))

    expect(screen.getByText(/ersetzt keinen Fallnachweis/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Schließen' }))
    expect(screen.getByRole('button', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i })).toHaveTextContent('Wahrscheinlich')
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
