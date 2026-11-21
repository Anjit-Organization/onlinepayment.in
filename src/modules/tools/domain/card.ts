/**
 * Card number inspection from the IIN (issuer identification number).
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * Every "BIN lookup" site claims to name the issuing bank and country. They do
 * that from commercial BIN databases of uncertain provenance that are wrong
 * often enough to matter, and reselling one would make this page the least
 * trustworthy thing on the site. So: we identify the NETWORK, which is
 * determined by published prefix ranges and is checkable, and we are explicit
 * that the issuer and country are not knowable from the number alone.
 *
 * Why a merchant cares: the network and card type decide the MDR. RuPay debit
 * is 0% under the 2020 zero-MDR mandate, domestic credit is ~2%, and an
 * international card is ~3% at every provider we track. Same basket, three
 * different costs, and the only signal available at checkout is the IIN.
 *
 * SOURCING. Ranges marked 'published' come from the network's own published
 * allocations and the ISO/IEC 7812 register. Ranges marked 'third_party' are
 * attributed to BIN aggregators because the network does not publish a public
 * list — which is the case for RuPay: NPCI's consolidated circular defines the
 * IIN structure and mandates 8-digit IINs, but publishes no range list.
 */

export type RangeBasis = 'published' | 'third_party'

export type CardNetwork =
  | 'visa'
  | 'mastercard'
  | 'rupay'
  | 'amex'
  | 'diners'
  | 'discover'
  | 'jcb'
  | 'unionpay'
  | 'maestro'

export const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'American Express',
  diners: 'Diners Club',
  discover: 'Discover',
  jcb: 'JCB',
  unionpay: 'UnionPay',
  maestro: 'Maestro',
}

/** Is the network issued only in India? Decides whether domestic MDR can apply. */
export const DOMESTIC_ONLY: Record<CardNetwork, boolean> = {
  rupay: true,
  visa: false,
  mastercard: false,
  amex: false,
  diners: false,
  discover: false,
  jcb: false,
  unionpay: false,
  maestro: false,
}

export type IinRange = {
  network: CardNetwork
  /** Inclusive numeric prefix bounds, compared at the width of `digits`. */
  from: number
  to: number
  digits: number
  /** Valid total card lengths for this range. */
  lengths: number[]
  basis: RangeBasis
  sourceLabel: string
  sourceUrl: string
}

const ISO = {
  basis: 'published' as RangeBasis,
  sourceLabel: 'ISO/IEC 7812 issuer identification register',
  sourceUrl: 'https://www.iso.org/standard/70484.html',
}

const NPCI_CIRCULAR = {
  basis: 'third_party' as RangeBasis,
  sourceLabel: 'BIN aggregator listings; NPCI publishes no public RuPay range list',
  sourceUrl: 'https://www.npci.org.in/what-we-do/rupay/product-overview',
}

/**
 * Order does not matter: matching is longest-prefix-wins, so RuPay's 652
 * correctly beats Discover's 65 rather than depending on array position.
 */
