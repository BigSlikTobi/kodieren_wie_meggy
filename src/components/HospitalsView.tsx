import { useMemo, useState } from 'react'
import { Building2, Check, Database, FileSpreadsheet, MapPin, Upload, XCircle } from 'lucide-react'
import type { AppData, SiteYearProfile } from '../types'

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

  const selectedProfile = useMemo(() => selectedHospital?.profiles.find((profile) => `${profile.siteId}-${profile.year}` === selectedProfileKey) ?? selectedHospital?.profiles[0], [selectedHospital, selectedProfileKey])

  const selectHospital = (hospitalId: string) => {
    const hospital = data.hospitals.find((item) => item.id === hospitalId)
    const profile = hospital?.profiles[0]
    setSelectedHospitalId(hospitalId)
    setSelectedProfileKey(profile ? `${profile.siteId}-${profile.year}` : '')
    setUploadResult(undefined)
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
                <select value={`${selectedProfile.siteId}-${selectedProfile.year}`} onChange={(event) => setSelectedProfileKey(event.target.value)}>
                  {selectedHospital.profiles.map((profile) => <option key={`${profile.siteId}-${profile.year}`} value={`${profile.siteId}-${profile.year}`}>{profile.siteName} · {profile.year}</option>)}
                </select>
              </label>
            </div>

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
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? <ul className="tag-list">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-empty"><XCircle aria-hidden="true" /> {empty}</p>}
    </section>
  )
}
