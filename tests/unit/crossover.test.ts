import { describe, expect, it } from 'vitest'
import { rupees } from '@/common/money'
import { DEFAULT_MIX } from '@/modules/calculator'
import { allPairs, findCrossover, pairSlug, parsePairSlug } from '@/modules/compare'
import type { GatewaySeed } from '@/modules/pricing'

const base = {
  legalName: 'X', website: 'https://x.test', state: 'verified' as const,
  verifiedAt: '2026-11-19', verifiedBy: 'test', sourceKind: 'official_rate_card' as const,
  sourceUrl: 'https://x.test', planName: 'Standard',
  setupFeePaise: 0, annualMaintenancePaise: 0, monthlyFeePaise: 0,
  settlementCycleDays: null, chargebackFeePaise: null, mdrRefundedOnRefund: null,
  notCharged: [], promos: [], changes: [], secondarySources: [],
}

const gw = (slug: string, rateBp: number, annualPaise = 0): GatewaySeed => ({
  ...base, slug, displayName: slug, annualMaintenancePaise: annualPaise,
  fees: Object.keys(DEFAULT_MIX).map((m) => ({
    method: m as never, rateBp, flatFeePaise: null, minFeePaise: null,
    maxFeePaise: null, bandMinPaise: null, bandMaxPaise: null,
  })),
})

const input = {
  monthlyVolumePaise: rupees(100_000),
  avgTransactionPaise: rupees(1_500),
  mix: DEFAULT_MIX,
  includeSetupFee: false,
}

describe('pair slugs', () => {
  it('orders a pair deterministically, so each pair has one URL', () => {
    expect(pairSlug('razorpay', 'cashfree')).toBe('cashfree-vs-razorpay')
    expect(pairSlug('cashfree', 'razorpay')).toBe('cashfree-vs-razorpay')
  })

  it('generates n choose 2 pairs with no duplicates', () => {
    const pairs = allPairs(['a', 'b', 'c', 'd'])
    expect(pairs).toHaveLength(6)
    expect(new Set(pairs.map(([x, y]) => pairSlug(x, y))).size).toBe(6)
  })

  it('round-trips a slug', () => {
    expect(parsePairSlug('cashfree-vs-razorpay')).toEqual(['cashfree', 'razorpay'])
    expect(parsePairSlug('nonsense')).toBeNull()
  })
})

describe('findCrossover', () => {
  it('reports a clear winner when one gateway is always cheaper', () => {
    const r = findCrossover(gw('cheap', 180), gw('dear', 220), input)
    expect(r.kind).toBe('always')
    if (r.kind === 'always') expect(r.winner).toBe('cheap')
  })

  it('finds the crossover when a lower rate carries an annual fee', () => {
    // 1.75% + Rs 4,999/yr  vs  2.00% + nothing
    const r = findCrossover(gw('lowrate', 175, 499_900), gw('nofee', 200), input)
    expect(r.kind).toBe('crosses')
    if (r.kind === 'crosses') {
      expect(r.cheaperBelow).toBe('nofee')
      expect(r.cheaperAbove).toBe('lowrate')
    }
  })

  it('puts the crossover where the fixed fee equals the rate saving', () => {
    // Saving is 0.25% of annual volume; it covers Rs 4,999 (+GST on both sides)
    // at an annual volume of ~Rs 20L, i.e. ~Rs 1.67L a month.
    const r = findCrossover(gw('lowrate', 175, 499_900), gw('nofee', 200), input)
    if (r.kind !== 'crosses') throw new Error('expected a crossover')
    const monthlyRupees = Number(r.atPaise) / 100
    expect(monthlyRupees).toBeGreaterThan(150_000)
    expect(monthlyRupees).toBeLessThan(185_000)
  })

  it('is order-independent', () => {
    const a = findCrossover(gw('lowrate', 175, 499_900), gw('nofee', 200), input)
    const b = findCrossover(gw('nofee', 200), gw('lowrate', 175, 499_900), input)
    expect(a.kind).toBe('crosses')
    expect(b.kind).toBe('crosses')
    if (a.kind === 'crosses' && b.kind === 'crosses') {
      expect(a.cheaperBelow).toBe(b.cheaperBelow)
      expect(a.cheaperAbove).toBe(b.cheaperAbove)
      // Same intersection from either direction, within one rupee.
      expect(Math.abs(Number(a.atPaise - b.atPaise))).toBeLessThanOrEqual(100)
    }
  })

  it('reports a TIE for identical pricing, never a fabricated winner', () => {
    // Paytm and PhonePe publish identical rates. Claiming one is cheaper — via
    // an alphabetical tie-break — would be a false claim on a live page.
    const r = findCrossover(gw('same-a', 200), gw('same-b', 200), input)
    expect(r.kind).toBe('tie')
  })

  it('does not depend on argument order for a tie', () => {
    expect(findCrossover(gw('x', 200), gw('y', 200), input).kind).toBe('tie')
    expect(findCrossover(gw('y', 200), gw('x', 200), input).kind).toBe('tie')
  })
})
