/**
 * When the money actually lands.
 *
 * "T+2" is not two days. It is two BANK WORKING days, and Razorpay's
 * settlement FAQ defines those precisely: "Working days do not include second
 * and fourth Saturdays, Sundays and bank holidays." A Friday capture on a
 * T+2 cycle therefore lands on Tuesday, and a Friday capture before a long
 * weekend can land five calendar days later. That gap between the advertised
 * cycle and the felt delay is the whole reason this tool exists.
 *
 * WHY WE SHIP NO FESTIVAL CALENDAR
 * Indian bank holidays are declared per state under the Negotiable Instruments
 * Act, and the festival dates move every year with the lunar calendar. A
 * hardcoded list of them would be wrong for most users on day one and wrong
 * for everyone within a year, while looking authoritative. So this computes
 * the two things that are deterministic — the weekend rules, and the four
 * fixed-date holidays observed nationally — and takes any others as input.
 * A tool that asks you for your state's holidays is more use than one that
 * guesses them.
 */

/** A plain calendar date. Settlement is a date question, never a time question. */
export type CalDate = { y: number; m: number; d: number }

export const toCal = (iso: string): CalDate | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  // Reject 31 April and friends by round-tripping through UTC.
  const utc = new Date(Date.UTC(y, mo - 1, d))
  if (utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d) return null
  return { y, m: mo, d }
}

export const toISO = (c: CalDate): string =>
  `${String(c.y).padStart(4, '0')}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`

/** UTC throughout, so a local timezone can never shift a settlement date. */
const toUTC = (c: CalDate): number => Date.UTC(c.y, c.m - 1, c.d)

