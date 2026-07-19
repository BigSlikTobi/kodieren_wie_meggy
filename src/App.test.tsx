import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

async function openManualIntake(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
  await user.type(screen.getByLabelText(/Fallnummer/i), 'P-2026-009999')
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.upload(screen.getByLabelText(/Arzt- oder Entlassungsbericht auswählen/i), new File(['bericht'], 'entlassungsbericht.pdf', { type: 'application/pdf' }))
  await user.upload(screen.getByLabelText(/KIS-Kodierexport auswählen/i), new File(['kodierung'], 'aktuelle-kodierung.csv', { type: 'text/csv' }))
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
}

async function confirmIntake(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Verlauf bestätigen/i }))
  await user.click(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i }))
  await user.click(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i }))
}

async function openManualCockpit(user: ReturnType<typeof userEvent.setup>) {
  await openManualIntake(user)
  await confirmIntake(user)
}

describe('Kodierpfad – geführter Arbeitsablauf', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true })
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: () => undefined, writable: true })
  })

  it('trennt Fallzuordnung, Behandlungsverlauf und KIS-Ausgangskodierung', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
    expect(screen.getByRole('heading', { name: /Fall aus dem KIS übernehmen/i })).toBeInTheDocument()
    expect(screen.getByText(/Nur Angaben zur eindeutigen Zuordnung/i)).toBeInTheDocument()
    expect(screen.queryByText(/Strukturmerkmale/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/NUB-Vereinbarungen/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/Fallnummer/i), 'P-2026-009999')
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Behandlungsverlauf erstellen/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Aktuelle KIS-Kodierung übernehmen/i })).toBeInTheDocument()
    expect(screen.getAllByText('Noch offen')).toHaveLength(2)
    await user.upload(screen.getByLabelText(/Arzt- oder Entlassungsbericht auswählen/i), new File(['bericht'], 'entlassungsbericht.pdf', { type: 'application/pdf' }))
    await user.upload(screen.getByLabelText(/KIS-Kodierexport auswählen/i), new File(['kodierung'], 'aktuelle-kodierung.csv', { type: 'text/csv' }))
    expect(screen.getAllByText('Vorhanden')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Beide Ausgangsstände sind vorhanden/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
    expect(screen.getByRole('heading', { name: /Zwei Ausgangsstände prüfen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Verlauf bestätigen/i }))
    expect(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i }))
    expect(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i })).toBeEnabled()
  })

  it('übernimmt manuelle Ereignisse und manuelle KIS-Kodes in die echte Fallbasis', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
    await user.type(screen.getByLabelText(/Fallnummer/i), 'P-2026-009998')
    await user.click(screen.getByRole('button', { name: /Weiter/i }))

    const courseCard = screen.getByRole('heading', { name: /Behandlungsverlauf erstellen/i }).closest('article')!
    await user.click(within(courseCard).getByRole('button', { name: 'Manuell' }))
    await user.type(within(courseCard).getByLabelText(/Was ist passiert/i), 'Operation der Schenkelhalsfraktur')
    await user.click(within(courseCard).getByRole('button', { name: /Ereignis hinzufügen/i }))
    expect(within(courseCard).getByText('Operation der Schenkelhalsfraktur')).toBeInTheDocument()

    const codingCard = screen.getByRole('heading', { name: /Aktuelle KIS-Kodierung übernehmen/i }).closest('article')!
    await user.click(within(codingCard).getByRole('button', { name: 'Manuell' }))
    const codingInput = within(codingCard).getByLabelText(/Kodes aus dem KIS/i)
    await user.clear(codingInput)
    await user.type(codingInput, 'HD S72.00 Schenkelhalsfraktur\nOPS 5-790.5 Osteosynthese')
    expect(within(codingCard).getByText('2 Kodes erkannt')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
    const intakeMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    expect(intakeMap).toHaveTextContent('Operation der Schenkelhalsfraktur')
    expect(screen.getByText('1 ICD · 1 OPS')).toBeInTheDocument()
    await user.click(screen.getByText(/Erkannte Ereignisse bearbeiten/i))
    expect(screen.getAllByText('Operation der Schenkelhalsfraktur').length).toBeGreaterThan(0)
  })

  it('setzt die Verlaufsbestätigung nach einer manuellen Änderung zurück', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualIntake(user)
    await user.click(screen.getByRole('button', { name: /Verlauf bestätigen/i }))
    await user.click(screen.getByRole('button', { name: /Ereignis ergänzen/i }))
    await user.type(screen.getByLabelText(/Was ist passiert/i), 'Zusätzliche Operation')
    await user.click(screen.getByRole('button', { name: /Im Verlauf übernehmen/i }))

    expect(screen.getByText(/direkt in den Behandlungsverlauf übernommen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i })).toBeDisabled()
    expect(screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })).toHaveTextContent('Zusätzliche Operation')
  })

  it('stoppt nach jeder Kodierentscheidung sichtbar vor dem nächsten Prüfschritt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)

    const caseMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    await user.click(within(caseMap).getByRole('button', { name: /Nächster belastbarer Schritt/i }))
    expect(screen.getByRole('heading', { name: /Hauptdiagnose über den Gesamtfall belegen/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Vorkodierung validieren/i }))

    await waitFor(() => expect(screen.getByText(/Kodierentscheidung abgeschlossen/i)).toBeInTheDocument())
    expect(screen.getByText(/Der nächste Sachverhalt wird erst nach Deiner bewussten Auswahl geöffnet/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Systemische Tumortherapie prüfen/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nächsten Prüfschritt starten/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Nächsten Prüfschritt starten/i }))
    expect(screen.getByRole('heading', { name: /Systemische Tumortherapie prüfen/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Vorkodierung validieren/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Zur Regelprüfung/i })).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: /Palliativmedizinische Komplexbehandlung/i })).not.toBeInTheDocument()
    expect(screen.getByText(/optionale Pfade bleiben nachgeordnet/i)).toBeInTheDocument()
  })

  it('bietet den Dokumentupload direkt an jedem Ereignis der Dokumentenlandkarte an', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Dokumente und Kodes öffnen/i }))

    const chronology = screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })
    const biopsyEvent = within(chronology).getByText('Bronchoskopische Biopsie').closest('article')!
    expect(within(biopsyEvent).getByLabelText(/Dokument für Bronchoskopische Biopsie hochladen/i)).toBeInTheDocument()
    await user.upload(within(biopsyEvent).getByLabelText(/Dokument zu diesem Ereignis/i), new File(['demo'], 'op-bericht.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getAllByText(/LLM-Zuordnung vorbereitet/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/Neu hochgeladen und diesem Ereignis zugeordnet/i).length).toBeGreaterThan(0)

    const documentDialog = screen.getByRole('dialog', { name: /Bronchoskopie- und Biopsiebericht/i })
    expect(within(documentDialog).getByLabelText(/Ausgelesener Dokumenttext/i)).toHaveTextContent(/Aufnahmegrund und Behandlungsbezug/i)
    expect(within(documentDialog).getAllByText(/Belegstelle/i).length).toBeGreaterThan(0)

    await user.click(within(documentDialog).getByRole('button', { name: /Wiki fragen/i }))
    const wikiDialog = screen.getByRole('dialog', { name: 'Wiki-Chat' })
    expect(within(wikiDialog).getByText(/Empfehlung und Dokumentation nebeneinander/i)).toBeInTheDocument()
    await user.type(within(wikiDialog).getByLabelText(/Frage an den Wiki-Chat/i), 'Welche OPS-Systematik ist hier relevant?')
    await user.click(within(wikiDialog).getByRole('button', { name: /Senden/i }))
    const returnToCoding = within(wikiDialog).getByRole('button', { name: /Zur Kodierentscheidung/i })
    expect(returnToCoding).toBeDisabled()
    await user.click(within(wikiDialog).getByLabelText(/Hinweis und Dokumentation geprüft/i))
    expect(returnToCoding).toBeEnabled()
  })

  it('führt nach Pflichtprüfungen über Regelprüfung zur manuellen KIS-Übergabe', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(within(screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })).getByRole('button', { name: /Nächster belastbarer Schritt/i }))
    await user.click(screen.getByRole('button', { name: /Vorkodierung validieren/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Nächsten Prüfschritt starten/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Nächsten Prüfschritt starten/i }))
    await user.click(screen.getByRole('button', { name: /Vorkodierung validieren/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Zur Regelprüfung/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Zur Regelprüfung/i }))

    expect(screen.getByRole('heading', { name: /Kodierregeln plausibilisieren/i })).toBeInTheDocument()
    expect(screen.queryByText(/^NUB$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Komplexbehandlungen$/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Regelprüfung bestätigen/i }))
    await user.click(screen.getByRole('button', { name: /Prüfung abschließen/i }))

    expect(screen.getByRole('heading', { name: /Prüfung abgeschlossen – KIS-Übernahme ausstehend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /KIS-Übertragungsliste öffnen/i })).toBeInTheDocument()
    expect(screen.getByText(/Keine Schnittstelle zum Primärsystem/i)).toBeInTheDocument()
    const finalClose = screen.getByRole('button', { name: /KIS-Übernahme bestätigen und Fall abschließen/i })
    expect(finalClose).toBeDisabled()
    await user.click(screen.getByLabelText(/Kodierung im KIS übernommen/i))
    await user.click(screen.getByLabelText(/Groupergebnis im KIS geprüft/i))
    expect(finalClose).toBeEnabled()
    await user.click(finalClose)
    expect(screen.getByRole('heading', { name: /Fall sicher abgeschlossen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nächsten Fall auswählen/i })).toBeInTheDocument()
  })

  it('zeigt sekundäre Grouper-Eingaben weiterhin bei Bedarf', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /^Grouper-Eingaben$/i }))
    const dialog = screen.getByRole('dialog', { name: 'Grouper-Eingaben' })
    expect(within(dialog).getByText('Aufnahmegrund')).toBeInTheDocument()
    expect(within(dialog).getByText('Entlassungsgrund')).toBeInTheDocument()
    expect(within(dialog).getByText('67 Jahre')).toBeInTheDocument()
    expect(within(dialog).getByText(/Pneumologie → Onkologie/i)).toBeInTheDocument()
  })

  it('führt einen Pool-Fall über dieselbe vorausgefüllte Fallbasis', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('12 Fälle aus dem Demo-Batch')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(/Fallnummer eingeben/i), 'P-2026-004218')
    await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
    expect(screen.getByRole('heading', { name: /Fall aus dem KIS übernehmen/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('P-2026-004218')).toBeInTheDocument()
    expect(screen.getByText(/Pool-Fall vorausgefüllt/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getAllByText('Vorhanden')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
    expect(screen.getByText(/Fallbasis · P-2026-004218/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Verlauf bestätigen/i }))
    await user.click(screen.getByRole('button', { name: /Ausgangskodierung bestätigen/i }))
    expect(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /Erste DRG-Iteration starten/i }))
    await user.click(screen.getByRole('button', { name: /Fall wechseln/i }))
    expect(screen.getByText('Fallbasis bereits bestätigt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prüfpfad fortsetzen/i })).toBeInTheDocument()
  })
})
