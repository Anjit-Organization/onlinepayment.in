/** Everything stored UTC, displayed IST. TECHNICAL.md §4.2. */

const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const IST_LONG = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const IST_MONTH_YEAR = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'long',
  year: 'numeric',
})

/** "19 Nov 2026" */
export const formatIST = (d: Date): string => IST.format(d)

/** "19 November 2026" */
export const formatISTLong = (d: Date): string => IST_LONG.format(d)

/** "November 2026" — for data-generated page titles. BUILD-PLAN §5.6. */
export const formatMonthYear = (d: Date): string => IST_MONTH_YEAR.format(d)

/** Machine-readable, for <time datetime> and JSON-LD. */
export const toISODate = (d: Date): string => d.toISOString().slice(0, 10)

export const daysSince = (d: Date, now = new Date()): number =>
  Math.floor((now.getTime() - d.getTime()) / 86_400_000)

export type EffectiveDated = { effectiveFrom: Date; effectiveTo: Date | null }

/** The single source of truth for "is this row current". */
export const isCurrentlyEffective = (row: EffectiveDated, at = new Date()): boolean =>
  row.effectiveFrom <= at && (row.effectiveTo === null || row.effectiveTo > at)
