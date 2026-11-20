import type { BasisPoints, Paise } from './types'

/** en-IN gives lakh/crore grouping: Rs 12,50,000 — never Rs 1,250,000. */
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const INR_WHOLE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** The only function permitted to turn money into a string. */
export function formatINR(v: Paise, opts: { whole?: boolean } = {}): string {
  const asNumber = Number(v) / 100
  return opts.whole ? INR_WHOLE.format(Math.round(asNumber)) : INR.format(asNumber)
}

/** 195 -> "1.95%" */
export function formatRate(v: BasisPoints, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2
  return `${(v / 100).toFixed(decimals)}%`
}

/** bigint is not JSON-safe. API responses must convert explicitly. */
export const toPaiseString = (v: Paise): string => v.toString()

export const fromPaiseString = (s: string): Paise => BigInt(s) as Paise
