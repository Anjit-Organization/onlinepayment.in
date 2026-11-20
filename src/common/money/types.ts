/**
 * Integer-only money primitives. TECHNICAL.md §4.1.
 *
 * Floats are disqualifying here: 0.1 + 0.2 !== 0.3, and a one-paise rounding
 * drift on a comparison page destroys the only thing this site sells.
 */

/** 1/100 of a rupee. Rs 1,250.50 -> 125050n */
export type Paise = bigint & { readonly __brand: 'Paise' }

/** 1/100 of a percent. 1.95% -> 195, 0.4% -> 40, 18% GST -> 1800 */
export type BasisPoints = number & { readonly __brand: 'BasisPoints' }

export const paise = (v: bigint | number): Paise => {
  const b = typeof v === 'number' ? BigInt(Math.round(v)) : v
  return b as Paise
}

export const bp = (v: number): BasisPoints => {
  if (!Number.isInteger(v)) {
    throw new RangeError(`BasisPoints must be an integer, received ${v}`)
  }
  return v as BasisPoints
}

/** Rupees -> Paise. Accepts only values with at most 2 decimal places. */
export const rupees = (v: number): Paise => paise(Math.round(v * 100))

/** Percent -> BasisPoints. 1.95 -> 195 */
export const percent = (v: number): BasisPoints => bp(Math.round(v * 100))