const fromUTC = (ms: number): CalDate => {
  const d = new Date(ms)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

export const addCalendarDays = (c: CalDate, n: number): CalDate =>
  fromUTC(toUTC(c) + n * 86_400_000)

/** 0 = Sunday. */
export const dayOfWeek = (c: CalDate): number => new Date(toUTC(c)).getUTCDay()

export const calendarDaysBetween = (a: CalDate, b: CalDate): number =>
  Math.round((toUTC(b) - toUTC(a)) / 86_400_000)

/** Which Saturday of the month this is. 1-indexed. */
export const saturdayOrdinal = (c: CalDate): number => Math.floor((c.d - 1) / 7) + 1

/**
 * Fixed-date holidays observed as bank holidays across every Indian state.
 * Deliberately short: only dates that do not move and are not state-specific.
 * 1 April (annual bank closing) is excluded because it is not observed
 * uniformly, which is exactly the kind of guess this module refuses to make.
 */
export const FIXED_NATIONAL_HOLIDAYS: readonly { m: number; d: number; name: string }[] = [
  { m: 1, d: 26, name: 'Republic Day' },
  { m: 8, d: 15, name: 'Independence Day' },
  { m: 10, d: 2, name: 'Gandhi Jayanti' },
  { m: 12, d: 25, name: 'Christmas Day' },
]

export type NonWorkingReason =
  | { kind: 'sunday' }
  | { kind: 'saturday-2nd-4th'; ordinal: number }
  | { kind: 'national-holiday'; name: string }
  | { kind: 'declared-holiday' }

/**
 * Why this date is not a bank working day, or null if it is one.
 * `declared` holds extra ISO dates supplied by the user for their own state.
 */
export function nonWorkingReason(
  c: CalDate,
  declared: ReadonlySet<string> = new Set(),
): NonWorkingReason | null {
  if (declared.has(toISO(c))) return { kind: 'declared-holiday' }

  const national = FIXED_NATIONAL_HOLIDAYS.find((h) => h.m === c.m && h.d === c.d)
  if (national) return { kind: 'national-holiday', name: national.name }

  const dow = dayOfWeek(c)
  if (dow === 0) return { kind: 'sunday' }
  if (dow === 6) {
    const ordinal = saturdayOrdinal(c)
    if (ordinal === 2 || ordinal === 4) return { kind: 'saturday-2nd-4th', ordinal }
  }
  return null
}

export const isWorkingDay = (c: CalDate, declared?: ReadonlySet<string>): boolean =>
  nonWorkingReason(c, declared) === null

export type DayStep = {
  date: string
  /** null when it counted as a working day. */
  skipped: NonWorkingReason | null
  /** Which of the T+n working days this was, or null if skipped. */
  workingDayIndex: number | null
}

export type SettlementResult = {
  capture: string
  cycleDays: number
  settlement: string
  /** What the merchant feels, as opposed to what the cycle promises. */
  calendarDaysWaited: number
  /** Every day from capture to settlement, with a reason for each skip. */
  trail: DayStep[]
  /** Non-working days crossed. The explanation for any surprise. */
  skippedCount: number
  captureOnNonWorkingDay: NonWorkingReason | null
}

/**
 * Advance `cycleDays` bank working days from the capture date.
 *
 * T is the capture date and is not itself counted, matching Razorpay's
 * worked example. A T+0 cycle therefore settles on the capture date.
 */
export function computeSettlement(
  capture: CalDate,
  cycleDays: number,
  declaredHolidays: readonly string[] = [],
): SettlementResult {
  const declared = new Set(declaredHolidays)
  const trail: DayStep[] = []
  let cursor = capture
  let counted = 0
  let skippedCount = 0

  // A guard, not a limit: 400 iterations cannot be reached by any real cycle,
  // but an infinite loop here would hang the browser tab.
  const MAX_STEPS = 400

  for (let step = 0; counted < cycleDays && step < MAX_STEPS; step++) {
    cursor = addCalendarDays(cursor, 1)
    const reason = nonWorkingReason(cursor, declared)
    if (reason) {
      skippedCount++
      trail.push({ date: toISO(cursor), skipped: reason, workingDayIndex: null })
    } else {
      counted++
      trail.push({ date: toISO(cursor), skipped: null, workingDayIndex: counted })
    }
  }

  return {
    capture: toISO(capture),
    cycleDays,
    settlement: toISO(cursor),
    calendarDaysWaited: calendarDaysBetween(capture, cursor),
    trail,
    skippedCount,
    captureOnNonWorkingDay: nonWorkingReason(capture, declared),
  }
}

export const REASON_LABEL = (r: NonWorkingReason): string => {
  switch (r.kind) {
    case 'sunday':
      return 'Sunday'
    case 'saturday-2nd-4th':
      return `${r.ordinal === 2 ? 'Second' : 'Fourth'} Saturday`
    case 'national-holiday':
      return r.name
    case 'declared-holiday':
      return 'Holiday you added'
  }
}

/**
 * Where a provider's own documents disagree with each other about their
 * settlement cycle. We publish both rather than picking one, because picking
 * one silently is how a comparison site becomes untrustworthy.
 */
export type CycleConflict = {
  gatewaySlug: string
  /** What the seed holds, and therefore what the rest of the site shows. */
  seededLabel: string
  alternativeLabel: string
  explanation: string
  sources: { label: string; url: string }[]
}

export const CYCLE_CONFLICTS: readonly CycleConflict[] = [
  {
    gatewaySlug: 'razorpay',
    seededLabel: 'T+1 (pricing page)',
    alternativeLabel: 'T+2 (settlement docs)',
    explanation:
      "Razorpay's pricing page says the net amount is settled on a T+1 or instant settlement cycle. Their settlement documentation and its FAQ both say the standard cycle is T+2 working days. These are the same company's live pages and they do not agree. Plan for T+2 and treat T+1 as the better case, because the docs are the more specific of the two and an instant settlement is a paid add-on.",
    sources: [
      { label: 'Razorpay pricing', url: 'https://razorpay.com/pricing/' },
      { label: 'About Settlements', url: 'https://razorpay.com/docs/payments/settlements/' },
      { label: 'Settlement FAQs', url: 'https://razorpay.com/docs/payments/settlements/faqs/' },
    ],
  },
]

export const conflictFor = (slug: string): CycleConflict | undefined =>
  CYCLE_CONFLICTS.find((c) => c.gatewaySlug === slug)
