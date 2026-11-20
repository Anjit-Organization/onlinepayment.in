import { describe, expect, it } from 'vitest'
import { rupees } from '@/common/money'
import { computeGatewayCost, rankGateways, normaliseMix, DEFAULT_MIX } from '@/modules/calculator'
import type { GatewaySeed } from '@/modules/pricing'

const base = {
  legalName: 'X', website: 'https://x.test', state: 'verified' as const,
  verifiedAt: '2026-11-19', verifiedBy: 'test', sourceKind: 'official_rate_card' as const,
  sourceUrl: 'https://x.test', planName: 'Standard',
  setupFeePaise: 0, annualMaintenancePaise: 0, monthlyFeePaise: 0,
  settlementCycleDays: null, chargebackFeePaise: null, mdrRefundedOnRefund: null,
  notCharged: [], promos: [], changes: [], secondarySources: [],
}

const flat = (slug: string, rateBp: number, annualPaise = 0): GatewaySeed => ({
  ...base, slug, displayName: slug, annualMaintenancePaise: annualPaise,
  fees: [
    { method: 'upi', rateBp, flatFeePaise: null, minFeePaise: null, maxFeePaise: null, bandMinPaise: null, bandMaxPaise: null },
    { method: 'credit_card_domestic', rateBp, flatFeePaise: null, minFeePaise: null, maxFeePaise: null, bandMinPaise: null, bandMaxPaise: null },
  ],
})

const input = (monthly: number, avg = 1000) => ({
  monthlyVolumePaise: rupees(monthly),
  avgTransactionPaise: rupees(avg),
  mix: { upi: 100 },
  includeSetupFee: false,
})

describe('normaliseMix', () => {
  it('passes through a mix that already sums to 100', () => {
    expect(normaliseMix({ upi: 100 })).toEqual({ upi: 100 })
  })

  it('rescales a mix that does not sum to 100', () => {
    expect(normaliseMix({ upi: 50, wallet: 50, netbanking: 100 })).toEqual({
      upi: 25, wallet: 25, netbanking: 50,
    })
  })

  it('falls back to the default when the mix is empty', () => {
    expect(normaliseMix({})).toEqual(DEFAULT_MIX)
  })
})

describe('computeGatewayCost', () => {
  it('applies the rate then adds GST on top', () => {
    // Rs 1,00,000/mo at 2% = Rs 2,000/mo = Rs 24,000/yr, +18% GST = Rs 28,320
    const c = computeGatewayCost(flat('a', 200), input(100_000))
    expect(c.annualMdrExGstPaise).toBe(2_400_000n)
    expect(c.gstPaise).toBe(432_000n)
    expect(c.annualTotalPaise).toBe(2_832_000n)
  })

  it('reports the blended rate GST-inclusive', () => {
    // 2% + GST = 2.36% -> 236bp
    const c = computeGatewayCost(flat('a', 200), input(100_000))
    expect(c.blendedRateBp).toBe(236)
  })

  it('charges GST on fixed fees too', () => {
    const c = computeGatewayCost(flat('a', 0, 499_900), input(100_000))
    expect(c.annualFixedPaise).toBe(499_900n)
    expect(c.annualTotalPaise).toBe(589_882n) // 4999 * 1.18
  })

  it('excludes the setup fee unless asked for it', () => {
    const g: GatewaySeed = { ...flat('a', 200), setupFeePaise: 100_000 }
    const without = computeGatewayCost(g, input(100_000))
    const withIt = computeGatewayCost(g, { ...input(100_000), includeSetupFee: true })
    expect(withIt.annualTotalPaise).toBeGreaterThan(without.annualTotalPaise)
  })

  it('reports the share of the mix it can actually price', () => {
    // flat() prices upi and credit_card_domestic only.
    const c = computeGatewayCost(flat('a', 200), {
      ...input(100_000),
      mix: { upi: 60, amex: 40 },
    })
    expect(c.pricedSharePercent).toBe(60)
  })

  it('marks a method the gateway does not support', () => {
    const c = computeGatewayCost(flat('a', 200), {
      ...input(100_000),
      mix: { amex: 100 },
    })
    expect(c.unsupportedMethods).toContain('amex')
    expect(c.annualMdrExGstPaise).toBe(0n)
  })

  it('scales a per-transaction flat fee by transaction count, not volume', () => {
    const g: GatewaySeed = {
      ...base, slug: 'mojo', displayName: 'mojo',
      fees: [{ method: 'upi', rateBp: 200, flatFeePaise: 300, minFeePaise: null, maxFeePaise: null, bandMinPaise: null, bandMaxPaise: null }],
    }
    // Rs 1,00,000/mo at Rs 1,000 avg = 100 txns -> Rs 3 x 100 = Rs 300/mo flat
    // plus 2% of Rs 1,00,000 = Rs 2,000/mo. Annual ex-GST = Rs 27,600
    const c = computeGatewayCost(g, input(100_000, 1_000))
    expect(c.annualMdrExGstPaise).toBe(2_760_000n)
  })

  it('resolves a tiered band from the average transaction size', () => {
    // UPI MDR shape: free at or below Rs 2,000, 0.4% above it
    const g: GatewaySeed = {
      ...base, slug: 'tiered', displayName: 'tiered',
      fees: [
        { method: 'upi', rateBp: 0, flatFeePaise: null, minFeePaise: null, maxFeePaise: null, bandMinPaise: 0, bandMaxPaise: 200_000 },
        { method: 'upi', rateBp: 40, flatFeePaise: null, minFeePaise: null, maxFeePaise: null, bandMinPaise: 200_000, bandMaxPaise: null },
      ],
    }
    const small = computeGatewayCost(g, input(100_000, 500))
    const large = computeGatewayCost(g, input(100_000, 5_000))
    expect(small.annualMdrExGstPaise).toBe(0n)
    expect(large.annualMdrExGstPaise).toBeGreaterThan(0n)
  })
})

