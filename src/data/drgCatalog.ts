import type { DrgLengthOfStayProfile } from '../types'

// Illustrative prototype values only; production must use the licensed catalog data.
const drgLengthOfStay2026: Record<string, DrgLengthOfStayProfile> = {
  A13G: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 15.2, lowerFirstDiscountDay: 5, upperFirstSurchargeDay: 31 },
  B70B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 9.1, lowerFirstDiscountDay: 3, upperFirstSurchargeDay: 19 },
  F03A: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 18.5, lowerFirstDiscountDay: 6, upperFirstSurchargeDay: 36 },
  F09C: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 8, lowerFirstDiscountDay: 2, upperFirstSurchargeDay: 17 },
  G23B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 4.2, lowerFirstDiscountDay: 1, upperFirstSurchargeDay: 9 },
  I08E: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 7.5, lowerFirstDiscountDay: 2, upperFirstSurchargeDay: 17 },
  I41Z: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 16.5, lowerFirstDiscountDay: 5, upperFirstSurchargeDay: 32 },
  L20B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 3.5, lowerFirstDiscountDay: 1, upperFirstSurchargeDay: 8 },
  T60B: { catalogYear: 2026, careSetting: 'Hauptabteilung', meanDays: 12.4, lowerFirstDiscountDay: 4, upperFirstSurchargeDay: 25 },
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
