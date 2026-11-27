#!/usr/bin/env node
/**
 * The re-verification queue: what needs re-checking, oldest first.
 *
 * WHY THIS EXISTS: /methodology/ makes four promises about ageing figures. The
 * 30-day one — "it gets flagged for re-checking" — had no mechanism behind it.
 * A reader saw an amber dot, but nothing told the person who could actually act,
 * so the flagging was decorative. BUILD-PLAN §9 calls the share of data verified
 * within 30 days "the health of the moat", and §10 names verification workload
 * as the real constraint on this site. An unmeasured constraint is an unmanaged
 * one.
 *
 * It reads the seed JSON directly rather than a running server, so it works on
 * a bare checkout with no build — the point is to run it often and cheaply.
 *
 * EXIT CODE: non-zero only when a record has passed the block threshold, i.e.
 * when the sitemap is now withholding a page we promised to withhold. That is
 * the one state that silently costs traffic, and every provider here was
 * verified on the same day, so they all cross it on the same day. A gentler
 * warning would be read as noise and ignored exactly once.
 *
 * Usage:
 *   node scripts/verify-queue.mjs            the queue
 *   node scripts/verify-queue.mjs --sources  also fetch each source URL and
 *                                            look for the figures we hold
 */

import { daysSince, freshnessOfAge, loadVerifiedSeeds, thresholds } from './lib/staleness.mjs'

const CHECK_SOURCES = process.argv.includes('--sources')
const NOW = new Date()

/**
 * Thresholds come from config via the shared lib, never from a copy here. They
 * are a published editorial policy — the same three numbers are rendered on
 * /methodology/ and enforced in sitemap.ts — and a second copy is how the three
 * drift apart, invisibly, until a reader is told one thing while the site does
 * another.
 */
let T
try {
  T = thresholds()
} catch (e) {
  console.error(`  FAIL  config  ${e.message}`)
  process.exit(1)
}

const LABEL = {
  current: 'current',
  warn: 'DUE',
  alert: 'OUT OF DATE ON PAGE',
  blocked: 'WITHHELD FROM SITEMAP',
}

/** A date we cannot age is worse than an old one: it claims to be current. */
const UNUSABLE = 'UNUSABLE DATE'

// ------------------------------------------------------------------- queue ---

/** Seeds whose verifiedAt cannot be aged. Collected, then failed on at the end. */
const badDates = []

const records = loadVerifiedSeeds()
  .map((g) => {
    const age = daysSince(g.verifiedAt, NOW)
    let freshness
    try {
      freshness = freshnessOfAge(age, T)
    } catch (e) {
      // The whole job of this script is to notice a figure that is not as
      // fresh as it claims. A date it cannot age is that, in its purest form.
      badDates.push(`${g.slug}.json: ${e.message}`)
      freshness = null
    }
    const nextAt = [T.warn, T.alert, T.block].find((t) => age <= t)
    return {
      slug: g.slug,
      name: g.displayName,
      verifiedAt: g.verifiedAt,
      age,
      freshness,
      daysUntilNext: nextAt === undefined ? null : nextAt - age + 1,
      sourceUrl: g.sourceUrl,
      sourceKind: g.sourceKind,
      fees: g.fees,
    }
  })
  .sort((a, b) => b.age - a.age || a.slug.localeCompare(b.slug))

console.log(`\nre-verification queue — ${NOW.toISOString().slice(0, 10)}`)
console.log(`thresholds: warn ${T.warn}d · alert ${T.alert}d · withhold ${T.block}d\n`)

if (records.length === 0) {
  console.log('  no verified records in the seed\n')
  process.exit(0)
}

const pad = Math.max(...records.map((r) => r.slug.length))
for (const r of records) {
  const state = r.freshness === null ? UNUSABLE : LABEL[r.freshness]
  const next =
    r.freshness === null
      ? 'cannot be aged'
      : r.daysUntilNext === null
        ? 'already withheld'
        : `${r.daysUntilNext}d until ${freshnessOfAge(r.age + r.daysUntilNext, T)}`
  const mark = r.freshness === 'current' ? '  ok  ' : '  --> '
  console.log(
    `${mark}${r.slug.padEnd(pad)}  ${String(r.age).padStart(3)}d  ${r.verifiedAt}  ${state.padEnd(21)}  ${next}`,
  )
}

const counts = records.reduce((m, r) => ({ ...m, [r.freshness]: (m[r.freshness] ?? 0) + 1 }), {})
const within = records.filter((r) => r.freshness === 'current').length
console.log(
  `\n  ${within} of ${records.length} verified within ${T.warn} days` +
    ` (${Math.round((within / records.length) * 100)}% — BUILD-PLAN §9)`,
)
for (const f of ['warn', 'alert', 'blocked']) {
  if (counts[f]) console.log(`  ${counts[f]} ${LABEL[f].toLowerCase()}`)
}

