import { bp, effectiveRate, formatINR, formatRate, paise } from '@/common/money'
import { METHOD_LABEL, type FeeMethod, type GatewaySeed } from '@/modules/pricing'

const METHODS: FeeMethod[] = [
  'upi',
  'credit_card_domestic',
  'debit_card',
  'netbanking',
  'wallet',
  'credit_card_intl',
]

const rateCell = (g: GatewaySeed, m: FeeMethod) => {
  const fee = g.fees.find((f) => f.method === m)
  if (!fee) return '—'
  if (fee.rateBp === 0) return '0%'
  if (fee.rateBp === null) return fee.flatFeePaise !== null
    ? formatINR(paise(BigInt(fee.flatFeePaise)), { whole: true })
    : '—'
  const flat = fee.flatFeePaise ? ` + ${formatINR(paise(BigInt(fee.flatFeePaise)), { whole: true })}` : ''
  return `${formatRate(bp(fee.rateBp))}${flat}`
}

const effCell = (g: GatewaySeed, m: FeeMethod) => {
  const fee = g.fees.find((f) => f.method === m)
  if (!fee || fee.rateBp === null || fee.rateBp === 0) return null
  return formatRate(effectiveRate(bp(fee.rateBp)))
}

/**
 * Differences only where it matters. Identical rows are noise on a comparison
 * page, so each row is marked when the two providers actually differ.
 */
export function ComparisonTable({ a, b }: { a: GatewaySeed; b: GatewaySeed }) {
  const rows: { label: string; av: string; bv: string; aEff?: string | null; bEff?: string | null }[] =
    METHODS.map((m) => ({
      label: METHOD_LABEL[m],
      av: rateCell(a, m),
      bv: rateCell(b, m),
      aEff: effCell(a, m),
      bEff: effCell(b, m),
    }))

  const money = (v: number) => (v === 0 ? 'None' : formatINR(paise(BigInt(v)), { whole: true }))

  rows.push(
    { label: 'Setup fee', av: money(a.setupFeePaise), bv: money(b.setupFeePaise) },
    { label: 'Annual maintenance', av: money(a.annualMaintenancePaise), bv: money(b.annualMaintenancePaise) },
    { label: 'Monthly fee', av: money(a.monthlyFeePaise), bv: money(b.monthlyFeePaise) },
    {
      label: 'Settlement',
      av: a.settlementCycleDays === null ? 'Not published' : `T+${a.settlementCycleDays}`,
      bv: b.settlementCycleDays === null ? 'Not published' : `T+${b.settlementCycleDays}`,
    },
  )

  return (
    <div className="table-scroll table-scroll--sticky">
      <table className="data-table data-table--zebra">
        <caption className="sr-only">
          {a.displayName} and {b.displayName} published rates and fixed costs, side by side
        </caption>
        <thead>
          <tr>
            <th scope="col">Charge</th>
            <th scope="col">{a.displayName}</th>
            <th scope="col">{b.displayName}</th>
            <th scope="col">Differs?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const differs = r.av !== r.bv
            return (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td data-label={a.displayName}>
                  <span className="font-mono">{r.av}</span>
                  {r.aEff && (
                    <span className="ms-1 text-caption text-fg-muted">({r.aEff} eff.)</span>
                  )}
                </td>
                <td data-label={b.displayName}>
                  <span className="font-mono">{r.bv}</span>
                  {r.bEff && (
                    <span className="ms-1 text-caption text-fg-muted">({r.bEff} eff.)</span>
                  )}
                </td>
                {/* Text, not colour alone. UI.md §5.4 */}
                <td data-label="Differs?" className="text-caption">
                  {differs ? 'Different' : 'Same'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
