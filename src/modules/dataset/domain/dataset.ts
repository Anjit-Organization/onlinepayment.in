import { bp, effectiveRate } from '@/common/money'
import { METHOD_LABEL, SOURCE_KIND_LABEL, type FeeMethod, type GatewaySeed } from '@/modules/pricing/client'

/**
 * The public dataset: one machine-readable projection of every verified pricing
 * record, served as JSON and CSV and described by Dataset JSON-LD.
 *
 * WHY PUBLISH THE DATA WE SELL ACCESS TO BY RANKING FOR IT:
 * a compilation nobody can cite is a compilation nobody links to. An assistant
 * answering "what does Razorpay charge for UPI" needs a figure it can attribute;
 * a developer pricing a checkout needs a file, not a table to retype. Both are
 * reasons to be the primary source rather than a page that happens to rank.
 * Attribution is the price, and CC BY makes it a condition rather than a hope.
 *
 * This module is a pure projection: gateways in, plain data out. It takes the
 * site URL as an argument rather than importing config, so the whole thing is
 * unit-testable without a build.
 */

/**
 * CC BY 4.0, with the version in the URL.
 *
 * WHAT IS ACTUALLY BEING LICENSED: not the figures. A rate of 2% is a fact, and
 * facts are not copyrightable in India or anywhere else. What is ours is the
 * compilation — which providers to cover, which methods to break out, the
 * GST-inclusive figure computed for each, and the verification date and source
 * attached to every row. CC BY covers that and asks for credit in return, which
 * is the only thing we want from a reuser.
 *
 * Google's structured-data guidance is explicit that a licence URL must pin a
 * version; the version-less /licenses/by/ form is listed as not recommended.
 */
export const DATASET_LICENSE = {
  id: 'CC-BY-4.0',
  name: 'Creative Commons Attribution 4.0 International',
  url: 'https://creativecommons.org/licenses/by/4.0/',
} as const

/**
 * Identity of the dataset, shared by the JSON envelope and the JSON-LD so the
 * two can never drift. `description` is deliberately over 50 characters: Google
 * requires 50–5000 for Dataset rich results.
 */
export const DATASET_META = {
  slug: 'india-payment-gateway-pricing',
  name: 'Indian payment gateway pricing',
  description:
    'Published transaction charges for Indian payment gateways, broken out by payment method. ' +
    'Every rate is recorded as the provider publishes it (GST-exclusive) alongside the ' +
    'GST-inclusive effective rate a merchant actually pays, and every record carries the date ' +
    'it was last checked, the kind of source it came from, and a link to that source. ' +
    'Rates are integers in basis points and all money is in paise, so no figure in this ' +
    'dataset has ever been through a float. Covers India only.',
  keywords: [
    'payment gateway',
    'India',
    'merchant discount rate',
    'MDR',
    'UPI',
    'payment processing fees',
    'pricing',
  ],
} as const

/** ISO 8601 open-ended interval: the dataset is ongoing, not a snapshot range. */
export const temporalCoverageFrom = (earliest: string) => `${earliest}/..`

export type DatasetFee = {
  method: FeeMethod
  methodLabel: string
  /** Authoritative. Basis points, integer: 195 means 1.95%. */
  rateBp: number | null
  /** Derived from rateBp for convenience. rateBp is the figure to trust. */
  ratePercent: number | null
  /** The same rate with 18% GST applied — what the merchant is actually billed. */
  effectiveRateBp: number | null
  effectiveRatePercent: number | null
  flatFeePaise: number | null
  minFeePaise: number | null
  maxFeePaise: number | null
  bandMinPaise: number | null
  bandMaxPaise: number | null
  note: string | null
}

export type DatasetProvider = {
  slug: string
  displayName: string
  legalName: string
  website: string
  hqCity: string | null
  parentCompany: string | null
  planName: string
  /** Provenance travels with every row; it is the point of the dataset. */
  verifiedAt: string
  verifiedBy: string
  sourceKind: string
  sourceKindLabel: string
  sourceUrl: string
  pageUrl: string
  settlementCycleDays: number | null
  chargebackFeePaise: number | null
  mdrRefundedOnRefund: boolean | null
  setupFeePaise: number
  annualMaintenancePaise: number
  monthlyFeePaise: number
  notCharged: string[]
  secondarySources: { label: string; url: string; covers: string }[]
  promos: { description: string; endsAt: string | null; sourceUrl: string }[]
  changes: {
    changedAt: string
    field: string
    oldValue: string
    newValue: string
    sourceUrl: string | null
  }[]
  fees: DatasetFee[]
}

export type PublicDataset = {
  name: string
  description: string
  /** The newest verification date in the data. See buildDataset. */
  version: string
  temporalCoverage: string
  license: { id: string; name: string; url: string }
  attribution: string
  landingPage: string
  methodology: string
  units: Record<string, string>
  coverage: {
    country: string
    providerCount: number
    feeCount: number
    methods: { id: FeeMethod; label: string }[]
  }
  disclaimer: string
  providers: DatasetProvider[]
}

