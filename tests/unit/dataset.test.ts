import { describe, expect, it } from 'vitest'
import {
  CSV_COLUMNS,
  DATASET_LICENSE,
  buildDataset,
  datasetJsonLd,
  temporalCoverageFrom,
  toCsv,
} from '@/modules/dataset'
import type { GatewaySeed } from '@/modules/pricing'

const base = {
  legalName: 'X Private Limited',
  website: 'https://x.test',
  state: 'verified' as const,
  verifiedAt: '2026-11-20',
  verifiedBy: 'test',
  sourceKind: 'official_rate_card' as const,
  sourceUrl: 'https://x.test/pricing',
  planName: 'Standard',
  setupFeePaise: 0,
  annualMaintenancePaise: 0,
  monthlyFeePaise: 0,
  settlementCycleDays: 2,
  chargebackFeePaise: null,
  mdrRefundedOnRefund: null,
  notCharged: [],
  promos: [],
  changes: [],
  secondarySources: [],
}

const emptyFee = {
  flatFeePaise: null,
  minFeePaise: null,
  maxFeePaise: null,
  bandMinPaise: null,
  bandMaxPaise: null,
}

const gw = (over: Partial<GatewaySeed> = {}): GatewaySeed => ({
  ...base,
  slug: 'alpha',
  displayName: 'Alpha',
  fees: [{ method: 'upi', rateBp: 200, ...emptyFee }],
  ...over,
})

const SITE = 'https://www.example.test'

describe('buildDataset: the verification gate', () => {
  it('excludes drafted records even when they are handed in', () => {
    const d = buildDataset(
      [gw(), gw({ slug: 'beta', displayName: 'Beta', state: 'draft', draftReason: 'unread' })],
      SITE,
    )
    expect(d.providers.map((p) => p.slug)).toEqual(['alpha'])
    expect(d.coverage.providerCount).toBe(1)
  })

  it('never emits the internal verification state', () => {
    const d = buildDataset([gw()], SITE)
    expect(JSON.stringify(d)).not.toContain('"state"')
    expect(d.providers[0]).not.toHaveProperty('state')
  })

  it('is empty, not broken, when nothing is verified', () => {
    const d = buildDataset([gw({ state: 'draft', draftReason: 'x' })], SITE)
    expect(d.providers).toEqual([])
    expect(d.version).toBe('')
    expect(() => JSON.stringify(d)).not.toThrow()
  })
})

describe('buildDataset: determinism', () => {
  it('versions from the newest verifiedAt, not the clock', () => {
    const d = buildDataset(
      [
        gw({ slug: 'a', verifiedAt: '2026-01-01' }),
        gw({ slug: 'b', verifiedAt: '2026-11-20' }),
        gw({ slug: 'c', verifiedAt: '2026-06-15' }),
      ],
      SITE,
    )
    expect(d.version).toBe('2026-11-20')
  })

  it('covers from the earliest verifiedAt, open-ended', () => {
    const d = buildDataset(
      [gw({ slug: 'a', verifiedAt: '2026-01-01' }), gw({ slug: 'b', verifiedAt: '2026-11-20' })],
      SITE,
    )
    expect(d.temporalCoverage).toBe('2026-01-01/..')
    expect(temporalCoverageFrom('2026-01-01')).toBe('2026-01-01/..')
  })

  it('orders providers by slug, so the bytes do not move with seed file order', () => {
    const order1 = buildDataset([gw({ slug: 'zeta' }), gw({ slug: 'alpha' })], SITE)
    const order2 = buildDataset([gw({ slug: 'alpha' }), gw({ slug: 'zeta' })], SITE)
    expect(JSON.stringify(order1)).toBe(JSON.stringify(order2))
  })

  it('serialises without a bigint anywhere in it', () => {
    // Money is bigint internally. A single Paise reaching the projection would
    // make JSON.stringify throw at build time, so this is the guard.
    expect(() => JSON.stringify(buildDataset([gw()], SITE))).not.toThrow()
  })
})

describe('buildDataset: the GST figure', () => {
  it('adds 18% GST to the published rate', () => {
    const [p] = buildDataset([gw()], SITE).providers
    const fee = p!.fees[0]!
    expect(fee.rateBp).toBe(200)
    expect(fee.effectiveRateBp).toBe(236)
    expect(fee.ratePercent).toBe(2)
    expect(fee.effectiveRatePercent).toBe(2.36)
  })

  it('rounds half-up, matching the rest of the site', () => {
    const d = buildDataset([gw({ fees: [{ method: 'upi', rateBp: 195, ...emptyFee }] })], SITE)
    // 195 * 1.18 = 230.1
    expect(d.providers[0]!.fees[0]!.effectiveRateBp).toBe(230)
  })

  it('leaves a flat-only fee with no rate rather than a zero rate', () => {
    const d = buildDataset(
      [gw({ fees: [{ method: 'upi', rateBp: null, ...emptyFee, flatFeePaise: 300 }] })],
      SITE,
    )
    const fee = d.providers[0]!.fees[0]!
    expect(fee.rateBp).toBeNull()
    expect(fee.effectiveRateBp).toBeNull()
    expect(fee.ratePercent).toBeNull()
    expect(fee.flatFeePaise).toBe(300)
  })
})