export const IIN_RANGES: readonly IinRange[] = [
  { network: 'visa', from: 4, to: 4, digits: 1, lengths: [13, 16, 19], ...ISO },

  { network: 'mastercard', from: 51, to: 55, digits: 2, lengths: [16], ...ISO },
  { network: 'mastercard', from: 2221, to: 2720, digits: 4, lengths: [16], ...ISO },

  { network: 'amex', from: 34, to: 34, digits: 2, lengths: [15], ...ISO },
  { network: 'amex', from: 37, to: 37, digits: 2, lengths: [15], ...ISO },

  { network: 'diners', from: 300, to: 305, digits: 3, lengths: [14, 16, 19], ...ISO },
  { network: 'diners', from: 3095, to: 3095, digits: 4, lengths: [14, 16, 19], ...ISO },
  { network: 'diners', from: 36, to: 36, digits: 2, lengths: [14, 16, 19], ...ISO },
  { network: 'diners', from: 38, to: 39, digits: 2, lengths: [14, 16, 19], ...ISO },

  { network: 'jcb', from: 3528, to: 3589, digits: 4, lengths: [16, 17, 18, 19], ...ISO },

  { network: 'discover', from: 6011, to: 6011, digits: 4, lengths: [16, 19], ...ISO },
  { network: 'discover', from: 644, to: 649, digits: 3, lengths: [16, 19], ...ISO },
  { network: 'discover', from: 65, to: 65, digits: 2, lengths: [16, 19], ...ISO },

  { network: 'unionpay', from: 62, to: 62, digits: 2, lengths: [16, 17, 18, 19], ...ISO },

  { network: 'maestro', from: 5018, to: 5018, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },
  { network: 'maestro', from: 5020, to: 5020, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },
  { network: 'maestro', from: 5038, to: 5038, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },
  { network: 'maestro', from: 5893, to: 5893, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },
  { network: 'maestro', from: 6304, to: 6304, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },
  { network: 'maestro', from: 6759, to: 6763, digits: 4, lengths: [12, 13, 14, 15, 16, 17, 18, 19], ...ISO },

  // RuPay. Attributed, not claimed as official — see NPCI_CIRCULAR above.
  { network: 'rupay', from: 508, to: 508, digits: 3, lengths: [16], ...NPCI_CIRCULAR },
  { network: 'rupay', from: 606, to: 607, digits: 3, lengths: [16], ...NPCI_CIRCULAR },
  { network: 'rupay', from: 652, to: 652, digits: 3, lengths: [16], ...NPCI_CIRCULAR },
]

/** Digits only. Spaces and dashes are how humans write card numbers. */
export const normaliseCardNumber = (input: string): string => input.replace(/\D+/g, '')

/**
 * The Luhn check digit. Catches single-digit typos and most transpositions.
 *
 * A number can pass Luhn and still not exist — Luhn is a typo check, not a
 * validity check, and saying otherwise is the most common error in writing
 * about this.
 */
export function luhnValid(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** Recompute the final digit that would make `digits` (sans check digit) valid. */
export function luhnCheckDigit(withoutCheckDigit: string): number {
  let sum = 0
  let double = true
  for (let i = withoutCheckDigit.length - 1; i >= 0; i--) {
    let d = withoutCheckDigit.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return (10 - (sum % 10)) % 10
}

export type NetworkMatch = {
  range: IinRange
  /** Other ranges whose prefix also matched, shorter. Surfaced, not hidden. */
  alsoMatched: IinRange[]
}

/** Longest matching prefix wins; everything else it overlapped is reported. */
export function matchNetwork(digits: string): NetworkMatch | null {
  const hits = IIN_RANGES.filter((r) => {
    if (digits.length < r.digits) return false
    const head = Number(digits.slice(0, r.digits))
    return head >= r.from && head <= r.to
  }).sort((a, b) => b.digits - a.digits)

  const best = hits[0]
  if (!best) return null
  return {
    range: best,
    alsoMatched: hits.filter((r) => r.network !== best.network),
  }
}

export type CardInspection = {
  digits: string
  /** How much of the IIN we can see. 6 or 8 digits is enough to name a network. */
  iin: string
  network: NetworkMatch | null
  luhn: 'pass' | 'fail' | 'too-short'
  lengthOk: boolean | null
  expectedLengths: number[]
  domesticOnly: boolean | null
  /** Set when the digits matched nothing — a real outcome, not an error. */
  unrecognised: boolean
  ambiguous: boolean
}

export function inspectCard(input: string): CardInspection {
  const digits = normaliseCardNumber(input)
  const network = matchNetwork(digits)
  const expectedLengths = network?.range.lengths ?? []

  return {
    digits,
    iin: digits.slice(0, 8),
    network,
    luhn: digits.length < 12 ? 'too-short' : luhnValid(digits) ? 'pass' : 'fail',
    lengthOk: expectedLengths.length === 0 ? null : expectedLengths.includes(digits.length),
    expectedLengths,
    domesticOnly: network ? DOMESTIC_ONLY[network.range.network] : null,
    unrecognised: digits.length >= 6 && network === null,
    ambiguous: (network?.alsoMatched.length ?? 0) > 0,
  }
}
