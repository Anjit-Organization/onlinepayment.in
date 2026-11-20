import { type Paise, paise, rupees } from '@/common/money'
import { computeGatewayCost, type CalcInput } from '@/modules/calculator'
import type { GatewaySeed } from '@/modules/pricing'

/**
 * The computed verdict. BUILD-PLAN T3 / UI.md §8.3.
 *
 * "Cashfree is cheaper above Rs 3.2L/month, Razorpay below it" is the answer a
 * comparison page exists to give. It is derived from our own dataset and
 * recomputed whenever the data changes — never written by hand, which is what
 * makes these pages survive Google's template-comparison crackdown.
 *
 * Annual cost is linear in volume (rate x volume + fixed costs), so two
 * gateways' cost lines intersect at most once. That makes a binary search both
 * valid and exact to the rupee.
 */

export type Crossover =
  | { kind: 'tie' }
  | { kind: 'always'; winner: string; loser: string }
  | { kind: 'crosses'; atPaise: Paise; cheaperBelow: string; cheaperAbove: string }

const SEARCH_MIN = rupees(1_000)
const SEARCH_MAX = rupees(100_000_000) // Rs 10 crore a month

/** Returns the cheaper slug, or null when the two cost exactly the same. */
const cheaperAt = (
  a: GatewaySeed,
  b: GatewaySeed,
  base: CalcInput,
  monthly: Paise,
): string | null => {
  const input = { ...base, monthlyVolumePaise: monthly }
  const ca = computeGatewayCost(a, input).annualTotalPaise
  const cb = computeGatewayCost(b, input).annualTotalPaise
  if (ca === cb) return null
  return ca < cb ? a.slug : b.slug
}

export function findCrossover(
  a: GatewaySeed,
  b: GatewaySeed,
  base: CalcInput,
): Crossover {
  const atMin = cheaperAt(a, b, base, SEARCH_MIN)
  const atMax = cheaperAt(a, b, base, SEARCH_MAX)

  // Identically priced. Saying one "is cheaper" here would be a false claim —
  // and a tie-break that silently favours the alphabetically-first provider is
  // exactly the kind of invented difference this site exists to avoid.
  if (atMin === null && atMax === null) return { kind: 'tie' }

  if (atMin === atMax) {
    const winner = atMin!
    return {
      kind: 'always',
      winner,
      loser: winner === a.slug ? b.slug : a.slug,
    }
  }

  // Equal at one end but not the other: one is cheaper only in part of the
  // range, so report the end where a real difference exists.
  if (atMin === null || atMax === null) {
    const winner = (atMin ?? atMax)!
    return { kind: 'always', winner, loser: winner === a.slug ? b.slug : a.slug }
  }

  // Bisect to the nearest rupee.
  let lo = SEARCH_MIN
  let hi = SEARCH_MAX
  while (hi - lo > 100n) {
    const mid = paise((lo + hi) / 2n)
    if (cheaperAt(a, b, base, mid) === atMin) lo = mid
    else hi = mid
  }

  return { kind: 'crosses', atPaise: hi, cheaperBelow: atMin, cheaperAbove: atMax }
}

/** Deterministic pair ordering, so each pair has exactly one URL. */
export const pairSlug = (a: string, b: string): string =>
  [a, b].sort().join('-vs-')

export function allPairs(slugs: string[]): [string, string][] {
  const sorted = [...slugs].sort()
  const out: [string, string][] = []
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      out.push([sorted[i]!, sorted[j]!])
    }
  }
  return out
}

export function parsePairSlug(slug: string): [string, string] | null {
  const parts = slug.split('-vs-')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  return [parts[0], parts[1]]
}
