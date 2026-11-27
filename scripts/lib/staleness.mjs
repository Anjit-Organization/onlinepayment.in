/**
 * Data-age policy for the Node scripts. The TypeScript side of this lives in
 * `src/common/staleness`, which the app and the sitemap use.
 *
 * WHY TWO IMPLEMENTATIONS: the scripts run on a bare checkout with no build, so
 * they cannot import TypeScript. What they must NOT duplicate is the numbers —
 * those are a published editorial policy rendered on /methodology/ — so both
 * sides read them from `src/common/config/index.ts` and only the comparison is
 * written twice. `tests/unit/staleness.test.ts` pins the TS side to the same
 * constants and to the sentence on the page.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONFIG = join(process.cwd(), 'src', 'common', 'config', 'index.ts')
const SEED_DIR = join(process.cwd(), 'data', 'seed', 'gateways')

/** Parsed from config so a threshold change cannot leave a script behind. */
export function thresholds() {
  const src = readFileSync(CONFIG, 'utf8')
  const read = (name) => {
    const m = new RegExp(`export const ${name}\\s*=\\s*(\\d+)`).exec(src)
    if (!m) {
      throw new Error(
        `cannot find ${name} in src/common/config/index.ts — the staleness policy moved. ` +
          'Fix scripts/lib/staleness.mjs rather than hardcoding a number.',
      )
    }
    return Number(m[1])
  }
  return {
    warn: read('STALE_WARN_DAYS'),
    alert: read('STALE_ALERT_DAYS'),
    block: read('STALE_BLOCK_DAYS'),
  }
}

/**
 * A future `verifiedAt` is a data error, but one day of it is not: seed dates
 * are `YYYY-MM-DD` parsed as UTC midnight, so running this in IST before 05:30
 * legitimately sees -1 for a figure checked today.
 */
const CLOCK_SKEW_TOLERANCE_DAYS = 1

/**
 * Boundaries exclusive: at exactly 30 days a figure is still current.
 *
 * Throws on an age it cannot use, mirroring `src/common/staleness`. Every
 * comparison is `>`, so a NaN age (unparseable date) or a negative one (mistyped
 * year) would otherwise fall through and return 'current' — a figure reporting
 * fresher than it is, which is the one direction this must never fail in, and
 * it would be this script that hid it. Callers turn the throw into a FAIL line.
 */
export function freshnessOfAge(age, t) {
  if (!Number.isFinite(age)) {
    throw new Error(`unusable verifiedAt: age is ${age} — the date cannot be parsed`)
  }
  if (age < -CLOCK_SKEW_TOLERANCE_DAYS) {
    throw new Error(
      `verifiedAt is ${Math.abs(age)} days in the future — check the year; a future date ` +
        'reads as permanently current and is never re-checked',
    )
  }
  if (age > t.block) return 'blocked'
  if (age > t.alert) return 'alert'
  if (age > t.warn) return 'warn'
  return 'current'
}

export const daysSince = (iso, now) =>
  Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000)

export function loadVerifiedSeeds() {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(SEED_DIR, f), 'utf8')))
    .filter((g) => g.state === 'verified')
}

/**
 * Providers past the block threshold, whose pages the sitemap is withholding
 * exactly as /methodology/ promises.
 */
export function withheldSlugs(now = new Date()) {
  const t = thresholds()
  return new Set(
    loadVerifiedSeeds()
      .filter((g) => {
        try {
          return freshnessOfAge(daysSince(g.verifiedAt, now), t) === 'blocked'
        } catch (e) {
          // Name the seed. "age is NaN" with no slug sends a reader through
          // eight files to find which one.
          throw new Error(`${g.slug}.json: ${e.message}`, { cause: e })
        }
      })
      .map((g) => g.slug),
  )
}

/**
 * Paths expected to be linked but absent from the sitemap because a provider on
 * them is withheld. A comparison page is withheld when EITHER side is: it shows
 * both figures, so it is only as fresh as its staler half.
 */
export function withheldPath(path, withheld) {
  if (withheld.size === 0) return null

  const gateway = /^\/charges\/([^/]+)\/$/.exec(path)
  if (gateway && withheld.has(gateway[1])) return gateway[1]

  const compare = /^\/compare\/([^/]+)-vs-([^/]+)\/$/.exec(path)
  if (compare) {
    const stale = [compare[1], compare[2]].find((s) => withheld.has(s))
    if (stale) return stale
  }
  return null
}
