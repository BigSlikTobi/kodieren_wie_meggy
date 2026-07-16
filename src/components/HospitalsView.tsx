import { useMemo, useState } from 'react'
import { BookOpen, Building2, Check, ChevronRight, Database, FileSpreadsheet, Image, MapPin, Monitor, Plus, Search, Upload, XCircle } from 'lucide-react'
import type { AppData, KisGuide, SiteYearProfile } from '../types'

interface HospitalsViewProps {
  data: AppData
  onDataChange: (updater: (current: AppData) => AppData) => void
}

type UploadKind = 'Strukturmerkmale' | 'NUB-Vereinbarungen' | 'Historische Daten'

export function HospitalsView({ data, onDataChange }: HospitalsViewProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState(data.hospitals[0]?.id)
  const selectedHospital = data.hospitals.find((hospital) => hospital.id === selectedHospitalId) ?? data.hospitals[0]
  const [selectedProfileKey, setSelectedProfileKey] = useState(() => {
    const profile = selectedHospital?.profiles[0]
    return profile ? `${profile.siteId}-${profile.year}` : ''
  })
  const [uploadKind, setUploadKind] = useState<UploadKind>('Strukturmerkmale')
  const [uploadResult, setUploadResult] = useState<{ file: string; added: number; duplicates: number; missing: number }>()
  const [activeArea, setActiveArea] = useState<'profile' | 'kis'>('profile')
  const [selectedGuideId, setSelectedGuideId] = useState<string>()
  const [guideFormOpen, setGuideFormOpen] = useState(false)

  const selectedProfile = useMemo(() => selectedHospital?.profiles.find((profile) => `${profile.siteId}-${profile.year}` === selectedProfileKey) ?? selectedHospital?.profiles[0], [selectedHospital, selectedProfileKey])

  const selectHospital = (hospitalId: string) => {
    const hospital = data.hospitals.find((item) => item.id === hospitalId)
    const profile = hospital?.profiles[0]
    setSelectedHospitalId(hospitalId)
    setSelectedProfileKey(profile ? `${profile.siteId}-${profile.year}` : '')
    setUploadResult(undefined)
    setSelectedGuideId(undefined)
    setGuideFormOpen(false)
  }

  const handleUpload = (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !selectedHospital || !selectedProfile) return
    const simulated = {
      file: file.name,
      added: uploadKind === 'Historische Daten' ? 1248 : uploadKind === 'Strukturmerkmale' ? 14 : 6,
      duplicates: uploadKind === 'Historische Daten' ? 18 : 1,
      missing: uploadKind === 'NUB-Vereinbarungen' ? 2 : 0,
    }
    setUploadResult(simulated)
    onDataChange((current) => ({
      ...current,
      hospitals: current.hospitals.map((hospital) => hospital.id !== selectedHospital.id ? hospital : {
        ...hospital,
        profiles: hospital.profiles.map((profile) => profile.siteId === selectedProfile.siteId && profile.year === selectedProfile.year ? {
          ...profile,
          updatedAt: new Date().toISOString().slice(0, 10),
          dataQuality: simulated.missing > 0 ? 'prüfen' : 'vollständig',
          uploadedFiles: [...profile.uploadedFiles, file.name],
          historicalCases: uploadKind === 'Historische Daten' ? profile.historicalCases + simulated.added : profile.historicalCases,
        } : profile),
      }),
    }))
  }

  return (
    <div className="page management-page">
      <div className="page-kicker">Krankenhausverwaltung</div>
      <h1>Der Kontext steht vor dem Einzelfall.</h1>
      <p className="lead">Strukturmerkmale, NUBs und historische Daten gelten immer für Standort und Jahr.</p>

      <div className="management-grid">
        <aside className="hospital-list" aria-label="Krankenhäuser">
          {data.hospitals.map((hospital) => (
            <button type="button" key={hospital.id} className={selectedHospital?.id === hospital.id ? 'active' : ''} onClick={() => selectHospital(hospital.id)}>
              <span className="hospital-icon"><Building2 aria-hidden="true" /></span>
              <span><strong>{hospital.name}</strong><small>{hospital.city} · {new Set(hospital.profiles.map((item) => item.siteId)).size} Standorte</small></span>
            </button>
          ))}
        </aside>

        {selectedHospital && selectedProfile && (
          <div className="management-content">
            <div className="section-title-row">
              <div><h2>{selectedHospital.name}</h2><p><MapPin aria-hidden="true" /> {selectedHospital.city}</p></div>
              <label className="compact-select">Profil
                <select value={`${selectedProfile.siteId}-${selectedProfile.year}`} onChange={(event) => { setSelectedProfileKey(event.target.value); setSelectedGuideId(undefined); setGuideFormOpen(false) }}>
                  {selectedHospital.profiles.map((profile) => <option key={`${profile.siteId}-${profile.year}`} value={`${profile.siteId}-${profile.year}`}>{profile.siteName} · {profile.year}</option>)}
                </select>
              </label>
            </div>

            <div className="management-tabs" role="tablist" aria-label="Hausprofil-Bereiche">
              <button type="button" role="tab" aria-selected={activeArea === 'profile'} className={activeArea === 'profile' ? 'active' : ''} onClick={() => setActiveArea('profile')}><Database aria-hidden="true" /> Struktur und Daten</button>
              <button type="button" role="tab" aria-selected={activeArea === 'kis'} className={activeArea === 'kis' ? 'active' : ''} onClick={() => setActiveArea('kis')}><Monitor aria-hidden="true" /> KIS- und Projektwissen</button>
            </div>

            {activeArea === 'profile' ? <>
              <div className="profile-summary">
              <div><span>Strukturmerkmale</span><strong>{selectedProfile.structures.length}</strong></div>
              <div><span>NUB-Vereinbarungen</span><strong>{selectedProfile.nubs.length}</strong></div>
              <div><span>Historische Fälle</span><strong>{selectedProfile.historicalCases.toLocaleString('de-DE')}</strong></div>
              <div><span>Datenstand</span><strong>{selectedProfile.updatedAt}</strong></div>
              </div>

              <div className="profile-columns">
                <ProfileList title="Mögliche Strukturen" items={selectedProfile.structures} />
                <ProfileList title="Vereinbarte NUBs" items={selectedProfile.nubs} empty="Keine NUBs hinterlegt" />
              </div>

              <section className="upload-panel" aria-labelledby="upload-title">
              <div className="section-title-row"><div><div className="page-kicker">Lokaler Demo-Upload</div><h2 id="upload-title">Daten aktualisieren</h2></div><FileSpreadsheet aria-hidden="true" /></div>
              <div className="upload-controls">
                <label>Datentyp
                  <select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as UploadKind)}>
                    <option>Strukturmerkmale</option>
                    <option>NUB-Vereinbarungen</option>
                    <option>Historische Daten</option>
                  </select>
                </label>
                <label className="button primary upload-button"><Upload aria-hidden="true" /> XLS auswählen
                  <input className="sr-only" type="file" accept=".xls,.xlsx,.csv" onChange={(event) => handleUpload(event.target.files)} />
                </label>
              </div>
              {uploadResult && (
                <div className="upload-result" role="status">
                  <div><Check aria-hidden="true" /><span><strong>{uploadResult.file}</strong><small>Schema simuliert geprüft</small></span></div>
                  <dl>
                    <div><dt>Übernommen</dt><dd>{uploadResult.added}</dd></div>
                    <div><dt>Duplikate</dt><dd>{uploadResult.duplicates}</dd></div>
                    <div className={uploadResult.missing ? 'warning' : ''}><dt>Fehlende Angaben</dt><dd>{uploadResult.missing}</dd></div>
                  </dl>
                </div>
              )}
              </section>

              <section aria-labelledby="files-title">
              <div className="section-title-row"><h2 id="files-title">Datenquellen</h2><span className={`status-pill status-${selectedProfile.dataQuality === 'vollständig' ? 'belegt' : 'ungeklärt'}`}>{selectedProfile.dataQuality === 'vollständig' ? 'Vollständig' : 'Prüfen'}</span></div>
              <ul className="source-list">
                {selectedProfile.uploadedFiles.map((file, index) => <li key={`${file}-${index}`}><Database aria-hidden="true" /><span><strong>{file}</strong><small>Standort {selectedProfile.siteName} · {selectedProfile.year}</small></span><Check aria-label="Importiert" /></li>)}
              </ul>
              </section>
            </> : (
              <KisKnowledge
                guides={selectedProfile.kisGuides ?? []}
                selectedGuideId={selectedGuideId}
                formOpen={guideFormOpen}
                onSelect={(id) => { setSelectedGuideId(id); setGuideFormOpen(false) }}
                onOpenForm={() => { setGuideFormOpen(true); setSelectedGuideId(undefined) }}
                onCancelForm={() => setGuideFormOpen(false)}
                onAdd={(guide) => {
                  onDataChange((current) => ({
                    ...current,
                    hospitals: current.hospitals.map((hospital) => hospital.id !== selectedHospital.id ? hospital : {
                      ...hospital,
                      profiles: hospital.profiles.map((profile) => profile.siteId === selectedProfile.siteId && profile.year === selectedProfile.year ? { ...profile, kisGuides: [...(profile.kisGuides ?? []), guide] } : profile),
                    }),
                  }))
                  setGuideFormOpen(false)
                  setSelectedGuideId(guide.id)
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function KisKnowledge({ guides, selectedGuideId, formOpen, onSelect, onOpenForm, onCancelForm, onAdd }: {
  guides: KisGuide[]
  selectedGuideId?: string
  formOpen: boolean
  onSelect: (id: string) => void
  onOpenForm: () => void
  onCancelForm: () => void
  onAdd: (guide: KisGuide) => void
}) {
  const selectedGuide = guides.find((guide) => guide.id === selectedGuideId) ?? (!formOpen ? guides[0] : undefined)
  const [documentKind, setDocumentKind] = useState('Neuer Dokumenttyp')
  const [module, setModule] = useState('Klinische Dokumentation')
  const [path, setPath] = useState('Patientenakte > Dokumente')
  const [searchTerm, setSearchTerm] = useState('')
  const [instruction, setInstruction] = useState('')
  const [notes, setNotes] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])

  const submit = () => {
    if (!documentKind.trim() || !module.trim() || !instruction.trim()) return
    onAdd({
      id: `kis-guide-${Date.now()}`,
      documentKind,
      module,
      navigationPath: path.split('>').map((item) => item.trim()).filter(Boolean),
      searchTerm,
      instruction,
      notes,
      validFrom: new Date().toISOString().slice(0, 10),
      reviewedAt: new Date().toISOString().slice(0, 10),
      owner: 'Projektleitung',
      screenshots: screenshots.map((fileName, index) => ({ id: `kis-screen-${Date.now()}-${index}`, fileName, caption: 'Hochgeladene Demoansicht ohne Patientendaten' })),
    })
  }

  return (
    <section className="kis-knowledge" aria-labelledby="kis-knowledge-title">
      <div className="kis-knowledge-head">
        <div><div className="page-kicker">Tertiäre Orientierung</div><h2 id="kis-knowledge-title">Wo finde ich was im KIS?</h2><p>Hauswissen hilft beim Suchen. Es ist kein medizinischer Nachweis und kein Teil der Patientenakte.</p></div>
        <button className="button primary" type="button" onClick={onOpenForm}><Plus aria-hidden="true" /> Fundort anlegen</button>
      </div>
      <div className="kis-layout">
        <div className="kis-guide-list" aria-label="KIS-Fundorte">
          {guides.map((guide) => (
            <button type="button" key={guide.id} className={selectedGuide?.id === guide.id && !formOpen ? 'active' : ''} onClick={() => onSelect(guide.id)}>
              <span><BookOpen aria-hidden="true" /></span><span><strong>{guide.documentKind}</strong><small>{guide.module} · geprüft {guide.reviewedAt}</small></span><ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
        {formOpen ? (
          <div className="kis-guide-detail kis-guide-form">
            <div><div className="page-kicker">Neue Projektinformation</div><h3>Fundort dokumentieren</h3></div>
            <div className="form-grid two">
              <label>Dokumentart<input value={documentKind} onChange={(event) => setDocumentKind(event.target.value)} /></label>
              <label>KIS-Modul<input value={module} onChange={(event) => setModule(event.target.value)} /></label>
            </div>
            <label>Navigationspfad<input value={path} onChange={(event) => setPath(event.target.value)} /></label>
            <label>Suchbegriff<input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></label>
            <label>Anleitung<textarea rows={3} value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label>
            <label>Hausbesonderheit<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
            <label className="kis-screen-upload"><Image aria-hidden="true" /> Screenshots ohne Patientendaten auswählen
              <input className="sr-only" type="file" multiple accept="image/*" onChange={(event) => setScreenshots(Array.from(event.target.files ?? []).map((file) => file.name))} />
            </label>
            {screenshots.length > 0 && <small>{screenshots.join(' · ')}</small>}
            <div className="button-row end"><button className="button secondary" type="button" onClick={onCancelForm}>Abbrechen</button><button className="button primary" type="button" onClick={submit}>Fundort speichern</button></div>
          </div>
        ) : selectedGuide ? <KisGuideDetail guide={selectedGuide} /> : <div className="empty-state"><Search aria-hidden="true" /><p>Noch kein Fundort hinterlegt.</p></div>}
      </div>
    </section>
  )
}

function KisGuideDetail({ guide }: { guide: KisGuide }) {
  return (
    <div className="kis-guide-detail">
      <div className="kis-detail-title"><span><Monitor aria-hidden="true" /></span><div><small>{guide.module}</small><h3>{guide.documentKind}</h3></div></div>
      <div className="kis-path" aria-label="Navigationspfad">{guide.navigationPath.map((step) => <span key={step}>{step}</span>)}</div>
      <dl className="document-detail-list">
        <div><dt>Suchbegriff</dt><dd>{guide.searchTerm || 'Keiner'}</dd></div>
        <div><dt>Anleitung</dt><dd>{guide.instruction}</dd></div>
        <div><dt>Hausbesonderheit</dt><dd>{guide.notes}</dd></div>
        <div><dt>Gültigkeit</dt><dd>Ab {guide.validFrom} · geprüft {guide.reviewedAt} · {guide.owner}</dd></div>
      </dl>
      <div className="kis-screenshots">
        {guide.screenshots.map((screenshot) => <div key={screenshot.id}><KisSchematic /><span><strong>{screenshot.fileName}</strong><small>{screenshot.caption}</small></span></div>)}
      </div>
    </div>
  )
}

export function KisSchematic() {
  return <div className="kis-schematic" aria-label="Schematische KIS-Demoansicht"><span /><span /><span className="focus" /><span /></div>
}

function ProfileList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? <ul className="tag-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-empty"><XCircle aria-hidden="true" /> {empty}</p>}
    </section>
  )
}
