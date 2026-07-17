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
    expect(screen.getByLabelText('Dokumenttypen im Behandlungsverlauf')).toHaveTextContent('Verlauf')
    expect(screen.getByLabelText('Fachabteilungen im Fall')).toHaveTextContent('Pneumologie')
    expect(screen.getByLabelText('Fachabteilungen im Fall')).toHaveTextContent('Onkologie')
    const documentAssessment = screen.getByLabelText('Dokumentenbewertung zur DRG-Hypothese')
    expect(documentAssessment).toHaveTextContent('Vorkodierung ist der Ausgangspunkt')
    expect(documentAssessment).toHaveTextContent('Relevant · geprüft')
    expect(documentAssessment).toHaveTextContent('Relevant · offen oder fehlend')
    expect(documentAssessment).toHaveTextContent('Derzeit nicht relevant · geprüft')
    expect(documentAssessment).toHaveTextContent('Derzeit nicht relevant · fehlt')
    expect(documentAssessment).toHaveTextContent('Bronchoskopie- und Biopsieberichtvorhanden · Nachvalidierung nötig · 1 Kode')
    expect(documentAssessment).toHaveTextContent('Medikations- und Therapienachweisfehlt · gruppierungsrelevant')
    await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
    expect(screen.getByRole('heading', { name: /Pulmologisch-onkologischer Demofall/i })).toBeInTheDocument()
    const stayAssessment = screen.getByLabelText('Verweildauer zur aktuellen DRG-Hypothese')
    expect(stayAssessment).toHaveTextContent('E71B · Demo')
    expect(stayAssessment).toHaveTextContent('MVD7 Tage')
    expect(stayAssessment).toHaveTextContent('UGVTag 1')
    expect(stayAssessment).toHaveTextContent('OGVTag 18')
    const groupingInfluence = screen.getByLabelText('Einfluss von Diagnosen und Prozeduren auf die aktuelle DRG-Hypothese')
    expect(groupingInfluence).toHaveTextContent('Pfadbestimmend')
    expect(groupingInfluence).toHaveTextContent('Split-relevant')
    expect(groupingInfluence).toHaveTextContent('DRG/ZE möglich')
    expect(groupingInfluence).toHaveTextContent('Aktuell ohne Änderung')
    expect(screen.getByText('Typisch für dieses Haus')).toBeInTheDocument()
    expect(screen.getByText('Schwieriger Fall')).toBeInTheDocument()
    expect(screen.getByText('1 spezifische DKR erkannt')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Falllandkarte' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dokumentenlandkarte/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierkonsil · 0/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wiki-Chat · 0/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Iteration 1/i).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Abschluss/i }))
    expect(screen.getByRole('button', { name: /Abschlussvorschlag/i })).toBeDisabled()
  })

  it('verknüpft Ereignisse, Dokumente und Kodes chronologisch auf der Falllandkarte', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    const departmentRoute = screen.getByLabelText('Fachabteilungen im Fall')
    await user.click(within(departmentRoute).getByRole('button', { name: /Pneumologie.*1 Verlaufsdokument/i }))
    const courseDocumentDialog = screen.getByRole('dialog', { name: 'Pulmologischer Aufnahme- und Verlegungsbericht' })
    expect(within(courseDocumentDialog).getByText(/Verlaufsbericht/i)).toBeInTheDocument()
    await user.click(within(courseDocumentDialog).getByRole('button', { name: 'Schließen' }))
    const mapDialogAfterCourse = screen.getByRole('dialog', { name: 'Dokumentenlandkarte' })
    await user.click(within(mapDialogAfterCourse).getByRole('button', { name: 'Schließen' }))
    expect(screen.getByLabelText('Medizinisch relevante Ereignisse nach Art')).toHaveTextContent('Invasive Diagnostik')
    expect(screen.getByLabelText('Medizinisch relevante Ereignisse nach Art')).toHaveTextContent('Konservative und medikamentöse Therapie')
    await user.click(screen.getByRole('button', { name: /Bronchoskopische Biopsie.*Falllandkarte öffnen/i }))

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

  it('übernimmt eine frühe Hauptdiagnose als Arbeitskode und hält die Pflichtprüfung offen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))

    await user.click(screen.getByRole('button', { name: /Manuell kodieren/i }))
    const editor = screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })
    expect(within(editor).getByLabelText('Freier ICD- oder OPS-Kode')).toHaveValue('C34.9')
    expect(within(editor).getByText(/Prüfentscheidung bleibt offen/i)).toBeInTheDocument()

    await user.clear(within(editor).getByLabelText('Freier ICD- oder OPS-Kode'))
    await user.type(within(editor).getByLabelText('Freier ICD- oder OPS-Kode'), 'C34.1')
    await user.click(within(editor).getByRole('button', { name: /Ändern und alles neu bewerten/i }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ICD / OPS eingeben' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/C34.1 · Bronchialkarzinom/i).length).toBeGreaterThan(0)
    const mainDecision = screen.getByRole('button', { name: /Hauptdiagnose über den Gesamtfall belegen/i })
    expect(mainDecision).toHaveTextContent('Entscheidung nötig')

    await user.click(screen.getByRole('button', { name: /DRG & Entgelte/i }))
    await user.click(screen.getByRole('button', { name: /Für KIS öffnen/i }))
    const transfer = screen.getByRole('dialog', { name: 'Vollständige Kodierung' })
    expect(within(transfer).getByText('C34.1')).toBeInTheDocument()
    expect(within(transfer).getByText('Geändert')).toBeInTheDocument()
    expect(within(transfer).getByText(/Quelle: Direkteingabe zur Prüfung „Hauptdiagnose über den Gesamtfall belegen“ · Iteration 2/i)).toBeInTheDocument()
  })

  it('erlaubt freie ICD- und OPS-Eingaben in jeder Prüfung und bewertet alle Hypothesen neu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))
    await user.click(screen.getByRole('button', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i }))

    await user.click(screen.getByRole('button', { name: /Manuell kodieren/i }))
    const editor = screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })
    expect(within(editor).getByLabelText('Kodetyp für freie Kodierung')).toHaveValue('OPS')
    await user.type(within(editor).getByLabelText('Freier ICD- oder OPS-Kode'), '8-98e.0')
    await user.type(within(editor).getByLabelText('Beschreibung der freien Kodierung'), 'Palliativmedizinische Komplexbehandlung · Demo')
    await user.click(within(editor).getByRole('button', { name: /Ergänzen und alles neu bewerten/i }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ICD / OPS eingeben' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Bewertet Iteration 2')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i })).toHaveTextContent('Wahrscheinlich')

    await user.click(screen.getByRole('button', { name: /DRG & Entgelte/i }))
    await user.click(screen.getByRole('button', { name: /Für KIS öffnen/i }))
    const transfer = screen.getByRole('dialog', { name: 'Vollständige Kodierung' })
    expect(within(transfer).getByText('8-98E.0')).toBeInTheDocument()
    expect(within(transfer).getByText(/Direkteingabe zur Prüfung „Palliativmedizinische Komplexbehandlung ausschließen“ · Iteration 2/i)).toBeInTheDocument()
  })

  it('zeigt Vorkodierung je Entscheidung und validiert sie als neue Iteration', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))
    await user.click(screen.getByRole('button', { name: /Systemische Tumortherapie prüfen/i }))

    const therapyDecision = screen.getByRole('button', { name: /Systemische Tumortherapie prüfen/i }).closest('article')!
    expect(within(therapyDecision).getByText('8-542.11')).toBeInTheDocument()
    expect(within(therapyDecision).getByText(/Vorkodierung · vorläufig geprüft · Iteration 1/i)).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Manuell kodieren/i })).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Mit Kodierwiki erarbeiten/i })).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Kodierkonsil anfordern/i })).toBeInTheDocument()

    await user.click(within(therapyDecision).getByRole('button', { name: /Vorkodierung validieren/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
    expect(screen.getByText(/Vorkodierung validiert: OPS 8-542.11/i)).toBeInTheDocument()
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

    const mainDecisionCard = screen.getByRole('button', { name: /Hauptdiagnose über den Gesamtfall belegen/i }).closest('article')!
    await user.click(within(mainDecisionCard).getByRole('button', { name: /Kodierkonsil anfordern/i }))
    const consultationDialog = screen.getByRole('dialog', { name: 'Kodierkonsil' })
    expect(within(consultationDialog).getByText(/Vollständiger Fallkontext wird geteilt/i)).toBeInTheDocument()
    await user.click(within(consultationDialog).getByRole('button', { name: /Konsil anfordern/i }))
    expect(within(consultationDialog).getByText(/Simulierte Expertenantwort/i)).toBeInTheDocument()

    await user.click(within(consultationDialog).getByRole('button', { name: /Konsilergebnis übernehmen/i }))
    await waitFor(() => expect(within(consultationDialog).getByText(/Konsil abgeschlossen: bestätigt/i)).toBeInTheDocument())
    await user.click(within(consultationDialog).getByRole('button', { name: /Konsilergebnis in Kodierung übernehmen/i }))
    expect(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
  })

  it('nutzt den Wiki-Chat nur als Wissenshilfe und löst keine Fallentscheidung', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Prüfungen/i }))

    await user.click(screen.getByRole('button', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i }))
    expect(screen.getByText('Wiki-Chat zur Einordnung')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mit Kodierwiki erarbeiten/i }))
    await user.type(screen.getByLabelText(/Frage an den Wiki-Chat/i), 'Welche Mindestmerkmale sind hier grundsätzlich wichtig?')
    await user.click(screen.getByRole('button', { name: /Senden/i }))

    expect(screen.getByText(/ersetzt keinen Fallnachweis/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Wiki-Ergebnis in Kodierung übernehmen/i }))
    expect(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).getByRole('button', { name: 'Schließen' }))
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
