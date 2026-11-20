import { describe, expect, it } from 'vitest'
import {
  GST_BP,
  addGst,
  applyRate,
  bp,
  computeFee,
  effectiveRate,
  formatINR,
  formatRate,
  paise,
  percent,
  rupees,
  toPaiseString,
} from '@/common/money'

/**
 * 100% coverage target. TECHNICAL.md §8.
 * This is the priority test file: the fee engine IS the product, and a one-paise
 * drift on a comparison page destroys the only thing the site sells.
 */

describe('constructors', () => {
  it('converts rupees to paise', () => {
    expect(rupees(1250.5)).toBe(125050n)
    expect(rupees(0)).toBe(0n)
    expect(rupees(0.01)).toBe(1n)
  })

  it('converts percent to basis points', () => {
    expect(percent(1.95)).toBe(195)
    expect(percent(0.4)).toBe(40)
    expect(percent(2)).toBe(200)
    expect(percent(18)).toBe(1800)
  })

  it('rejects non-integer basis points', () => {
    expect(() => bp(1.5)).toThrow(RangeError)
  })
})

describe('applyRate', () => {
  it('applies a rate exactly', () => {
    // Rs 1,000.00 at 2% = Rs 20.00
    expect(applyRate(rupees(1000), percent(2))).toBe(2000n)
    // Rs 1,000.00 at 1.95% = Rs 19.50
    expect(applyRate(rupees(1000), percent(1.95))).toBe(1950n)
  })

  it('rounds half-up to the nearest paise', () => {
    // 333 paise at 1.95% = 6.4935 paise -> 6
    expect(applyRate(paise(333n), percent(1.95))).toBe(6n)
    // 1 paise at 50% = 0.5 paise -> 1 (half-up, not banker's rounding)
    expect(applyRate(paise(1n), percent(50))).toBe(1n)
    // 1 paise at 49% = 0.49 -> 0
    expect(applyRate(paise(1n), percent(49))).toBe(0n)
  })

  it('handles zero', () => {
    expect(applyRate(rupees(0), percent(2))).toBe(0n)
    expect(applyRate(rupees(1000), bp(0))).toBe(0n)
  })

  it('stays exact at crore scale where a float would drift', () => {
    // Rs 100,00,00,000.00 (100 crore) at 1.95%
    const amount = rupees(1_000_000_000)
    expect(applyRate(amount, percent(1.95))).toBe(1_950_000_000n)
  })
})

describe('GST', () => {
  it('uses 18%', () => {
    expect(GST_BP).toBe(1800)
  })

  it('adds GST to a fee', () => {
    // Rs 20.00 fee + 18% = Rs 23.60
    expect(addGst(rupees(20))).toBe(2360n)
  })

  it('computes the effective rate a merchant actually pays', () => {
    // The number competitors never print: 2.00% really costs 2.36%
    expect(effectiveRate(percent(2))).toBe(236)
    expect(effectiveRate(percent(1.95))).toBe(230) // 2.301% -> 230bp
    expect(effectiveRate(percent(0.4))).toBe(47)
  })
})

describe('computeFee', () => {
  it('combines a percentage and a flat fee', () => {
    // Instamojo-shaped: 2% + Rs 3
    const fee = computeFee(rupees(1000), { rateBp: percent(2), flatPaise: rupees(3) })
    expect(fee).toBe(2300n) // Rs 23.00
  })

  it('applies a floor', () => {
    const fee = computeFee(rupees(10), { rateBp: percent(2), minPaise: rupees(5) })
    expect(fee).toBe(500n)
  })

  it('applies a cap', () => {
    const fee = computeFee(rupees(100000), { rateBp: percent(2), maxPaise: rupees(500) })
    expect(fee).toBe(50000n)
  })

  it('returns zero when nothing applies', () => {
    expect(computeFee(rupees(1000), {})).toBe(0n)
  })

  it('treats null the same as absent', () => {
    expect(computeFee(rupees(1000), { rateBp: percent(2), flatPaise: null })).toBe(2000n)
  })
})

describe('the fixed-fee insight', () => {
  /**
   * BUILD-PLAN T1. The non-obvious result the calculator exists to surface, and
   * the thing every listicle in this niche gets wrong by comparing headline
   * rates alone.
   */
  it('ranks 2% with no annual fee below 1.95% + Rs 4,999/yr at low volume', () => {
    const monthly = rupees(50_000)
    const months = 12

    const a = applyRate(monthly, percent(2)) * BigInt(months)
    const b = applyRate(monthly, percent(1.95)) * BigInt(months) + rupees(4999)

    expect(a).toBeLessThan(b)
  })

  it('reverses at high volume, where the rate dominates the fixed fee', () => {
    const monthly = rupees(5_000_000)
    const months = 12

    const a = applyRate(monthly, percent(2)) * BigInt(months)
    const b = applyRate(monthly, percent(1.95)) * BigInt(months) + rupees(4999)

    expect(b).toBeLessThan(a)
  })
})

describe('formatting', () => {
  it('uses lakh/crore grouping, not thousands', () => {
    // Rs 12,50,000 — never Rs 1,250,000
    const out = formatINR(rupees(1_250_000), { whole: true })
    expect(out).toContain('12,50,000')
  })

  it('shows two decimals by default', () => {
    expect(formatINR(rupees(1250.5))).toContain('1,250.50')
  })

  it('formats rates', () => {
    expect(formatRate(percent(1.95))).toBe('1.95%')
    expect(formatRate(percent(2))).toBe('2.00%')
  })

  it('serialises paise as a string, since bigint is not JSON-safe', () => {
    expect(toPaiseString(rupees(1250.5))).toBe('125050')
    expect(() => JSON.stringify({ v: rupees(1) })).toThrow(TypeError)
  })
})
