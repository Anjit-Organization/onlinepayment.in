import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  IIN_RANGES,
  buildSigningString,
  computeSignature,
  getScheme,
  inspectCard,
  luhnCheckDigit,
  luhnValid,
  matchNetwork,
  normaliseCardNumber,
  signaturesMatch,
} from '@/modules/tools/client'
import {
  FIXED_NATIONAL_HOLIDAYS,
  computeSettlement,
  nonWorkingReason,
  saturdayOrdinal,
  toCal,
} from '@/modules/tools/client'
import { parseIfsc } from '@/modules/tools/client'

/**
 * These guard the things that are both easy to get wrong and expensive to ship
 * wrong: a hash that is subtly incorrect looks exactly like a hash that is
 * correct, and a settlement date that is one day out is indistinguishable from
 * one that is right until somebody's money is late.
 */

describe('signature crypto', () => {
  /**
   * RFC 4231 test case 2. This is the one test here that proves the crypto
   * itself rather than our wiring of it: the expected value comes from the
   * specification, not from another implementation.
   */
  it('matches the RFC 4231 HMAC-SHA256 vector', async () => {
    const scheme = getScheme('razorpay-webhook')!
    const sig = await computeSignature(scheme, {
      body: 'what do ya want for nothing?',
      secret: 'Jefe',
    })
    expect(sig).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')
  })

  it('agrees with node:crypto for a Razorpay-shaped payload', async () => {
    const scheme = getScheme('razorpay-webhook')!
    const body = '{"event":"payment.captured","payload":{"amount":149900}}'
    const secret = 'whsec_test_123'
    const expected = createHmac('sha256', secret).update(body).digest('hex')
    await expect(computeSignature(scheme, { body, secret })).resolves.toBe(expected)
  })

  it('base64-encodes Cashfree and hex-encodes Razorpay from the same inputs', async () => {
    const body = '{"type":"PAYMENT_SUCCESS"}'
    const secret = 's3cr3t'
    const cf = await computeSignature(getScheme('cashfree-webhook')!, {
      body,
      secret,
      timestamp: '1740000000',
    })
    const rz = await computeSignature(getScheme('razorpay-webhook')!, { body, secret })
    expect(cf).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(rz).toMatch(/^[0-9a-f]{64}$/)
    expect(cf).not.toBe(rz)
  })
})

describe('signing strings', () => {
  it('prepends the Cashfree timestamp with no separator', () => {
    const s = buildSigningString(getScheme('cashfree-webhook')!, {
      timestamp: '1740000000',
      body: '{"a":1}',
    })
    expect(s).toBe('1740000000{"a":1}')
  })

  /**
   * The delimiter count is the whole ballgame for PayU, and their own docs
   * contradict themselves about it. Asserting the literal string is the only
   * way this stays right through a refactor.
   */
  it('builds the PayU reverse hash with exactly six pipes between status and udf5', () => {
    const s = buildSigningString(getScheme('payu-response')!, {
      salt: 'SALT',
      status: 'success',
      email: 'a@b.com',
      firstname: 'Asha',
      productinfo: 'Order 1',
      amount: '1499.00',
      txnid: 'TXN1',
      key: 'gtKFFx',
    })
    // Six documented pipes after status, then five empty udf slots, which
    // contribute five more separators: eleven in total before email.
    expect(s).toBe('SALT|success|||||||||||a@b.com|Asha|Order 1|1499.00|TXN1|gtKFFx')
    expect(s.startsWith('SALT|success||||||')).toBe(true)
    expect(/^SALT\|success(\|{11})a@b\.com/.test(s)).toBe(true)
  })

  it('keeps udf values in reverse order', () => {
    const s = buildSigningString(getScheme('payu-response')!, {
      salt: 'S',
      status: 'success',
      udf1: 'one',
      udf5: 'five',
      email: 'e',
      firstname: 'f',
      productinfo: 'p',
      amount: '1',
      txnid: 't',
      key: 'k',
    })
    expect(s.indexOf('five')).toBeLessThan(s.indexOf('one'))
  })

  it('prepends additional_charges when PayU sends it', () => {
    const base = { salt: 'S', status: 'success', email: 'e', firstname: 'f', productinfo: 'p', amount: '1', txnid: 't', key: 'k' }
    const without = buildSigningString(getScheme('payu-response')!, base)
    const withCharge = buildSigningString(getScheme('payu-response')!, {
      ...base,
      additional_charges: '10.00',
    })
    expect(withCharge).toBe(`10.00|${without}`)
  })

  it('hashes only the credentials for PhonePe', () => {
    expect(
      buildSigningString(getScheme('phonepe-callback')!, { username: 'u', password: 'p' }),
    ).toBe('u:p')
  })
})

