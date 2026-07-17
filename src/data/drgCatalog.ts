import type { DrgLengthOfStayProfile } from '../types'

const drgLengthOfStay2026: Record<string, DrgLengthOfStayProfile> = {
  E71A: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 14.3, lowerFirstDiscountDay: 4, upperFirstSurchargeDay: 29 },
  E71B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 7, lowerFirstDiscountDay: 1, upperFirstSurchargeDay: 18 },
  E77B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 21.5, lowerFirstDiscountDay: 6, upperFirstSurchargeDay: 39 },
  E79A: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 11.4, lowerFirstDiscountDay: 3, upperFirstSurchargeDay: 23 },
}

export function getDrgLengthOfStayProfile(drg: string): DrgLengthOfStayProfile {
  const code = drg.trim().slice(0, 4).toUpperCase()
  return drgLengthOfStay2026[code] ?? {
    catalogYear: 2026,
    careSetting: 'Hauptabteilung',
    meanDays: 0,
  }
}
