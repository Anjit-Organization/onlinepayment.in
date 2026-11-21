import {
  type BasisPoints,
  type Paise,
  GST_BP,
  addPaise,
  applyRate,
  bp,
  computeFee,
  paise,
} from '@/common/money'
import type { Fee, FeeMethod, GatewaySeed } from '@/modules/pricing/client'

/**
 * The true-cost engine. BUILD-PLAN T1.
 *
 * The insight this exists to surface: a 1.75% gateway with a Rs 4,999 annual fee
 * costs MORE than a 2% gateway with no annual fee at low volume. Every listicle
 * in this niche gets that wrong because it compares headline rates alone.
 *
 * Pure: no DB, no framework, no env. Fully testable.
 */

/** Percentage split across payment methods. Values are whole percents. */
export type MethodMix = Partial<Record<FeeMethod, number>>

export type CalcInput = {
  monthlyVolumePaise: Paise
  /** Needed to resolve tiered bands — UPI MDR above Rs 2,000 depends on it. */
  avgTransactionPaise: Paise
  mix: MethodMix
  /** Setup fees are a first-year cost only. */
  includeSetupFee: boolean
}

export type MethodBreakdown = {
  method: FeeMethod
  sharePercent: number
  monthlyVolumePaise: Paise
  annualFeePaise: Paise
  rateBp: BasisPoints | null
  supported: boolean
}

export type GatewayCost = {
  slug: string
  displayName: string
  state: GatewaySeed['state']
  /** Everything below is GST-inclusive unless the name says otherwise. */
  annualTotalPaise: Paise
  annualMdrExGstPaise: Paise
  annualFixedPaise: Paise
  gstPaise: Paise
  /** What the merchant effectively pays as a share of volume, GST included. */
  blendedRateBp: BasisPoints
  breakdown: MethodBreakdown[]
  unsupportedMethods: FeeMethod[]
  /**
   * Share of the requested mix we have a published rate for, in percent.
   * Below 100 the total UNDERSTATES real cost, because unpriced volume is
   * charged nothing — so the gateway must not be ranked against others.
   */
  pricedSharePercent: number
}

export const DEFAULT_MIX: MethodMix = {
  upi: 65,
  credit_card_domestic: 15,
  debit_card: 10,
  netbanking: 7,
  wallet: 3,
}

export const normaliseMix = (mix: MethodMix): MethodMix => {
  const total = Object.values(mix).reduce<number>((a, b) => a + (b ?? 0), 0)
  if (total === 0) return DEFAULT_MIX
  if (total === 100) return mix
  const out: MethodMix = {}
  for (const [k, v] of Object.entries(mix)) {
    out[k as FeeMethod] = ((v ?? 0) / total) * 100
  }
  return out
}

/**
 * Picks the fee row for a method, resolving tiered bands against the average
 * transaction size. A banded row only applies if the average falls inside it.
 */
function selectFee(fees: Fee[], method: FeeMethod, avgTxn: Paise): Fee | undefined {
  const candidates = fees.filter((f) => f.method === method)
  if (candidates.length === 0) return undefined

  const avg = Number(avgTxn)
  const banded = candidates.find((f) => {
    if (f.bandMinPaise === null && f.bandMaxPaise === null) return false
    const lo = f.bandMinPaise ?? 0
    const hi = f.bandMaxPaise ?? Number.MAX_SAFE_INTEGER
    return avg >= lo && avg < hi
  })
  if (banded) return banded

  return candidates.find((f) => f.bandMinPaise === null && f.bandMaxPaise === null) ?? candidates[0]
}

