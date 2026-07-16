import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from './App'

async function openManualCockpit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.click(screen.getByRole('button', { name: /Weiter/i }))
  await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))
  await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
}

describe('Kodierpfad prototype', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    localStorage.clear()
  })

  it('führt vom Fallkontext bis zum Cockpit', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: /Welchen Fall bearbeitest Du/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Einzelfall anlegen/i }))
    expect(screen.getByRole('heading', { name: /In drei Schritten/i })).toBeInTheDocument()
    expect(screen.getByText(/Profil aktiv/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Erste Dokumente/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Weiter/i }))
    expect(screen.getByRole('heading', { name: /Bereit für die erste Iteration/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Fall analysieren/i }))
    expect(screen.getByRole('heading', { name: /Stimmt der Behandlungsverlauf/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
    expect(screen.getByRole('heading', { name: /Pulmologisch-onkologischer Demofall/i })).toBeInTheDocument()
    expect(screen.getByText('Typisch für dieses Haus')).toBeInTheDocument()
    expect(screen.getByText('Schwieriger Fall')).toBeInTheDocument()
    expect(screen.getByText('1 spezifische DKR erkannt')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Falllandkarte' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dokumentenlandkarte/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierkonsil · 0/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wiki-Chat · 0/i })).toBeInTheDocument()
    expect(screen.getByText(/Iteration 1/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Abschluss/i }))
    expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeDisabled()
  })

  it('verknüpft Ereignisse, Dokumente und Kodes chronologisch auf der Falllandkarte', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    const eventList = screen.getByRole('list', { name: 'Chronologische Ereignisse' })
    expect(within(eventList).getAllByRole('listitem')).toHaveLength(13)
    await user.click(within(eventList).getByRole('listitem', { name: /Bronchoskopische Biopsie/i }))

    const directDocumentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
    expect(within(directDocumentDialog).getByText(/1-620.0/)).toBeInTheDocument()
    await user.click(within(directDocumentDialog).getByRole('button', { name: 'Schließen' }))

    expect(screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })).toBeInTheDocument()
    expect(screen.getAllByText('04.07.').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1-620.0').length).toBeGreaterThan(0)
    expect(screen.getByText('Jetzt prüfen')).toBeInTheDocument()
    expect(screen.getByText('Vorläufig erledigt')).toBeInTheDocument()

    const chronology = screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })
    await user.click(within(chronology).getAllByRole('button', { name: /Bronchoskopie- und Biopsiebericht/i })[0])
    const documentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
    expect(within(documentDialog).getByText('1-620.0 · Bronchoskopische Diagnostik · illustrative Demoangabe')).toBeInTheDocument()
    await user.click(within(documentDialog).getByRole('button', { name: /Wiki fragen/i }))
    const wikiDialog = screen.getByRole('dialog', { name: 'Wiki-Chat' })
    await user.click(within(wikiDialog).getByRole('button', { name: 'Schließen' }))

    await user.click(within(chronology).getAllByRole('button', { name: /Bronchoskopie- und Biopsiebericht/i })[0])
    await user.click(within(screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })).getByRole('button', { name: /Kodierung stimmt/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText('Validiert · stimmig').length).toBeGreaterThan(0)
  })

  it('erfasst ICD und OPS am Dokument, gruppiert neu und zeigt die KIS-Änderungsliste', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Dokumentenlandkarte/i }))

    const openCodingEditor = async () => {
      let documentDialog = screen.queryByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
      if (!documentDialog) {
        const chronology = screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })
        await user.click(within(chronology).getAllByRole('button', { name: /Bronchoskopie- und Biopsiebericht/i })[0])
        documentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
      }
      await user.click(within(documentDialog).getByRole('button', { name: /Kode erfassen/i }))
      const editor = screen.getByRole('dialog', { name: 'ICD / OPS erfassen' })
      await waitFor(() => expect(within(editor).getByRole('button', { name: /neu bewerten|Grouper läuft/i })).toBeEnabled())
      return editor
    }

    let editor = await openCodingEditor()
    await user.selectOptions(within(editor).getByLabelText('Kodetyp'), 'ND')
    await user.type(within(editor).getByLabelText('ICD- oder OPS-Kode'), 'J15.9')
    await user.type(within(editor).getByLabelText('Beschreibung'), 'Bakterielle Pneumonie · Demo')
    await user.click(within(editor).getByRole('button', { name: /Ergänzen und neu bewerten/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))

    editor = await openCodingEditor()
    await user.click(within(editor).getByRole('radio', { name: 'Ändern' }))
    await user.selectOptions(within(editor).getByLabelText('Bestehenden Kode auswählen'), 'coding-hd-c349')
    await user.clear(within(editor).getByLabelText('ICD- oder OPS-Kode'))
    await user.type(within(editor).getByLabelText('ICD- oder OPS-Kode'), 'C34.1')
    await user.click(within(editor).getByRole('button', { name: /Ändern und neu bewerten/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 3/i).length).toBeGreaterThan(0))

    editor = await openCodingEditor()
    await user.click(within(editor).getByRole('radio', { name: 'Löschen' }))
    await user.selectOptions(within(editor).getByLabelText('Bestehenden Kode auswählen'), 'coding-nd-j189')
    await user.click(within(editor).getByRole('button', { name: /Löschen und neu bewerten/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 4/i).length).toBeGreaterThan(0))

    const remainingDocumentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
    await user.click(within(remainingDocumentDialog).getByRole('button', { name: 'Schließen' }))
    const mapDialog = screen.getByRole('dialog', { name: 'Dokumentenlandkarte' })
    await user.click(within(mapDialog).getByRole('button', { name: 'Schließen' }))
    await user.click(screen.getByRole('button', { name: /DRG & Entgelte/i }))
    await user.click(screen.getByRole('button', { name: /Für KIS öffnen/i }))

    const transfer = screen.getByRole('dialog', { name: 'Vollständige Kodierung' })
    expect(within(transfer).getByText('J15.9')).toBeInTheDocument()
    expect(within(transfer).getByText('C34.1')).toBeInTheDocument()
    expect(within(transfer).getByText('Ergänzt')).toBeInTheDocument()
    expect(within(transfer).getByText('Geändert')).toBeInTheDocument()
    expect(within(transfer).getByText('Gelöscht')).toBeInTheDocument()
    expect(within(transfer).getByText(/Vorher: C34.9/i)).toBeInTheDocument()
    expect(within(transfer).getByText(/Quelle: Bronchoskopie- und Biopsiebericht · Iteration 4/i)).toBeInTheDocument()
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
    await openManualCockpit(user)

    const stored = JSON.parse(localStorage.getItem('kodierpfad-demo-v4') ?? '{}') as { cases?: unknown[] }
    expect(stored.cases).toHaveLength(1)
  })

  it('leitet eine fachfremde gruppierungsrelevante Frage ins Kodierkonsil', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))

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
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))

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
    await openManualCockpit(user)

    await user.selectOptions(screen.getByLabelText('Krankenhaustypik manuell ändern'), 'untypisch')
    await user.selectOptions(screen.getByLabelText('Fallschwierigkeit manuell ändern'), 'einfach')

    expect(screen.getByText('Untypisch für dieses Haus')).toBeInTheDocument()
    expect(screen.getByText('Einfacher Fall')).toBeInTheDocument()
    expect(screen.getAllByText('Manuell').length).toBe(2)
  })

  it('erzeugt Iterationen und entsperrt den Abschluss nach Pflichtnachweisen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))

    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'epikrise.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))

    await user.click(screen.getByRole('button', { name: /Systemische Tumortherapie prüfen/i }))
    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'therapie.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: /Abschluss/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: /Abschlussvorschlag/i }))
    expect(screen.getByRole('heading', { name: /Fallabschluss/i })).toBeInTheDocument()
  })

  it('verwaltet hausbezogene KIS-Fundorte getrennt von Falldokumenten', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /^Häuser$/i }))
    await user.click(screen.getByRole('tab', { name: /KIS- und Projektwissen/i }))

    expect(screen.getByRole('heading', { name: /Wo finde ich was im KIS/i })).toBeInTheDocument()
    expect(screen.getByText(/kein medizinischer Nachweis/i)).toBeInTheDocument()
    expect(screen.getByText('Patientenakte')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Fundort anlegen/i }))
    await user.clear(screen.getByLabelText('Dokumentart'))
    await user.type(screen.getByLabelText('Dokumentart'), 'Pflegebericht')
    await user.clear(screen.getByLabelText('Anleitung'))
    await user.type(screen.getByLabelText('Anleitung'), 'Im Pflegeportal nach Zeitraum filtern.')
    await user.click(screen.getByRole('button', { name: /Fundort speichern/i }))

    expect(screen.getByRole('heading', { name: 'Pflegebericht' })).toBeInTheDocument()
  })

  it('zeigt Ergebnisdimensionen und einen beleggebundenen MBEG-Entwurf', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Dokumentenlandkarte/i }))

    const chronology = screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })
    await user.click(within(chronology).getAllByRole('button', { name: /Bronchoskopie- und Biopsiebericht/i })[0])
    const documentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
    expect(within(documentDialog).getByText('ZE / NUB')).toBeInTheDocument()
    expect(within(documentDialog).getByText('MBEG')).toBeInTheDocument()
    await user.click(within(documentDialog).getByText(/Wo finde ich das im KIS/i))
    expect(within(documentDialog).getByText('Befundportal')).toBeInTheDocument()
    await user.click(within(documentDialog).getByRole('button', { name: 'Schließen' }))

    await user.click(screen.getByRole('button', { name: /Schließen/i }))
    await user.click(screen.getByRole('button', { name: /Entgelte/i }))
    await user.click(screen.getByRole('button', { name: /Medizinische Begründung vollstationär/i }))
    const mbegDialog = screen.getByRole('dialog', { name: 'Medizinische Begründung' })
    expect(within(mbegDialog).getByText(/Keine automatische Übermittlung/i)).toBeInTheDocument()
    expect(within(mbegDialog).getByText(/invasiven bronchoskopischen Diagnostik/i)).toBeInTheDocument()
    await user.click(within(mbegDialog).getByRole('button', { name: /Fachlich geprüft markieren/i }))
    expect(within(mbegDialog).getByText('Fachlich geprüft')).toBeInTheDocument()
  })

  it('findet einen Batch-Fall über die pseudonymisierte Fallnummer und bestätigt seine Fallbasis', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText(/Fallnummer eingeben/i), 'P-2026-004233')
    expect(screen.getByText('1 Treffer')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Fallbasis öffnen/i }))

    expect(screen.getByText(/Fallbasis · P-2026-004233/i)).toBeInTheDocument()
    expect(screen.getByText('Krankenhaus-Batch')).toBeInTheDocument()
    expect(screen.getByText(/Intensivmedizinische Behandlung/i)).toBeInTheDocument()
    await user.upload(screen.getByLabelText(/Screenshot verwenden/i), new File(['demo'], 'stationsverlauf.png', { type: 'image/png' }))
    expect(screen.getByText('stationsverlauf.png')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
    expect(screen.getByText(/Fall P-2026-004233/i)).toBeInTheDocument()
  })

  it('übernimmt technische Grouper-Werte ohne unnötigen Dokumentenupload', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText(/Fallnummer eingeben/i), 'P-2026-004233')
    await user.click(screen.getByRole('button', { name: /Fallbasis öffnen/i }))
    await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
    await user.click(screen.getByRole('button', { name: /Entgelte/i }))

    const technicalSection = screen.getByRole('heading', { name: /Technische Fallparameter/i }).closest('section')!
    expect(technicalSection).toBeInTheDocument()
    expect(screen.getAllByText(/96 Stunden/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Kein Dokumentenupload nötig/i)).toBeInTheDocument()
    expect(within(technicalSection).queryByLabelText(/Nachweis hochladen/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Wert übernehmen/i }))
    await waitFor(() => expect(screen.getByText(/Iteration 2/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Iterationen/i }))
    expect(screen.getByRole('dialog', { name: /Grouper-Iterationen/i })).toHaveTextContent('Beatmungszeit aus Intervallen bestätigt')
  })
})
