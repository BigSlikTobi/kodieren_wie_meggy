import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

async function openManualIntake(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
  await user.type(screen.getByLabelText(/Fallnummer/i), 'P-2026-009999')
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.upload(screen.getByLabelText(/Arzt- oder Entlassungsbericht auswählen/i), new File(['bericht'], 'onkologischer-entlassungsbericht.pdf', { type: 'application/pdf' }))
  await user.upload(screen.getByLabelText(/KIS-Kodierexport auswählen/i), new File(['kodierung'], 'aktuelle-kodierung.csv', { type: 'text/csv' }))
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
}

async function confirmIntake(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen und DRG-Hypothese starten/i }))
  await waitFor(() => expect(screen.getAllByText(/Hausmuster/i).length).toBeGreaterThan(0))
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
    expect(screen.getByRole('heading', { name: /Verlauf und Ausgangskodierung abgleichen/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Diagnosen/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Prozeduren/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Verlauf bestätigen/i })).not.toBeInTheDocument()
    const combinedConfirmation = screen.getByRole('button', { name: /Fallbasis bestätigen und DRG-Hypothese starten/i })
    expect(combinedConfirmation).toBeEnabled()
    await user.click(combinedConfirmation)
    await waitFor(() => expect(screen.getAllByText(/Hausmuster/i).length).toBeGreaterThan(0))
  })

  it('lässt Zahlenfelder leer und entfernt manuelle Fallklassifikationen', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
    const ageInput = screen.getByLabelText(/Alter bei Aufnahme/i)
    const stayInput = screen.getByLabelText(/Verweildauer/i)

    await user.clear(ageInput)
    await user.clear(stayInput)
    expect(ageInput).toHaveDisplayValue('')
    expect(stayInput).toHaveDisplayValue('')

    await user.type(ageInput, '72')
    await user.type(stayInput, '8')
    expect(ageInput).toHaveValue(72)
    expect(stayInput).toHaveValue(8)
    expect(screen.queryByLabelText('Versorgungsform')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Demoverlauf')).not.toBeInTheDocument()
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
    await user.type(within(codingCard).getByLabelText('HD-Kode 1'), 'S72.00')
    await user.click(within(codingCard).getByRole('button', { name: /OPS ergänzen/i }))
    await user.type(within(codingCard).getByLabelText('OPS-Kode 1'), '5-790.5')
    expect(within(codingCard).getByText(/Technisch vollständig · 2 Kodes/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.click(screen.getByRole('button', { name: /Fallbasis prüfen/i }))
    const intakeMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    expect(intakeMap).toHaveTextContent('Operation der Schenkelhalsfraktur')
    expect(screen.getByRole('tab', { name: /Diagnosen 1/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Prozeduren 1/i })).toBeInTheDocument()
  })

  it('zeigt Importfehler und übernimmt korrigierte Kodes in strukturierte Grouperzeilen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
    await user.type(screen.getByLabelText(/Fallnummer/i), 'P-2026-009997')
    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    await user.upload(screen.getByLabelText(/Arzt- oder Entlassungsbericht auswählen/i), new File(['bericht'], 'entlassungsbericht.pdf', { type: 'application/pdf' }))

    const codingCard = screen.getByRole('heading', { name: /Aktuelle KIS-Kodierung übernehmen/i }).closest('article')!
    await user.click(within(codingCard).getByRole('button', { name: 'Manuell' }))
    await user.click(within(codingCard).getByText(/Kodes aus Zwischenablage übernehmen/i))
    const importInput = within(codingCard).getByLabelText(/Kodes aus Zwischenablage/i)
    await user.type(importInput, 'I10.00\nOPS 5-790.5 Osteosynthese')
    await user.click(within(codingCard).getByRole('button', { name: /In Grouperzeilen übernehmen/i }))
    expect(within(codingCard).getByText(/Zeile 1: Typ und Kode konnten nicht erkannt werden/i)).toBeInTheDocument()

    await user.clear(importInput)
    await user.type(importInput, 'Hauptdiagnose I10.00 Hypertonie\nProzedur 5-790.5 Osteosynthese')
    await user.click(within(codingCard).getByRole('button', { name: /In Grouperzeilen übernehmen/i }))
    expect(within(codingCard).queryByText(/konnten nicht erkannt werden/i)).not.toBeInTheDocument()
    expect(within(codingCard).getByText(/Technisch vollständig · 2 Kodes/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Beide Ausgangsstände sind vorhanden/i })).toBeInTheDocument()
  })

  it('führt eine Verlaufsänderung in dieselbe gemeinsame Fallbasis zurück', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualIntake(user)
    await user.click(screen.getByRole('button', { name: /Ereignis ergänzen/i }))
    await user.type(screen.getByLabelText(/Was ist passiert/i), 'Zusätzliche Operation')
    await user.click(screen.getByRole('button', { name: /^Übernehmen$/i }))

    expect(screen.getByText(/Ereignis wurde in den Verlauf übernommen/i)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })).toHaveTextContent('Zusätzliche Operation')
    expect(screen.getByRole('button', { name: /Fallbasis bestätigen und DRG-Hypothese starten/i })).toBeEnabled()
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

  it('hält Upload, Dokumenttext und Kodierung im selben Event-Prüfraum', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    const map = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    await user.upload(within(map).getByLabelText(/Dokument zu diesem Event/i), new File(['demo'], 'bronchoskopie-bericht.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: /Hauptdiagnose über den Gesamtfall belegen/i })).toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: /Dokumentenlandkarte/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Ausgelesener Dokumenttext/i)).toHaveTextContent(/Aufnahmegrund und Behandlungsbezug/i)
    expect(screen.getAllByText(/^Event$/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/^Fachfreigabe$/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Kodierwiki fragen/i }))
    const wikiDialog = screen.getByRole('dialog', { name: 'Wiki-Chat' })
    expect(within(wikiDialog).getByText(/Empfehlung und Dokumentation nebeneinander/i)).toBeInTheDocument()
    await user.type(within(wikiDialog).getByLabelText(/Frage an den Wiki-Chat/i), 'Welche OPS-Systematik ist hier relevant?')
    await user.click(within(wikiDialog).getByRole('button', { name: /Senden/i }))
    const returnToCoding = within(wikiDialog).getByRole('button', { name: /Zur Kodierentscheidung/i })
    expect(returnToCoding).toBeDisabled()
    await user.click(within(wikiDialog).getByLabelText(/Hinweis und Dokumentation geprüft/i))
    expect(returnToCoding).toBeEnabled()
  })

  it('ermöglicht nach einem Dokumentupload eine verständliche OPS-Erfassung mit Katalogsuche', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    const map = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    await user.upload(within(map).getByLabelText(/Dokument zu diesem Event/i), new File(['demo'], 'interventionsbericht.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getByRole('button', { name: /Ich kodiere selbst/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Ich kodiere selbst/i }))
    const drawer = screen.getByRole('dialog', { name: /ICD \/ OPS erfassen/i })
    expect(within(drawer).getByText(/Dokumentnachweis · neue Iteration/i)).toBeInTheDocument()
    expect(within(drawer).getByText(/Belegquelle/i)).toBeInTheDocument()
    await user.click(within(drawer).getByLabelText(/Prozedur \(OPS\)/i))

    const search = within(drawer).getByLabelText(/OPS-Code oder Begriff suchen/i)
    expect(within(drawer).getByText(/OPS wird in getrennten Feldern erfasst/i)).toBeInTheDocument()
    expect(within(drawer).getByText('OPS-Leistungsdatum')).toBeInTheDocument()
    expect(within(drawer).getByText('OPS-Uhrzeit')).toBeInTheDocument()
    await user.type(search, 'Bronchoskopie')
    await user.click(within(drawer).getByRole('option', { name: /1-620\.0.*Diagnostische Tracheobronchoskopie/i }))
    expect(within(drawer).getByText(/BfArM · 2026 · Demoindex/i)).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { name: /Kodierung plausibilisieren/i })).toBeInTheDocument()
    expect(screen.getByText(/OPS und Diagnosen/i)).toBeInTheDocument()
    expect(screen.getByText(/MDC und führende Fachabteilung/i)).toBeInTheDocument()
    expect(screen.getByText(/Partition und Behandlungsverlauf/i)).toBeInTheDocument()
    expect(screen.queryByText(/^NUB$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Komplexbehandlungen$/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Plausibilisierung bestätigen/i }))
    await user.click(screen.getByRole('button', { name: /Prüfung abschließen/i }))

    expect(screen.getByRole('heading', { name: /Im KIS übertragen/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /KIS-Übertragungsliste/i })).toBeInTheDocument()
    expect(screen.getAllByText(/C34.9|8-542.11/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Keine Schnittstelle zum Primärsystem/i)).toBeInTheDocument()
    const finalClose = screen.getByRole('button', { name: /Alle Änderungen als im KIS übernommen bestätigen/i })
    expect(finalClose).toBeEnabled()
    await user.click(finalClose)
    expect(screen.getByRole('heading', { name: /Fall sicher abgeschlossen/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Nächsten Fall auswählen/i }))
    expect(screen.getByRole('button', { name: /Abschluss ansehen/i })).toBeInTheDocument()
    expect(screen.getAllByText(/^Abgeschlossen$/i).length).toBeGreaterThan(0)
  })

  it('zeigt sekundäre Grouper-Eingaben weiterhin bei Bedarf', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getAllByRole('button', { name: /^Grouper-Eingaben$/i })[0])
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
    expect(screen.getByRole('tab', { name: /Diagnosen/i })).toBeInTheDocument()
    const combinedConfirmation = screen.getByRole('button', { name: /Fallbasis bestätigen und DRG-Hypothese starten/i })
    expect(combinedConfirmation).toBeEnabled()
    await user.click(combinedConfirmation)
    await waitFor(() => expect(screen.getAllByText(/Hausmuster/i).length).toBeGreaterThan(0))
    await user.click(screen.getByRole('button', { name: /Fall wechseln/i }))
    expect(screen.getByText('Fallbasis bereits bestätigt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Prüfpfad fortsetzen/i })).toBeInTheDocument()
  })
})
