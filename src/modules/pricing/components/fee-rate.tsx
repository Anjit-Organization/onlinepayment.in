import { bp, effectiveRate, formatINR, formatRate, paise } from '@/common/money'
import type { Fee } from '../domain/pricing.schema'

/**
 * Every competitor prints "2%". The number a merchant actually pays is 2.36%.
 * Showing both, always, is the product insight encoded as a component. UI.md §7.2.
 */
export function FeeRate({ fee }: { fee: Fee }) {
  const hasRate = fee.rateBp !== null
  const hasFlat = fee.flatFeePaise !== null

  if (!hasRate && !hasFlat) return <span className="text-fg-subtle">&mdash;</span>

  if (hasRate && fee.rateBp === 0 && !hasFlat) {
    return (
      <span className="font-mono text-data text-fresh">
        0%
        <span className="ms-1 font-sans text-caption text-fg-muted">no charge</span>
      </span>
    )
  }

  const rateLabel = hasRate ? formatRate(bp(fee.rateBp!)) : null
  const flatLabel = hasFlat ? formatINR(paise(BigInt(fee.flatFeePaise!)), { whole: true }) : null
  const headline = [rateLabel, flatLabel].filter(Boolean).join(' + ')

  // GST is applied once, at display, from a GST-exclusive stored rate.
  const effective = hasRate ? formatRate(effectiveRate(bp(fee.rateBp!))) : null

  return (
    <span className="inline-flex flex-col items-end gap-0.5 md:items-start">
      <span className="font-mono text-data font-medium">{headline}</span>
      <span className="text-caption text-fg-muted">
        {effective ? `+18% GST → ${effective} effective` : '+18% GST'}
      </span>
      {fee.note && <span className="text-caption text-fg-subtle">{fee.note}</span>}
    </span>
  )
}
