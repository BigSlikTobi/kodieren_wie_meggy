import { useEffect, useState } from 'react'
import { initialData } from './data/demo'
import type { AppData } from './types'

const STORAGE_KEY = 'kodierpfad-demo-v4'

function cloneInitialData(): AppData {
  return JSON.parse(JSON.stringify(initialData)) as AppData
}

function normalizeData(value: AppData): AppData {
  const fresh = cloneInitialData()
  return {
    ...value,
    hospitals: value.hospitals.map((hospital) => ({
      ...hospital,
      profiles: hospital.profiles.map((profile) => {
        const defaultProfile = fresh.hospitals
          .find((item) => item.id === hospital.id)
          ?.profiles.find((item) => item.siteId === profile.siteId && item.year === profile.year)
        return { ...profile, kisGuides: profile.kisGuides ?? defaultProfile?.kisGuides ?? [] }
      }),
    })),
    cases: value.cases.map((codingCase) => ({
      ...codingCase,
      documentMap: (codingCase.documentMap ?? []).map((document) => ({
        ...document,
        outcomeDimensions: document.outcomeDimensions ?? {
          drg: document.relevance === 'neutral' ? 'neutral' : 'offen',
          ops: 'offen',
          entgelte: 'offen',
          kodierung: document.reviewLevel === 'validiert' ? 'geprüft' : 'offen',
          mbeg: 'neutral',
        },
      })),
      medicalJustification: codingCase.medicalJustification ?? {
        status: codingCase.scenario === 'pulmo-onko' ? 'entwurf-belegbar' : 'fachprüfung',
        categories: codingCase.scenario === 'pulmo-onko' ? ['Invasive Diagnostik', 'Unmittelbare Weiterbehandlung', 'Hohe Therapieintensität'] : ['Behandlungsintensität', 'Klinische Überwachung'],
        evidenceDocumentIds: codingCase.scenario === 'pulmo-onko' ? ['map-pulmo-report', 'map-bronchoscopy', 'map-oncology-report'] : ['map-discharge', 'map-imaging'],
        missingEvidence: codingCase.scenario === 'pulmo-onko' ? ['Applikationsnachweis für die konkrete systemische Therapie'] : ['Konkrete stationäre Überwachungs- oder Therapieintensität'],
        draft: codingCase.scenario === 'pulmo-onko'
          ? 'Die vollstationäre Behandlung war aufgrund der zeitnah erforderlichen invasiven bronchoskopischen Diagnostik mit Biopsie und der sich unmittelbar anschließenden fachübergreifenden onkologischen Weiterbehandlung erforderlich. Der dokumentierte Ablauf mit Diagnostik, histologischer Sicherung und Einleitung der systemischen Therapie erforderte eine durchgehende stationäre Koordination und Überwachung. Eine ambulante oder teilstationäre Durchführung hätte diesen eng gekoppelten Behandlungsablauf im dokumentierten Zeitraum nicht gleichwertig abgebildet.'
          : 'Der dokumentierte pneumologische Verlauf und die Bildgebung belegen die Erkrankung. Für eine belastbare Abgrenzung gegenüber einer ambulanten Behandlung muss die konkrete stationäre Behandlungs- oder Überwachungsintensität noch fachlich ergänzt werden.',
        reviewed: false,
      },
    })),
  }
}

export function usePersistentData() {
  const [data, setData] = useState<AppData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? normalizeData(JSON.parse(stored) as AppData) : cloneInitialData()
    } catch {
      return cloneInitialData()
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const reset = () => {
    const fresh = cloneInitialData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    setData(fresh)
  }

  return { data, setData, reset }
}
