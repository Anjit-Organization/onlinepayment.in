import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STALE_ALERT_DAYS, STALE_BLOCK_DAYS, STALE_WARN_DAYS } from '@/common/config'
import { FRESHNESS_ORDER, freshnessOf, freshnessOfAge, isSitemapBlocked } from '@/common/staleness'

/**
 * The thresholds are a PUBLISHED editorial policy, not an implementation
 * detail. /methodology/ tells readers exactly what happens at 30, 60 and 90
 * days, so these tests guard a promise rather than a function.
 *
 * The bug being prevented: the 90-day promise was printed on the site and
 * enforced nowhere, because the only file importing STALE_BLOCK_DAYS was the
 * one rendering the sentence about it.
 */

const at = (ageDays: number): Date => new Date(Date.UTC(2027, 0, 1) - ageDays * 86_400_000)
const NOW = new Date(Date.UTC(2027, 0, 1))

describe('the published thresholds', () => {
  it('are ordered, so a record cannot be blocked before it is alerted', () => {
    expect(STALE_WARN_DAYS).toBeLessThan(STALE_ALERT_DAYS)
    expect(STALE_ALERT_DAYS).toBeLessThan(STALE_BLOCK_DAYS)
  })

  it('names a state for every sentence on /methodology/, in the same order', () => {
    expect(FRESHNESS_ORDER).toEqual(['current', 'warn', 'alert', 'blocked'])
  })

  /**
   * If someone edits the constants, the page that promises them must move too.
   * Reading the rendered source is crude on purpose: the alternative is a test
   * that passes while the site tells readers something untrue.
   */
  it('are the numbers /methodology/ actually renders', () => {
    const page = readFileSync(
      fileURLToPath(new URL('../../src/app/methodology/page.tsx', import.meta.url)),
      'utf8',
    )
    for (const name of ['STALE_WARN_DAYS', 'STALE_ALERT_DAYS', 'STALE_BLOCK_DAYS']) {
      expect(page).toContain(name)
    }
    // and the promise itself, which is the part with no second chance
    expect(page).toContain('pull the page from our sitemap')
  })
})

describe('freshnessOfAge', () => {
  it('treats the threshold day itself as still inside the better state', () => {
    // A monthly cycle run on day 30 must not trip its own warning.
    expect(freshnessOfAge(STALE_WARN_DAYS)).toBe('current')
    expect(freshnessOfAge(STALE_WARN_DAYS + 1)).toBe('warn')
    expect(freshnessOfAge(STALE_ALERT_DAYS)).toBe('warn')
    expect(freshnessOfAge(STALE_ALERT_DAYS + 1)).toBe('alert')
    expect(freshnessOfAge(STALE_BLOCK_DAYS)).toBe('alert')
    expect(freshnessOfAge(STALE_BLOCK_DAYS + 1)).toBe('blocked')
  })

  it('handles a figure verified today, and one a day ahead of the clock', () => {
    expect(freshnessOfAge(0)).toBe('current')
    // Seed dates are parsed as UTC midnight, so a build running in IST before
    // 05:30 sees -1 for a figure checked today. That is not a data error.
    expect(freshnessOfAge(-1)).toBe('current')
  })

  it('never returns a state outside the published four', () => {
    for (let age = -1; age <= STALE_BLOCK_DAYS + 400; age += 7) {
      expect(FRESHNESS_ORDER).toContain(freshnessOfAge(age))
    }
  })

  /**
   * The one direction this must never fail in. Every comparison is `>`, so an
   * age it cannot use would otherwise fall through every branch and come back
   * 'current': a green badge, never queued, never withheld however old it gets
   * — and the queue that exists to catch exactly that would report it as fine.
   */
  describe('refuses an age it cannot use rather than calling it current', () => {
    it('throws on an unparseable date', () => {
      expect(() => freshnessOfAge(NaN)).toThrow(/cannot be parsed/)
      expect(() => freshnessOf(new Date('not a date'), NOW)).toThrow(/cannot be parsed/)
    })

    it('throws on a mistyped year, which is how this happens in practice', () => {
      // 2027 instead of 2026 passes every schema check and would read as
      // permanently current.
      const nextYear = new Date(Date.UTC(2028, 0, 1))
      expect(() => freshnessOf(nextYear, NOW)).toThrow(/in the future/)
      expect(() => freshnessOfAge(-2)).toThrow(/in the future/)
    })

    it('does not throw for the one day of skew that is legitimate', () => {
      expect(() => freshnessOfAge(-1)).not.toThrow()
    })
  })
})

describe('freshnessOf', () => {
  it('reads a date against a supplied now, not the wall clock', () => {
    expect(freshnessOf(at(0), NOW)).toBe('current')
    expect(freshnessOf(at(STALE_WARN_DAYS + 1), NOW)).toBe('warn')
    expect(freshnessOf(at(STALE_ALERT_DAYS + 1), NOW)).toBe('alert')
    expect(freshnessOf(at(STALE_BLOCK_DAYS + 1), NOW)).toBe('blocked')
  })
})

describe('the 90-day sitemap promise', () => {
  it('withholds a record only once it is past the block threshold', () => {
    expect(isSitemapBlocked(at(STALE_BLOCK_DAYS), NOW)).toBe(false)
    expect(isSitemapBlocked(at(STALE_BLOCK_DAYS + 1), NOW)).toBe(true)
  })

  it('does not withhold a figure that is merely flagged', () => {
    // The 60-day promise is a visible admission on the page, NOT removal.
    // Conflating the two would quietly deindex the site a month early.
    expect(isSitemapBlocked(at(STALE_ALERT_DAYS + 1), NOW)).toBe(false)
  })

  it('lets a re-checked record back in immediately', () => {
    expect(isSitemapBlocked(at(STALE_BLOCK_DAYS + 500), NOW)).toBe(true)
    expect(isSitemapBlocked(at(0), NOW)).toBe(false)
  })
})