describe('buildDataset: coverage and citation', () => {
  it('lists only the methods actually present in the rows', () => {
    const d = buildDataset(
      [
        gw({
          fees: [
            { method: 'upi', rateBp: 200, ...emptyFee },
            { method: 'netbanking', rateBp: 300, ...emptyFee },
          ],
        }),
      ],
      SITE,
    )
    expect(d.coverage.methods.map((m) => m.id).sort()).toEqual(['netbanking', 'upi'])
    expect(d.coverage.feeCount).toBe(2)
  })

  it('gives every provider a resolvable page URL to cite', () => {
    const d = buildDataset([gw({ slug: 'razorpay' })], SITE)
    expect(d.providers[0]!.pageUrl).toBe(`${SITE}/charges/razorpay/`)
    expect(d.landingPage).toBe(`${SITE}/data/`)
  })

  it('carries a human-readable source-kind label alongside the raw value', () => {
    const d = buildDataset([gw({ sourceKind: 'secondary_source' })], SITE)
    expect(d.providers[0]!.sourceKind).toBe('secondary_source')
    expect(d.providers[0]!.sourceKindLabel).toBe('Third-party source')
  })
})

describe('toCsv', () => {
  const two = buildDataset(
    [
      gw({
        fees: [
          { method: 'upi', rateBp: 200, ...emptyFee },
          { method: 'netbanking', rateBp: 300, ...emptyFee },
        ],
      }),
    ],
    SITE,
  )

  it('writes a header plus one row per provider and method', () => {
    const lines = toCsv(two).trimEnd().split('\n')
    expect(lines[0]).toBe(CSV_COLUMNS.join(','))
    expect(lines).toHaveLength(3)
  })

  it('gives every row exactly as many fields as there are columns', () => {
    for (const line of toCsv(two).trimEnd().split('\n')) {
      // Counting commas is wrong once a field is quoted, so parse properly.
      expect(parseCsvLine(line)).toHaveLength(CSV_COLUMNS.length)
    }
  })

  it('escapes a note containing a comma, so no column shifts', () => {
    const csv = toCsv(
      buildDataset(
        [gw({ fees: [{ method: 'upi', rateBp: 200, ...emptyFee, note: 'Visa, Mastercard' }] })],
        SITE,
      ),
    )
    expect(csv).toContain('"Visa, Mastercard"')
    expect(parseCsvLine(csv.trimEnd().split('\n')[1]!)).toHaveLength(CSV_COLUMNS.length)
  })

  it('doubles an embedded quote, per RFC 4180', () => {
    const csv = toCsv(
      buildDataset(
        [
          gw({
            fees: [{ method: 'upi', rateBp: 200, ...emptyFee, note: 'Page says "up to 3%"' }],
          }),
        ],
        SITE,
      ),
    )
    expect(csv).toContain('"Page says ""up to 3%"""')
    const fields = parseCsvLine(csv.trimEnd().split('\n')[1]!)
    expect(fields.at(-1)).toBe('Page says "up to 3%"')
  })

  it('writes an empty field for a missing value, never the text "null"', () => {
    const csv = toCsv(
      buildDataset([gw({ fees: [{ method: 'upi', rateBp: null, ...emptyFee, flatFeePaise: 1 }] })], SITE),
    )
    expect(csv).not.toContain('null')
    const fields = parseCsvLine(csv.trimEnd().split('\n')[1]!)
    expect(fields[CSV_COLUMNS.indexOf('rate_bp')]).toBe('')
  })

  it('ends with a newline', () => {
    expect(toCsv(two).endsWith('\n')).toBe(true)
  })
})

describe('datasetJsonLd', () => {
  const ld = datasetJsonLd(buildDataset([gw()], SITE), {
    siteUrl: SITE,
    creator: 'A Person',
    publisher: 'Example',
  })

  it('carries both properties Google requires', () => {
    expect(ld.name).toBeTruthy()
    expect(ld.description).toBeTruthy()
  })

  it('keeps the description inside Google’s 50–5000 character window', () => {
    const len = String(ld.description).length
    expect(len).toBeGreaterThanOrEqual(50)
    expect(len).toBeLessThanOrEqual(5000)
  })

  it('pins a licence version, which the guidance requires', () => {
    expect(ld.license).toBe(DATASET_LICENSE.url)
    expect(ld.license).toMatch(/\/4\.0\/$/)
  })

  it('gives every distribution a contentUrl and an encodingFormat', () => {
    const dist = ld.distribution as { contentUrl?: string; encodingFormat?: string }[]
    expect(dist).toHaveLength(2)
    for (const d of dist) {
      expect(d.contentUrl).toMatch(/^https?:\/\//)
      expect(d.encodingFormat).toBeTruthy()
    }
    expect(dist.map((d) => d.encodingFormat)).toEqual(['application/json', 'text/csv'])
  })

  it('is valid JSON once inlined into a script tag', () => {
    expect(() => JSON.parse(JSON.stringify(ld))).not.toThrow()
  })
})

/** Minimal RFC 4180 reader — enough to prove our writer round-trips. */
function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else quoted = false
      } else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}
