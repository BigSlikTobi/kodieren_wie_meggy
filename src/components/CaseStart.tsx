import { useMemo, useState } from 'react'
import { ArrowRight, Check, FilePlus2, Hospital, Info, Upload } from 'lucide-react'
import type { HospitalProfile, NewCaseInput } from '../types'
import { CaseJourney } from './CaseJourney'

interface CaseStartProps {
  hospitals: HospitalProfile[]
  onStart: (input: NewCaseInput) => void
}

export function CaseStart({ hospitals, onStart }: CaseStartProps) {
  const firstHospital = hospitals[0]
  const [step, setStep] = useState(1)
  const [hospitalId, setHospitalId] = useState(firstHospital?.id ?? '')
  const hospital = hospitals.find((item) => item.id === hospitalId)
  const uniqueSites = useMemo(
    () => Array.from(new Map((hospital?.profiles ?? []).map((profile) => [profile.siteId, profile])).values()),
    [hospital],
  )
  const [siteId, setSiteId] = useState(firstHospital?.profiles[0]?.siteId ?? '')
  const availableYears = useMemo(
    () => (hospital?.profiles ?? []).filter((profile) => profile.siteId === siteId).map((profile) => profile.year),
    [hospital, siteId],
  )
  const [year, setYear] = useState(firstHospital?.profiles[0]?.year ?? 2026)
  const [age, setAge] = useState(67)
  const [stayDays, setStayDays] = useState(22)
  const [careForm, setCareForm] = useState<NewCaseInput['careForm']>('Normalstation')
  const [scenario, setScenario] = useState<NewCaseInput['scenario']>('pulmo-onko')
  const [files, setFiles] = useState<string[]>(['aktuelle_kodierung.txt', 'arztbrief.pdf'])
  const [touched, setTouched] = useState(false)

  const profile = hospital?.profiles.find((item) => item.siteId === siteId && item.year === year)
  const validBase = Boolean(hospitalId && siteId && year && age >= 0 && stayDays > 0 && profile)
  const validFiles = files.length > 0

  const changeHospital = (id: string) => {
    const nextHospital = hospitals.find((item) => item.id === id)
    const nextProfile = nextHospital?.profiles[0]
    setHospitalId(id)
    setSiteId(nextProfile?.siteId ?? '')
    setYear(nextProfile?.year ?? 2026)
  }

  const changeSite = (id: string) => {
    const nextProfile = hospital?.profiles.find((item) => item.siteId === id)
    setSiteId(id)
    setYear(nextProfile?.year ?? 2026)
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    setFiles((current) => Array.from(new Set([...current, ...Array.from(fileList).map((file) => file.name)])))
  }

  const next = () => {
    setTouched(true)
    if (step === 1 && validBase) setStep(2)
    if (step === 2 && validFiles) setStep(3)
  }

  const submit = () => {
    if (!validBase || !validFiles) return
    onStart({ hospitalId, siteId, year, age, stayDays, careForm, scenario, files })
  }

  return (
    <div className="page narrow-page">
      <CaseJourney active="kis" />
      <div className="page-kicker">Neuer Fall · Schritt {step} von 3</div>
      <h1>Fall aus dem KIS übernehmen.</h1>
      <p className="lead">KIS-Fall öffnen, Ausgangsunterlagen übernehmen und anschließend nur die gemeinsame Fallbasis bestätigen.</p>

      <ol className="stepper" aria-label="Fallstart Fortschritt">
        {['Falldaten', 'Quellen', 'Übernahme'].map((label, index) => (
          <li key={label} className={step >= index + 1 ? 'active' : ''} aria-current={step === index + 1 ? 'step' : undefined}>
            <span>{step > index + 1 ? <Check aria-hidden="true" /> : index + 1}</span>{label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="panel form-panel" aria-labelledby="context-title">
          <div className="section-heading">
            <Hospital aria-hidden="true" />
            <div><h2 id="context-title">Fallkontext</h2><p>Bestimmt Strukturmerkmale, NUBs und Regelversion.</p></div>
          </div>
          <div className="form-grid">
            <label>Krankenhaus
              <select value={hospitalId} onChange={(event) => changeHospital(event.target.value)}>
                {hospitals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>Standort
              <select value={siteId} onChange={(event) => changeSite(event.target.value)}>
                {uniqueSites.map((item) => <option key={item.siteId} value={item.siteId}>{item.siteName}</option>)}
              </select>
            </label>
            <label>Behandlungsjahr
              <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {availableYears.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Alter bei Aufnahme
              <input type="number" min="0" max="130" value={age} onChange={(event) => setAge(Number(event.target.value))} />
            </label>
            <label>Verweildauer in Tagen
              <input type="number" min="1" max="365" value={stayDays} onChange={(event) => setStayDays(Number(event.target.value))} />
            </label>
            <label>Versorgungsform
              <select value={careForm} onChange={(event) => setCareForm(event.target.value as NewCaseInput['careForm'])}>
                <option>Normalstation</option>
                <option>Normal- und Intensivstation</option>
              </select>
            </label>
          </div>
          <fieldset className="choice-group">
            <legend>Demopfad</legend>
            <label className={scenario === 'pulmo-onko' ? 'choice active' : 'choice'}>
              <input type="radio" name="scenario" value="pulmo-onko" checked={scenario === 'pulmo-onko'} onChange={() => setScenario('pulmo-onko')} />
              <span><strong>Komplexer Verlauf</strong><small>Pneumologie, Biopsie, Onkologie, systemische Therapie</small></span>
            </label>
            <label className={scenario === 'standard' ? 'choice active' : 'choice'}>
              <input type="radio" name="scenario" value="standard" checked={scenario === 'standard'} onChange={() => setScenario('standard')} />
              <span><strong>Standardnaher Verlauf</strong><small>Eine Fachabteilung, konservative Behandlung</small></span>
            </label>
          </fieldset>
          {profile ? (
            <div className="inline-note"><Info aria-hidden="true" /><span><strong>Profil aktiv:</strong> {profile.structures.length} Strukturmerkmale, {profile.nubs.length} NUB-Vereinbarungen, Datenstand {profile.updatedAt}.</span></div>
          ) : (
            touched && <p className="error-text">Für Standort und Jahr fehlt ein Krankenhausprofil.</p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="panel form-panel" aria-labelledby="documents-title">
          <div className="section-heading">
            <FilePlus2 aria-hidden="true" />
            <div><h2 id="documents-title">Ausgangsunterlagen</h2><p>Aktuelle Kodierung und mindestens ein Entlassungsbericht bilden den Startpunkt.</p></div>
          </div>
          <label className="upload-zone">
            <Upload aria-hidden="true" />
            <strong>Dateien auswählen</strong>
            <span>Durchsuchbare PDFs, TXT, Bilder oder strukturierter Export</span>
            <input className="sr-only" type="file" multiple accept=".pdf,.txt,.png,.jpg,.jpeg,.xls,.xlsx,.csv" onChange={(event) => handleFiles(event.target.files)} />
          </label>
          <ul className="file-list">
            {files.map((file) => (
              <li key={file}><FilePlus2 aria-hidden="true" /><span>{file}</span><button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}>Entfernen</button></li>
            ))}
          </ul>
          {touched && !validFiles && <p className="error-text">Mindestens ein Dokument oder Export wird benötigt.</p>}
        </section>
      )}

      {step === 3 && (
        <section className="panel review-panel" aria-labelledby="review-title">
          <div className="section-heading">
            <Check aria-hidden="true" />
            <div><h2 id="review-title">Bereit, die Fallbasis zu prüfen</h2><p>Behandlungsereignisse und Ausgangskodierung werden im nächsten Schritt getrennt bestätigt.</p></div>
          </div>
          <dl className="review-list">
            <div><dt>Kontext</dt><dd>{hospital?.name}, {profile?.siteName}, {year}</dd></div>
            <div><dt>Fall</dt><dd>{age} Jahre, {stayDays} Tage, {careForm}</dd></div>
            <div><dt>Dokumente</dt><dd>{files.length} Dateien</dd></div>
            <div><dt>Regelpaket</dt><dd>Demo-Regelpaket {year}, lokal aktiviert</dd></div>
          </dl>
          <div className="inline-note"><Info aria-hidden="true" /><span>Alle medizinischen Kodes und Grouper-Ergebnisse sind illustrative Demodaten.</span></div>
        </section>
      )}

      <div className="button-row between">
        <button className="button secondary" type="button" disabled={step === 1} onClick={() => { setTouched(false); setStep((current) => current - 1) }}>Zurück</button>
        {step < 3 ? (
          <button className="button primary" type="button" onClick={next}>Weiter <ArrowRight aria-hidden="true" /></button>
        ) : (
          <button className="button primary" type="button" onClick={submit}>Fallbasis vorbereiten <ArrowRight aria-hidden="true" /></button>
        )}
      </div>
    </div>
  )
}