const pct = (v: number | null): number | null => (v === null ? null : v / 100)

function projectFee(f: GatewaySeed['fees'][number]): DatasetFee {
  const eff = f.rateBp === null ? null : Number(effectiveRate(bp(f.rateBp)))
  return {
    method: f.method,
    methodLabel: METHOD_LABEL[f.method],
    rateBp: f.rateBp,
    ratePercent: pct(f.rateBp),
    effectiveRateBp: eff,
    effectiveRatePercent: pct(eff),
    flatFeePaise: f.flatFeePaise,
    minFeePaise: f.minFeePaise,
    maxFeePaise: f.maxFeePaise,
    bandMinPaise: f.bandMinPaise,
    bandMaxPaise: f.bandMaxPaise,
    note: f.note ?? null,
  }
}

/**
 * Builds the dataset from verified records.
 *
 * `version` is the newest verifiedAt in the data, NOT a build timestamp. A
 * timestamp would change the bytes on every deploy: every consumer's cache
 * would miss, every diff would be noise, and nobody could tell a re-deploy from
 * a repricing. Deriving it from the data means the version only moves when the
 * data does.
 *
 * Callers pass verified gateways. Filtering here as well is deliberate
 * belt-and-braces: this file writes a public, citable artefact, and a drafted
 * figure escaping into it would be worse than a drafted page being indexed.
 */
export function buildDataset(gateways: GatewaySeed[], siteUrl: string): PublicDataset {
  const verified = gateways
    .filter((g) => g.state === 'verified')
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))

  const providers: DatasetProvider[] = verified.map((g) => ({
    slug: g.slug,
    displayName: g.displayName,
    legalName: g.legalName,
    website: g.website,
    hqCity: g.hqCity ?? null,
    parentCompany: g.parentCompany ?? null,
    planName: g.planName,
    verifiedAt: g.verifiedAt,
    verifiedBy: g.verifiedBy,
    sourceKind: g.sourceKind,
    sourceKindLabel: SOURCE_KIND_LABEL[g.sourceKind],
    sourceUrl: g.sourceUrl,
    pageUrl: `${siteUrl}/charges/${g.slug}/`,
    settlementCycleDays: g.settlementCycleDays,
    chargebackFeePaise: g.chargebackFeePaise,
    mdrRefundedOnRefund: g.mdrRefundedOnRefund,
    setupFeePaise: g.setupFeePaise,
    annualMaintenancePaise: g.annualMaintenancePaise,
    monthlyFeePaise: g.monthlyFeePaise,
    notCharged: g.notCharged,
    secondarySources: g.secondarySources.map((s) => ({
      label: s.label,
      url: s.url,
      covers: s.covers,
    })),
    promos: g.promos.map((p) => ({
      description: p.description,
      endsAt: p.endsAt,
      sourceUrl: p.sourceUrl,
    })),
    changes: g.changes.map((c) => ({
      changedAt: c.changedAt,
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
      sourceUrl: c.sourceUrl ?? null,
    })),
    fees: g.fees.map(projectFee),
  }))

  const dates = providers.map((p) => p.verifiedAt).sort()
  const newest = dates.at(-1) ?? ''
  const earliest = dates[0] ?? ''

  /** Only the methods actually present, so the column list matches the rows. */
  const present = new Set(providers.flatMap((p) => p.fees.map((f) => f.method)))

  return {
    name: DATASET_META.name,
    description: DATASET_META.description,
    version: newest,
    temporalCoverage: temporalCoverageFrom(earliest),
    license: DATASET_LICENSE,
    attribution: `onlinepayment.in — ${siteUrl}/data/`,
    landingPage: `${siteUrl}/data/`,
    methodology: `${siteUrl}/methodology/`,
    units: {
      rateBp:
        'Basis points, integer. 195 means 1.95%. GST-exclusive, as the provider publishes it.',
      effectiveRateBp: 'The same rate with 18% GST applied. 195 becomes 230.',
      paise: 'Integer paise. 100 paise = 1 rupee. 120000 means Rs 1,200.',
      settlementCycleDays: 'T+n, where n is counted in bank working days.',
      dates: 'ISO 8601 (YYYY-MM-DD).',
    },
    coverage: {
      country: 'IN',
      providerCount: providers.length,
      feeCount: providers.reduce((n, p) => n + p.fees.length, 0),
      methods: [...present].map((id) => ({ id, label: METHOD_LABEL[id] })),
    },
    disclaimer:
      'Published rate-card pricing only. Negotiated rates differ, and a provider can change ' +
      'its rate card without notice. Check the source URL on a record before relying on it.',
    providers,
  }
}