describe('signaturesMatch', () => {
  it('ignores case for hex but not for base64', () => {
    expect(signaturesMatch('ABCD', 'abcd', 'hex')).toBe(true)
    expect(signaturesMatch('ABCD', 'abcd', 'base64')).toBe(false)
  })

  it('rejects empty and mismatched lengths', () => {
    expect(signaturesMatch('abc', '', 'hex')).toBe(false)
    expect(signaturesMatch('', 'abc', 'hex')).toBe(false)
    expect(signaturesMatch('abc', 'abcd', 'hex')).toBe(false)
  })

  it('tolerates surrounding whitespace, which copy-paste adds', () => {
    expect(signaturesMatch('abcd', '  abcd\n', 'hex')).toBe(true)
  })
})

describe('card numbers', () => {
  it('strips spaces and dashes', () => {
    expect(normaliseCardNumber('4111 1111-1111 1111')).toBe('4111111111111111')
  })

  it('validates Luhn on the standard test numbers', () => {
    expect(luhnValid('4111111111111111')).toBe(true)
    expect(luhnValid('5555555555554444')).toBe(true)
    expect(luhnValid('378282246310005')).toBe(true)
    expect(luhnValid('4111111111111112')).toBe(false)
  })

  it('computes the check digit that would make a number valid', () => {
    const body = '411111111111111'
    expect(luhnValid(body + String(luhnCheckDigit(body)))).toBe(true)
  })

  /**
   * 65 is a Discover range and 652 is a RuPay range. Longest prefix must win,
   * or every RuPay card in that block gets reported as Discover — and the
   * domestic/international distinction is exactly what decides the MDR.
   */
  it('resolves overlapping prefixes by longest match', () => {
    const m = matchNetwork('6521000000000000')
    expect(m?.range.network).toBe('rupay')
    expect(m?.alsoMatched.map((r) => r.network)).toContain('discover')
  })

  it('reports Discover for 65 prefixes outside the RuPay block', () => {
    expect(matchNetwork('6511000000000000')?.range.network).toBe('discover')
  })

  it('flags RuPay as India-only and Visa as not', () => {
    expect(inspectCard('6072270000000000').domesticOnly).toBe(true)
    expect(inspectCard('4111111111111111').domesticOnly).toBe(false)
  })

  it('treats an unmatched prefix as unrecognised rather than invalid', () => {
    const c = inspectCard('999999')
    expect(c.unrecognised).toBe(true)
    expect(c.network).toBeNull()
  })

  it('checks length against the matched network', () => {
    expect(inspectCard('378282246310005').lengthOk).toBe(true)
    expect(inspectCard('3782822463100051').lengthOk).toBe(false)
  })

  it('declares no overlapping ranges within one network', () => {
    for (const a of IIN_RANGES) {
      const sameWidth = IIN_RANGES.filter(
        (b) => b !== a && b.network === a.network && b.digits === a.digits,
      )
      for (const b of sameWidth) {
        expect(a.to < b.from || a.from > b.to).toBe(true)
      }
    }
  })
})

describe('bank working days', () => {
  const cal = (iso: string) => toCal(iso)!

  it('rejects impossible dates', () => {
    expect(toCal('2026-04-31')).toBeNull()
    expect(toCal('2026-13-01')).toBeNull()
    expect(toCal('not-a-date')).toBeNull()
  })

  it('counts Saturday ordinals from the date, not the weekday run', () => {
    expect(saturdayOrdinal(cal('2026-11-14'))).toBe(2)
    expect(saturdayOrdinal(cal('2026-11-28'))).toBe(4)
    expect(saturdayOrdinal(cal('2026-11-07'))).toBe(1)
  })

  it('closes on Sundays and on second and fourth Saturdays only', () => {
    expect(nonWorkingReason(cal('2026-11-22'))?.kind).toBe('sunday')
    expect(nonWorkingReason(cal('2026-11-14'))?.kind).toBe('saturday-2nd-4th')
    expect(nonWorkingReason(cal('2026-11-28'))?.kind).toBe('saturday-2nd-4th')
    expect(nonWorkingReason(cal('2026-11-07'))).toBeNull()
    expect(nonWorkingReason(cal('2026-11-21'))).toBeNull()
  })

  it('observes the fixed national holidays', () => {
    for (const h of FIXED_NATIONAL_HOLIDAYS) {
      const iso = `2027-${String(h.m).padStart(2, '0')}-${String(h.d).padStart(2, '0')}`
      expect(nonWorkingReason(cal(iso))?.kind).toBe('national-holiday')
    }
  })

  it('honours a holiday the user declared', () => {
    expect(nonWorkingReason(cal('2027-03-04'), new Set(['2027-03-04']))?.kind).toBe(
      'declared-holiday',
    )
  })
})