export function computeGatewayCost(gateway: GatewaySeed, input: CalcInput): GatewayCost {
  const mix = normaliseMix(input.mix)
  const breakdown: MethodBreakdown[] = []
  const unsupported: FeeMethod[] = []
  let annualMdr = paise(0n)

  for (const [methodKey, share] of Object.entries(mix)) {
    const method = methodKey as FeeMethod
    const sharePercent = share ?? 0
    if (sharePercent <= 0) continue

    // Share of monthly volume routed through this method.
    const methodMonthly = applyRate(input.monthlyVolumePaise, bp(Math.round(sharePercent * 100)))
    const fee = selectFee(gateway.fees, method, input.avgTransactionPaise)

    if (!fee) {
      unsupported.push(method)
      breakdown.push({
        method,
        sharePercent,
        monthlyVolumePaise: methodMonthly,
        annualFeePaise: paise(0n),
        rateBp: null,
        supported: false,
      })
      continue
    }

    // Per-transaction flat fees scale with transaction COUNT, not volume.
    const txnsPerMonth =
      fee.flatFeePaise !== null && Number(input.avgTransactionPaise) > 0
        ? Math.round(Number(methodMonthly) / Number(input.avgTransactionPaise))
        : 0

    const monthlyPercentPart =
      fee.rateBp !== null ? applyRate(methodMonthly, bp(fee.rateBp)) : paise(0n)
    const monthlyFlatPart =
      fee.flatFeePaise !== null ? paise(BigInt(fee.flatFeePaise) * BigInt(txnsPerMonth)) : paise(0n)

    const monthlyFee = computeFee(methodMonthly, {
      rateBp: null,
      flatPaise: addPaise(monthlyPercentPart, monthlyFlatPart),
      minPaise: fee.minFeePaise !== null ? paise(BigInt(fee.minFeePaise)) : null,
      maxPaise: fee.maxFeePaise !== null ? paise(BigInt(fee.maxFeePaise)) : null,
    })

    const annualFee = paise(monthlyFee * 12n)
    annualMdr = addPaise(annualMdr, annualFee)

    breakdown.push({
      method,
      sharePercent,
      monthlyVolumePaise: methodMonthly,
      annualFeePaise: annualFee,
      rateBp: fee.rateBp !== null ? bp(fee.rateBp) : null,
      supported: true,
    })
  }

  // Fixed costs: the part headline rates hide.
  const annualFixed = addPaise(
    paise(BigInt(gateway.annualMaintenancePaise)),
    paise(BigInt(gateway.monthlyFeePaise) * 12n),
    input.includeSetupFee ? paise(BigInt(gateway.setupFeePaise)) : paise(0n),
  )

  const exGstTotal = addPaise(annualMdr, annualFixed)
  const gst = applyRate(exGstTotal, GST_BP)
  const total = addPaise(exGstTotal, gst)

  const annualVolume = paise(input.monthlyVolumePaise * 12n)
  const blendedRateBp =
    annualVolume > 0n ? bp(Math.round((Number(total) / Number(annualVolume)) * 10_000)) : bp(0)

  breakdown.sort((a, b) => Number(b.annualFeePaise - a.annualFeePaise))

  const pricedSharePercent = breakdown
    .filter((x) => x.supported)
    .reduce((acc, x) => acc + x.sharePercent, 0)

  return {
    slug: gateway.slug,
    displayName: gateway.displayName,
    state: gateway.state,
    annualTotalPaise: total,
    annualMdrExGstPaise: annualMdr,
    annualFixedPaise: annualFixed,
    gstPaise: gst,
    blendedRateBp,
    breakdown,
    unsupportedMethods: unsupported,
    pricedSharePercent: Math.round(pricedSharePercent),
  }
}

export type RankedCost = GatewayCost & {
  rank: number
  /** Difference from the cheapest option. Far more actionable than two absolutes. */
  deltaFromCheapestPaise: Paise
}

export type RankingResult = {
  ranked: RankedCost[]
  /**
   * Gateways that do not publish a rate for every method in the mix. Ranking
   * these alongside the others would understate their cost and produce a false
   * "cheapest" — PayU, for instance, publishes no UPI rate at all.
   */
  incomparable: GatewayCost[]
}

/** Ranked cheapest first. Ranking is computed from data — never from commission. */
export function rankGateways(gateways: GatewaySeed[], input: CalcInput): RankingResult {
  const all = gateways.map((g) => computeGatewayCost(g, input))

  const comparable = all.filter((c) => c.pricedSharePercent >= 100)
  const incomparable = all
    .filter((c) => c.pricedSharePercent < 100)
    .sort((a, b) => b.pricedSharePercent - a.pricedSharePercent)

  comparable.sort((a, b) => Number(a.annualTotalPaise - b.annualTotalPaise))

  const cheapest = comparable[0]?.annualTotalPaise ?? paise(0n)
  const ranked = comparable.map((c, i) => ({
    ...c,
    rank: i + 1,
    deltaFromCheapestPaise: paise(c.annualTotalPaise - cheapest),
  }))

  return { ranked, incomparable }
}
