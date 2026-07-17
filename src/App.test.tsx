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

async function openGuidedAreas(user: ReturnType<typeof userEvent.setup>) {
  const entry = screen.queryByRole('button', { name: /Weitere Fallbereiche/i })
  if (entry) await user.click(entry)
}

async function focusDecision(user: ReturnType<typeof userEvent.setup>, title: RegExp) {
  if (screen.queryByRole('heading', { name: title })) return
  const nextAction = screen.queryByRole('button', { name: /Nächster belastbarer Schritt/i })
  if (nextAction) await user.click(nextAction)
  if (screen.queryByRole('heading', { name: title })) return
  await user.click(screen.getByText(/weitere offene Entscheidung/i))
  await user.click(screen.getByRole('button', { name: title }))
}

describe('Kodierpfad prototype', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true })
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
    const intakeMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    expect(intakeMap).toHaveTextContent('Fallbasis · automatisch zusammengeführt')
    expect(intakeMap).toHaveTextContent(/zentrale Behandlungsereignisse/i)
    expect(intakeMap).toHaveTextContent('Prüfstatusnoch offen')
    expect(within(intakeMap).getByLabelText('Fachabteilungen im Verlauf')).toHaveTextContent('Pneumologie')
    expect(within(intakeMap).getByLabelText('Fachabteilungen im Verlauf')).toHaveTextContent('Onkologie')
    expect(intakeMap).toHaveTextContent('Passen Fachabteilungen, Zeitfolge und zentrale Behandlungen?')
    expect(within(intakeMap).queryByRole('button', { name: /Nächster belastbarer Schritt/i })).not.toBeInTheDocument()
    expect(within(intakeMap).queryByLabelText(/Medikations- und Therapienachweis/i)).not.toBeInTheDocument()
    expect(intakeMap).toHaveTextContent('Dokument- und Kodeebene bewusst ausgeblendet')
    await user.click(screen.getByRole('button', { name: /Fallbasis bestätigen/i }))
    expect(screen.getByRole('heading', { name: /Pulmologisch-onkologischer Demofall/i })).toBeInTheDocument()
    const caseMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    expect(caseMap).toHaveTextContent('E71B · Demo')
    expect(caseMap).toHaveTextContent(/Verweildauer\d+ Tage/)
    expect(caseMap).toHaveTextContent('MVD 7 · OGV 18')
    expect(within(caseMap).getByRole('button', { name: /Nächster belastbarer Schritt.*Hauptdiagnose/i })).toBeInTheDocument()
    expect(within(caseMap).getByLabelText('Fachabteilungen im Verlauf')).toHaveTextContent('Pneumologie')
    expect(within(caseMap).getByLabelText('Fachabteilungen im Verlauf')).toHaveTextContent('Onkologie')
    expect(within(caseMap).getAllByRole('button', { name: /Medikations- und Therapienachweis: Nachweis fehlt/i })).toHaveLength(1)
    expect(within(caseMap).getAllByText(/\d+ ICD · \d+ OPS/i).length).toBeGreaterThan(0)
    expect(within(caseMap).getByLabelText(/Dokument zur Prüfung hochladen/i)).toBeInTheDocument()
    expect(within(caseMap).getByText('Dokument zu diesem Event')).toBeInTheDocument()
    expect(within(caseMap).getByText('Verlaufsdokument')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dokumente und Kodes öffnen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierkonsil · 0/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierwiki · 0/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Iteration 1/i).length).toBeGreaterThan(0)
    await user.click(within(caseMap).getByRole('button', { name: /Nächster belastbarer Schritt/i }))
    expect(screen.getByRole('heading', { name: /Hauptdiagnose über den Gesamtfall belegen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierwiki fragen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kodierkonsil anfordern/i })).toBeInTheDocument()
  })

  it('verknüpft Ereignisse, Dokumente und Kodes chronologisch auf der Falllandkarte', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    const caseMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    expect(within(caseMap).getByLabelText('Fachabteilungen im Verlauf')).toHaveTextContent('Pneumologie')
    expect(within(caseMap).getByRole('button', { name: /Bronchoskopische Biopsie.*jetzt prüfen/i })).toBeInTheDocument()
    expect(within(caseMap).getByRole('button', { name: /Erweiterte Gewebeentnahme.*gleicher Nachweis/i })).toBeInTheDocument()
    expect(within(caseMap).getAllByRole('button', { name: /Medikations- und Therapienachweis: Nachweis fehlt/i })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /Dokumente und Kodes öffnen/i }))
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

  it('ordnet einen Upload direkt dem fokussierten Event zu und startet die nächste Prüfung', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)

    const caseMap = screen.getByRole('region', { name: 'Gemeinsame Fallkarte' })
    const eventUpload = within(caseMap).getByLabelText(/Dokument zu diesem Event/i)
    await user.upload(eventUpload, new File(['demo'], 'ereignisbericht.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Dokumentenlandkarte' })).toBeInTheDocument())
    expect(screen.getByText(/LLM-Zuordnung vorbereitet/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0)
  })

  it('erfasst ICD und OPS am Dokument, gruppiert neu und zeigt die KIS-Änderungsliste', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await user.click(screen.getByRole('button', { name: /Dokumente und Kodes öffnen/i }))

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
    await openGuidedAreas(user)
    await user.click(screen.getByRole('button', { name: /Kodierergebnis/i }))
    await user.click(screen.getByRole('button', { name: /Kodierergebnis öffnen/i }))

    const transfer = screen.getByRole('dialog', { name: 'Kodierergebnis & KIS-Übernahme' })
    expect(within(transfer).getByRole('button', { name: /Änderungen fürs KIS/i })).toHaveAttribute('aria-pressed', 'true')
    expect(within(transfer).getByText('J15.9')).toBeInTheDocument()
    expect(within(transfer).getByText('C34.1')).toBeInTheDocument()
    expect(within(transfer).getByText('Ergänzt')).toBeInTheDocument()
    expect(within(transfer).getByText('Geändert')).toBeInTheDocument()
    expect(within(transfer).getByText('Gelöscht')).toBeInTheDocument()
    expect(within(transfer).getByText(/Vorher: C34.9/i)).toBeInTheDocument()
    expect(within(transfer).getByText(/Quelle: Bronchoskopie- und Biopsiebericht · Iteration 4/i)).toBeInTheDocument()
  }, 15_000)

  it('übernimmt eine frühe Hauptdiagnose als Arbeitskode und hält die Pflichtprüfung offen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await focusDecision(user, /Hauptdiagnose über den Gesamtfall belegen/i)

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
    expect(screen.getByRole('heading', { name: /Hauptdiagnose über den Gesamtfall belegen/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await openGuidedAreas(user)
    await user.click(screen.getByRole('button', { name: /Kodierergebnis/i }))
    await user.click(screen.getByRole('button', { name: /Kodierergebnis öffnen/i }))
    const transfer = screen.getByRole('dialog', { name: 'Kodierergebnis & KIS-Übernahme' })
    expect(within(transfer).getByText('C34.1')).toBeInTheDocument()
    expect(within(transfer).getByText('Geändert')).toBeInTheDocument()
    expect(within(transfer).getByText(/Quelle: Direkteingabe zur Prüfung „Hauptdiagnose über den Gesamtfall belegen“ · Iteration 2/i)).toBeInTheDocument()
  })

  it('erlaubt freie ICD- und OPS-Eingaben in jeder Prüfung und bewertet alle Hypothesen neu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await focusDecision(user, /Palliativmedizinische Komplexbehandlung ausschließen/i)

    await user.click(screen.getByRole('button', { name: /Manuell kodieren/i }))
    const editor = screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })
    expect(within(editor).getByLabelText('Kodetyp für freie Kodierung')).toHaveValue('OPS')
    await user.type(within(editor).getByLabelText('Freier ICD- oder OPS-Kode'), '8-98e.0')
    await user.type(within(editor).getByLabelText('Beschreibung der freien Kodierung'), 'Palliativmedizinische Komplexbehandlung · Demo')
    await user.click(within(editor).getByRole('button', { name: /Ergänzen und alles neu bewerten/i }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'ICD / OPS eingeben' })).not.toBeInTheDocument())
    expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await openGuidedAreas(user)
    await user.click(screen.getByRole('button', { name: /Kodierergebnis/i }))
    await user.click(screen.getByRole('button', { name: /Kodierergebnis öffnen/i }))
    const transfer = screen.getByRole('dialog', { name: 'Kodierergebnis & KIS-Übernahme' })
    expect(within(transfer).getByText('8-98E.0')).toBeInTheDocument()
    expect(within(transfer).getByText(/Direkteingabe zur Prüfung „Palliativmedizinische Komplexbehandlung ausschließen“ · Iteration 2/i)).toBeInTheDocument()
  })

  it('zeigt Vorkodierung je Entscheidung und validiert sie als neue Iteration', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await focusDecision(user, /Systemische Tumortherapie prüfen/i)

    const therapyDecision = screen.getByRole('heading', { name: /Systemische Tumortherapie prüfen/i }).closest('article')!
    expect(within(therapyDecision).getByText('8-542.11')).toBeInTheDocument()
    expect(within(therapyDecision).getByText(/Vorkodierung · vorläufig geprüft · Iteration 1/i)).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Manuell kodieren/i })).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Kodierwiki fragen/i })).toBeInTheDocument()
    expect(within(therapyDecision).getByRole('button', { name: /Kodierkonsil anfordern/i })).toBeInTheDocument()

    await user.click(within(therapyDecision).getByRole('button', { name: /Vorkodierung validieren/i }))
    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
    expect(screen.queryByRole('heading', { name: /Systemische Tumortherapie prüfen/i })).not.toBeInTheDocument()
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
    await focusDecision(user, /Hauptdiagnose über den Gesamtfall belegen/i)

    expect(screen.getByText('Geführte Eigenprüfung')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Fachkenntnis für Hauptdiagnose/i), 'fremd')
    expect(screen.getByText('Menschliches Kodierkonsil')).toBeInTheDocument()

    const mainDecisionCard = screen.getByRole('heading', { name: /Hauptdiagnose über den Gesamtfall belegen/i }).closest('article')!
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
    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))
  })

  it('nutzt den Wiki-Chat nur als Wissenshilfe und löst keine Fallentscheidung', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await focusDecision(user, /Palliativmedizinische Komplexbehandlung ausschließen/i)
    await user.click(screen.getByRole('button', { name: /Kodierwiki fragen/i }))
    await user.type(screen.getByLabelText(/Frage an den Wiki-Chat/i), 'Welche Mindestmerkmale sind hier grundsätzlich wichtig?')
    await user.click(screen.getByRole('button', { name: /Senden/i }))

    expect(screen.getByText(/ersetzt keinen Fallnachweis/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Wiki-Ergebnis in Kodierung übernehmen/i }))
    expect(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog', { name: 'ICD / OPS eingeben' })).getByRole('button', { name: 'Schließen' }))
    expect(screen.getByRole('heading', { name: /Palliativmedizinische Komplexbehandlung ausschließen/i })).toBeInTheDocument()
  })

  it('erlaubt die manuelle Korrektur von Typik und Schwierigkeit', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openManualCockpit(user)
    await openGuidedAreas(user)

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
    await focusDecision(user, /Hauptdiagnose über den Gesamtfall belegen/i)

    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'epikrise.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await waitFor(() => expect(screen.getAllByText(/Iteration 2/i).length).toBeGreaterThan(0))

    await focusDecision(user, /Systemische Tumortherapie prüfen/i)
    await user.upload(screen.getByLabelText(/Nachweis hochladen/i), new File(['demo'], 'therapie.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: /Zur Fallkarte/i }))
    await openGuidedAreas(user)
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
    await user.click(screen.getByRole('button', { name: /Dokumente und Kodes öffnen/i }))

    const chronology = screen.getByRole('list', { name: /Behandlungskette mit Dokumenten und Kodierung/i })
    await user.click(within(chronology).getAllByRole('button', { name: /Bronchoskopie- und Biopsiebericht/i })[0])
    const documentDialog = screen.getByRole('dialog', { name: 'Bronchoskopie- und Biopsiebericht' })
    expect(within(documentDialog).getByText('ZE / NUB')).toBeInTheDocument()
    expect(within(documentDialog).getByText('MBEG')).toBeInTheDocument()
    await user.click(within(documentDialog).getByText(/Wo finde ich das im KIS/i))
    expect(within(documentDialog).getByText('Befundportal')).toBeInTheDocument()
    await user.click(within(documentDialog).getByRole('button', { name: 'Schließen' }))

    await user.click(screen.getByRole('button', { name: /Schließen/i }))
    await openGuidedAreas(user)
    await user.click(screen.getByRole('button', { name: /Kodierergebnis/i }))
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
    await openGuidedAreas(user)
    await user.click(screen.getByRole('button', { name: /Kodierergebnis/i }))

    const technicalSection = screen.getByRole('heading', { name: /Technische Fallparameter/i }).closest('section')!
    expect(technicalSection).toBeInTheDocument()
    expect(screen.getAllByText(/96 Stunden/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Kein Dokumentenupload nötig/i)).toBeInTheDocument()
    expect(within(technicalSection).queryByLabelText(/Nachweis hochladen/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Wert übernehmen/i }))
    await waitFor(() => expect(technicalSection).toHaveTextContent('bestätigt'))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('kodierpfad-demo-v4') ?? '{}') as { cases?: Array<{ grouperRuns?: unknown[] }> }
      expect(stored.cases?.[0]?.grouperRuns).toHaveLength(2)
    })
    await user.click(screen.getByRole('button', { name: /Iterationen/i }))
    const iterations = screen.getByRole('dialog', { name: /Grouper-Iterationen/i })
    expect(iterations).toHaveTextContent('Beatmungszeit aus Intervallen bestätigt')
  })
})