describe('rankGateways — partial pricing', () => {
  /**
   * PayU publishes no UPI rate at all. If it were ranked on a UPI-heavy mix its
   * total would only charge the non-UPI share, making it look cheapest when it
   * is simply unpriced. A false "cheapest" is the worst output this site can
   * produce, so such gateways are excluded from the ranking entirely.
   */
  it('excludes a gateway that cannot price the whole mix', () => {
    const full = flat('full', 200)
    const partial = flat('partial', 100) // no amex rate
    const { ranked, incomparable } = rankGateways([full, partial], {
      ...input(100_000),
      mix: { upi: 50, amex: 50 },
    })
    expect(ranked.map((r) => r.slug)).toEqual([])
    expect(incomparable.map((c) => c.slug).sort()).toEqual(['full', 'partial'])
  })

  it('ranks only the gateways that price the full mix', () => {
    const full = flat('full', 300)
    const partial = flat('partial', 100)
    const { ranked, incomparable } = rankGateways([full, partial], {
      ...input(100_000),
      mix: { upi: 100 },
    })
    // Both price UPI, so both rank.
    expect(ranked).toHaveLength(2)
    expect(incomparable).toHaveLength(0)
    expect(ranked[0]!.slug).toBe('partial')
  })
})

describe('rankGateways — the fixed-fee insight', () => {
  /**
   * BUILD-PLAN T1. The non-obvious result the calculator exists to surface.
   * A cheaper headline rate loses to a free one once the annual fee is counted.
   */
  const cheapRateHighFee = flat('cheap-rate', 175, 499_900) // 1.75% + Rs 4,999/yr
  const plainRateNoFee = flat('plain-rate', 200, 0) //        2.00% + nothing

  it('ranks the no-annual-fee option first at Rs 50,000 a month', () => {
    const { ranked } = rankGateways([cheapRateHighFee, plainRateNoFee], input(50_000))
    expect(ranked[0]!.slug).toBe('plain-rate')
    expect(ranked[0]!.deltaFromCheapestPaise).toBe(0n)
    expect(ranked[1]!.deltaFromCheapestPaise).toBeGreaterThan(0n)
  })

  it('reverses at Rs 20 lakh a month, where the rate dominates', () => {
    const { ranked } = rankGateways([cheapRateHighFee, plainRateNoFee], input(2_000_000))
    expect(ranked[0]!.slug).toBe('cheap-rate')
  })

  it('assigns ranks in ascending cost order', () => {
    const { ranked } = rankGateways([flat('c', 300), flat('a', 100), flat('b', 200)], input(100_000))
    expect(ranked.map((r) => r.slug)).toEqual(['a', 'b', 'c'])
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
  })
})