/**
 * They were all verified on one day, so they all come due on one day. Worth
 * saying out loud: a queue that goes from empty to everything is one nobody has
 * time for, and staggering re-checks is how that gets fixed.
 */
const dates = new Set(records.map((r) => r.verifiedAt))
if (dates.size === 1 && records.length > 2) {
  console.log(
    `\n  note: all ${records.length} records share verifiedAt ${[...dates][0]}, so they cross` +
      '\n        every threshold together. Staggering re-checks spreads the work.',
  )
}

// ----------------------------------------------------------------- sources ---
// Advisory, and never allowed to change the exit code. A rate card behind
// Cloudflare, rendered by JavaScript, or simply reworded will all look like
// drift here, and a check that cries wolf is one that gets ignored. This points
// a human at a page; it never decides anything.

if (CHECK_SOURCES) {
  console.log('\nsource check (advisory — a miss means "go look", not "it changed")\n')

  /**
   * Figures are only searched for on a PUBLISHED RATE CARD.
   *
   * A `secondary_source` record cites the provider's site for identity while
   * the numbers come from a named third party — CCAvenue and Easebuzz publish
   * no rate card at all, which is why those records exist in that form. Hunting
   * for "1.95%" on a company homepage misses every time, and nine confident
   * misses per run is how a check teaches people to ignore it. Those URLs still
   * get a reachability check, which is the part that can actually rot.
   */
  const RATE_CARD_KINDS = new Set(['official_rate_card'])

  for (const r of records) {
    let text
    try {
      const res = await fetch(r.sourceUrl, {
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; pricing-verification-bot)' },
      })
      if (!res.ok) {
        console.log(`  --> ${r.slug}  source returned ${res.status}  ${r.sourceUrl}`)
        continue
      }
      /**
       * Normalise before matching. Paytm renders "1.99 %" with a space, which
       * cost this check a confident false negative on all six of their rates
       * the first time it ran — the exact way a drift check loses its audience.
       * Non-breaking spaces and the full-width percent sign are the same trap.
       */
      text = (await res.text())
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u00a0\u2007\u202f]/g, ' ')
        .replace(/\uff05/g, '%')
        .replace(/\s+/g, ' ')
        .replace(/\s+%/g, '%')
    } catch (e) {
      console.log(`  --> ${r.slug}  source unreachable (${e.message})  ${r.sourceUrl}`)
      continue
    }

    if (!RATE_CARD_KINDS.has(r.sourceKind)) {
      console.log(
        `  ok  ${r.slug}  source reachable (${r.sourceKind} — figures come from a named third party,` +
          ' not this page)',
      )
      continue
    }

    const rated = r.fees.filter((f) => f.rateBp !== null)
    const missing = []
    for (const f of rated) {
      const pctStr = (f.rateBp / 100).toString()
      // Both spellings a rate card might use: "2%" and "2.00%".
      const forms = [`${pctStr}%`, `${(f.rateBp / 100).toFixed(2)}%`]
      if (!forms.some((s) => text.includes(s))) missing.push({ method: f.method, pct: pctStr })
    }

    if (missing.length === 0) {
      console.log(`  ok  ${r.slug}  all ${rated.length} published rates still appear on the page`)
      continue
    }

    console.log(
      `  --> ${r.slug}  ${missing.length} of ${rated.length} rates not found on ${r.sourceUrl}`,
    )
    for (const m of missing) console.log(`        ${m.method} — we hold ${m.pct}%`)

    /**
     * A ready-to-paste `changes` entry. Every seed's `changes` array is empty,
     * which means the dataset has no history — and history is the part of this
     * data nobody can copy. Recording it has to be easier than skipping it, so
     * the script writes the boilerplate and leaves the judgement to a person.
     */
    console.log(`        if a figure really moved, record it in ${r.slug}.json:`)
    console.log(
      `        ${JSON.stringify({
        changedAt: NOW.toISOString().slice(0, 10),
        field: `fees.${missing[0].method}.rateBp`,
        oldValue: `${missing[0].pct}%`,
        newValue: '<the new figure>',
        sourceUrl: r.sourceUrl,
      })}`,
    )
  }
}

// -------------------------------------------------------------------- exit ---

console.log('')
if (badDates.length > 0) {
  console.error(`verify-queue FAILED: ${badDates.length} seed(s) with an unusable verifiedAt.`)
  for (const d of badDates) console.error(`  ${d}`)
  console.error(
    'A date that cannot be aged reads as current everywhere: green badge, never queued,\n' +
      'never withheld. Fix the date in the seed.\n',
  )
  process.exit(1)
}
if (counts.blocked) {
  console.error(
    `verify-queue FAILED: ${counts.blocked} record(s) past ${T.block} days.\n` +
      'Those pages are being withheld from the sitemap, as /methodology/ promises.\n' +
      'Re-check them and update verifiedAt, or the traffic goes quietly.\n',
  )
  process.exit(1)
}
console.log('verify-queue passed\n')