describe('settlement dates', () => {
  const run = (iso: string, days: number, holidays: string[] = []) =>
    computeSettlement(toCal(iso)!, days, holidays)

  /**
   * The page's default example. Friday 27 November 2026 is followed by the
   * fourth Saturday, so a T+1 cycle takes three calendar days — which is the
   * entire reason this tool exists.
   */
  it('turns T+1 into three calendar days across a fourth-Saturday weekend', () => {
    const r = run('2026-11-27', 1)
    expect(r.settlement).toBe('2026-11-30')
    expect(r.calendarDaysWaited).toBe(3)
    expect(r.skippedCount).toBe(2)
  })

  it('settles on the capture date for a T+0 cycle', () => {
    const r = run('2026-11-24', 0)
    expect(r.settlement).toBe('2026-11-24')
    expect(r.calendarDaysWaited).toBe(0)
  })

  it('counts only working days for T+2 mid-week', () => {
    // Monday 23 Nov 2026 -> Tue 24, Wed 25.
    expect(run('2026-11-23', 2).settlement).toBe('2026-11-25')
  })

  it('pushes past a declared holiday', () => {
    const plain = run('2026-11-23', 2).settlement
    const withHoliday = run('2026-11-23', 2, ['2026-11-24']).settlement
    expect(plain).toBe('2026-11-25')
    expect(withHoliday).toBe('2026-11-26')
  })

  it('records a reason for every skipped day and an index for every counted one', () => {
    const r = run('2026-11-27', 1)
    for (const step of r.trail) {
      if (step.skipped) expect(step.workingDayIndex).toBeNull()
      else expect(step.workingDayIndex).toBeGreaterThan(0)
    }
    expect(r.trail.filter((s) => s.workingDayIndex !== null)).toHaveLength(1)
  })

  it('reports when the capture itself fell on a non-working day', () => {
    expect(run('2026-11-22', 1).captureOnNonWorkingDay?.kind).toBe('sunday')
    expect(run('2026-11-23', 1).captureOnNonWorkingDay).toBeNull()
  })

  it('never returns a settlement date on a non-working day', () => {
    for (let d = 1; d <= 28; d++) {
      const iso = `2026-11-${String(d).padStart(2, '0')}`
      for (const cycle of [1, 2, 3]) {
        const r = computeSettlement(toCal(iso)!, cycle)
        if (cycle > 0) expect(nonWorkingReason(toCal(r.settlement)!)).toBeNull()
      }
    }
  })
})

describe('IFSC parsing', () => {
  const known = new Set(['HDFC', 'SBIN'])

  it('accepts a well-formed code', () => {
    const r = parseIfsc('HDFC0000001', known)
    expect(r.structurallyValid).toBe(true)
    expect(r.problems).toHaveLength(0)
    expect(r.bankCode).toBe('HDFC')
    expect(r.branchCode).toBe('000001')
  })

  it('normalises case, spaces and dashes', () => {
    expect(parseIfsc('hdfc-000 0001', known).normalised).toBe('HDFC0000001')
  })

  /** Capital O for zero in position five is the commonest IFSC typo. */
  it('catches a letter O in the reserved position', () => {
    const r = parseIfsc('HDFCO000001', known)
    expect(r.structurallyValid).toBe(false)
    expect(r.problems.map((p) => p.kind)).toContain('fifth-char-not-zero')
  })

  it('reports wrong length', () => {
    expect(parseIfsc('HDFC000001', known).problems.map((p) => p.kind)).toContain('length')
  })

  it('flags an unknown bank code without calling the code malformed', () => {
    const r = parseIfsc('ZZZZ0000001', known)
    expect(r.structurallyValid).toBe(true)
    expect(r.problems.map((p) => p.kind)).toEqual(['unknown-bank-code'])
  })

  it('does not flag an unknown bank code when no list is supplied', () => {
    expect(parseIfsc('ZZZZ0000001').problems).toHaveLength(0)
  })
})