/** The CSV header, in order. Exported so a test can pin it. */
export const CSV_COLUMNS = [
  'provider_slug',
  'provider_name',
  'payment_method',
  'rate_bp',
  'rate_percent',
  'effective_rate_bp_incl_gst',
  'effective_rate_percent_incl_gst',
  'flat_fee_paise',
  'min_fee_paise',
  'max_fee_paise',
  'band_min_paise',
  'band_max_paise',
  'setup_fee_paise',
  'annual_maintenance_paise',
  'monthly_fee_paise',
  'settlement_cycle_days',
  'verified_at',
  'source_kind',
  'source_url',
  'page_url',
  'note',
] as const

/**
 * RFC 4180 escaping. Notes contain commas, apostrophes and occasionally a quote
 * — one unescaped field would shift every column after it and silently corrupt
 * someone's spreadsheet, which is worse than failing outright.
 */
function csvCell(v: string | number | null): string {
  if (v === null) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

/** One row per (provider, method). The shape a spreadsheet wants. */
export function toCsv(dataset: PublicDataset): string {
  const rows: string[] = [CSV_COLUMNS.join(',')]

  for (const p of dataset.providers) {
    for (const f of p.fees) {
      rows.push(
        [
          p.slug,
          p.displayName,
          f.method,
          f.rateBp,
          f.ratePercent,
          f.effectiveRateBp,
          f.effectiveRatePercent,
          f.flatFeePaise,
          f.minFeePaise,
          f.maxFeePaise,
          f.bandMinPaise,
          f.bandMaxPaise,
          p.setupFeePaise,
          p.annualMaintenancePaise,
          p.monthlyFeePaise,
          p.settlementCycleDays,
          p.verifiedAt,
          p.sourceKind,
          p.sourceUrl,
          p.pageUrl,
          f.note,
        ].map(csvCell).join(','),
      )
    }
  }

  // Trailing newline: POSIX text files end with one, and `wc -l` is wrong without it.
  return rows.join('\n') + '\n'
}

/**
 * Dataset JSON-LD, per Google's structured-data reference. Required there are
 * only `name` and `description`; everything else here is on their recommended
 * list, and each one earns its place:
 *
 *   distribution     — the actual downloads. contentUrl is required on each.
 *   license          — version-pinned, as their guidance demands.
 *   creator          — a named human behind financial figures. YMYL.
 *   temporalCoverage — open-ended, because this is maintained, not archived.
 *   variableMeasured — what each row actually contains.
 *   isAccessibleForFree, version, identifier, sameAs, spatialCoverage, keywords.
 */
export function datasetJsonLd(
  dataset: PublicDataset,
  opts: { siteUrl: string; creator: string; publisher: string },
): Record<string, unknown> {
  const { siteUrl, creator, publisher } = opts
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${siteUrl}/data/#dataset`,
    name: dataset.name,
    alternateName: 'India payment gateway charges dataset',
    description: dataset.description,
    url: dataset.landingPage,
    sameAs: dataset.landingPage,
    identifier: `${siteUrl}/data/#${DATASET_META.slug}`,
    keywords: DATASET_META.keywords,
    license: dataset.license.url,
    isAccessibleForFree: true,
    version: dataset.version,
    dateModified: dataset.version,
    temporalCoverage: dataset.temporalCoverage,
    spatialCoverage: { '@type': 'Country', name: 'India' },
    inLanguage: 'en-IN',
    creator: { '@type': 'Person', name: creator, url: `${siteUrl}/about/` },
    publisher: { '@type': 'Organization', name: publisher, url: siteUrl },
    measurementTechnique:
      'Transcribed from each provider’s published rate card, or from a named third-party source where the provider publishes none. Every record carries the date it was checked.',
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'rate_bp', description: 'Published rate in basis points, GST-exclusive.' },
      {
        '@type': 'PropertyValue',
        name: 'effective_rate_bp_incl_gst',
        description: 'Published rate with 18% GST applied — the rate a merchant is billed.',
      },
      { '@type': 'PropertyValue', name: 'flat_fee_paise', description: 'Per-transaction flat fee in paise.' },
      { '@type': 'PropertyValue', name: 'settlement_cycle_days', description: 'Settlement cycle as T+n working days.' },
      { '@type': 'PropertyValue', name: 'verified_at', description: 'Date the record was last checked against its source.' },
    ],
    distribution: [
      {
        '@type': 'DataDownload',
        name: 'Pricing dataset (JSON)',
        encodingFormat: 'application/json',
        contentUrl: `${siteUrl}/data/pricing.json`,
      },
      {
        '@type': 'DataDownload',
        name: 'Pricing dataset (CSV)',
        encodingFormat: 'text/csv',
        contentUrl: `${siteUrl}/data/pricing.csv`,
      },
    ],
  }
}
