import { type BasisPoints, type Paise, bp, paise } from './types'

export const BP_DIVISOR = 10_000n

/** GST on payment gateway fees in India. Stored separately, never baked into a rate. */
export const GST_BP = bp(1800)

export const ZERO = paise(0n)

/**
 * Half-up division for bigints. Payment gateway invoices round this way, and so
 * does Postgres `numeric`, so our displayed figures reconcile with both.
 */
function roundDiv(numerator: bigint, divisor: bigint): bigint {
  if (divisor <= 0n) throw new RangeError('divisor must be positive')
  if (numerator < 0n) {
    return -((-numerator * 2n + divisor) / (divisor * 2n))
  }
  return (numerator * 2n + divisor) / (divisor * 2n)
}

/** Applies a basis-point rate to an amount, rounded half-up to the nearest paise. */
export function applyRate(amount: Paise, rate: BasisPoints): Paise {
  return paise(roundDiv(amount * BigInt(rate), BP_DIVISOR))
}

/** Adds 18% GST to a GST-exclusive fee. */
export function addGst(fee: Paise): Paise {
  return paise(fee + applyRate(fee, GST_BP))
}

/**
 * The effective rate a merchant actually pays, GST included.
 * 2.00% -> 2.36%. This is the number competitors never print. UI.md §7.2.
 */
export function effectiveRate(rate: BasisPoints): BasisPoints {
  return bp(Math.round((rate * (10_000 + GST_BP)) / 10_000))
}

export const addPaise = (...xs: Paise[]): Paise => paise(xs.reduce((a, b) => a + b, 0n))

export const subPaise = (a: Paise, b: Paise): Paise => paise(a - b)

export const mulPaise = (a: Paise, n: number): Paise => {
  if (!Number.isInteger(n)) throw new RangeError('multiplier must be an integer')
  return paise(a * BigInt(n))
}

export const maxPaise = (a: Paise, b: Paise): Paise => (a > b ? a : b)
export const minPaise = (a: Paise, b: Paise): Paise => (a < b ? a : b)

/**
 * Applies a fee that may have a percentage part, a flat part, and a floor/cap.
 * This is the shape every real Indian gateway rate card takes.
 */
export function computeFee(
  amount: Paise,
  opts: {
    rateBp?: BasisPoints | null
    flatPaise?: Paise | null
    minPaise?: Paise | null
    maxPaise?: Paise | null
  },
): Paise {
  let fee = ZERO
  if (opts.rateBp != null) fee = addPaise(fee, applyRate(amount, opts.rateBp))
  if (opts.flatPaise != null) fee = addPaise(fee, opts.flatPaise)
  if (opts.minPaise != null) fee = maxPaise(fee, opts.minPaise)
  if (opts.maxPaise != null) fee = minPaise(fee, opts.maxPaise)
  return fee
}
