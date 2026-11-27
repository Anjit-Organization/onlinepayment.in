import { STALE_ALERT_DAYS, STALE_BLOCK_DAYS, STALE_WARN_DAYS } from '../config'
import { daysSince } from '../datetime'

/**
 * Data-age policy: the single interpretation of the thresholds in config.
 *
 * WHY THIS EXISTS IN common/ RATHER THAN A MODULE:
 * `/methodology/` publishes four promises about how we treat ageing figures,
 * and keeping them means three places have to agree — the dated badge a reader
 * sees, the sitemap, and the re-verification queue. Two of them had their own
 * copy of the boundaries and the third had none, so the 90-day promise was
 * printed on the site and enforced nowhere. A published editorial policy with
 * no mechanism behind it is the worst kind of bug on a site whose whole claim
 * is that the figures are checked.
 *
 * `common/ui/verified-at.tsx` cannot import from `@/modules/*` (lint rule), so
 * a shared policy cannot live in a module. It belongs beside the thresholds it
 * interprets either way: this is not a feature, it is the rule the features obey.
 *
 * The four states are the four sentences on /methodology/, in the same order.
 * Changing one here changes the site and the page that describes it together.
 */
export type Freshness =
  /** Under the warn threshold. Shown as current. */
  | 'current'
  /** Past warn: due for re-checking. The reader sees amber; the queue sees work. */
  | 'warn'
  /** Past alert: the page says outright that the figure may be out of date. */
  | 'alert'
  /** Past block: the page leaves the sitemap until someone re-checks it. */
  | 'blocked'

/** Ordered oldest-first, so a queue can sort by severity without a lookup table. */
export const FRESHNESS_ORDER: readonly Freshness[] = ['current', 'warn', 'alert', 'blocked']

/**
 * A `verifiedAt` dated in the future is a data error, but a day of it is not:
 * seed dates are plain `YYYY-MM-DD` parsed as UTC midnight, so a build running
 * in IST before 05:30 legitimately sees an age of -1 for a figure checked
 * today. Tolerate that; reject anything beyond it.
 */
const CLOCK_SKEW_TOLERANCE_DAYS = 1

/**
 * Boundaries are EXCLUSIVE of the threshold itself: at exactly 30 days the
 * figure is still current, and it turns at 31. This matches how /methodology/
 * reads ("under 30 days... between 30 and 60") and, more practically, means a
 * monthly re-verification cycle run on day 30 never trips its own warning.
 *
 * THROWS ON AN UNUSABLE AGE RATHER THAN GUESSING. Every comparison below uses
 * `>`, so before this guard existed a NaN age (unparseable date) and a negative
 * one (a mistyped year) both fell through every branch and returned 'current' —
 * the single direction this module must never fail in. A figure claiming to be
 * fresher than it is gets a green dot, is never queued for re-checking, and is
 * never withheld however old it gets, while the tool meant to catch that
 * reports it as current.
 *
 * Failing the build is the right failure here, and it is what this codebase
 * already does with a malformed seed: an invalid date is a one-line fix in a
 * committed JSON file, found in seconds at build time, versus a wrong freshness
 * claim nobody notices for months.
 */
export function freshnessOfAge(ageDays: number): Freshness {
  if (!Number.isFinite(ageDays)) {
    throw new Error(
      `Unusable verifiedAt: age is ${ageDays}. A date that cannot be parsed cannot be ` +
        'aged, and treating it as current would publish an unverifiable freshness claim.',
    )
  }
  if (ageDays < -CLOCK_SKEW_TOLERANCE_DAYS) {
    throw new Error(
      `verifiedAt is ${Math.abs(ageDays)} days in the future. Check the year in the seed: ` +
        'a future date would read as permanently current and never be re-checked.',
    )
  }
  if (ageDays > STALE_BLOCK_DAYS) return 'blocked'
  if (ageDays > STALE_ALERT_DAYS) return 'alert'
  if (ageDays > STALE_WARN_DAYS) return 'warn'
  return 'current'
}

export function freshnessOf(verifiedAt: Date, now = new Date()): Freshness {
  return freshnessOfAge(daysSince(verifiedAt, now))
}

/**
 * The 90-day promise, in one place.
 *
 * A blocked record is still rendered and still reachable — pulling the page
 * entirely would 404 live URLs and lose whatever position they hold. It simply
 * stops being submitted, which is what we said we would do, and it comes back
 * the moment someone re-checks it.
 */
export function isSitemapBlocked(verifiedAt: Date, now = new Date()): boolean {
  return freshnessOf(verifiedAt, now) === 'blocked'
}
