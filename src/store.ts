import { useEffect, useState } from 'react'
import { initialData } from './data/demo'
import type { AppData } from './types'

const STORAGE_KEY = 'kodierpfad-demo-v3'

function cloneInitialData(): AppData {
  return JSON.parse(JSON.stringify(initialData)) as AppData
}

export function usePersistentData() {
  const [data, setData] = useState<AppData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (JSON.parse(stored) as AppData) : cloneInitialData()
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
