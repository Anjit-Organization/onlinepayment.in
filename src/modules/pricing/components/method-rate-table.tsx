import Link from 'next/link'
import { bp, effectiveRate, formatINR, formatRate, paise } from '@/common/money'
import type { FeeMethod } from '../domain/pricing.constants'
import type { GatewaySeed } from '../domain/pricing.schema'

/** Every provider on one method, cheapest first. Unique to this page. */
export function MethodRateTable({
  gateways,
  method,
  caption,
}: {
  gateways: GatewaySeed[]
  method: FeeMethod
  caption: string
}) {
  const rows = gateways
    .map((g) => ({ g, fee: g.fees.find((f) => f.method === method) }))
    .sort((a, b) => {
      // Providers that publish nothing sort last, not first.
      if (!a.fee) return 1
      if (!b.fee) return -1
      return (a.fee.rateBp ?? 99_999) - (b.fee.rateBp ?? 99_999)
    })

  return (
    <div className="table-scroll">
      <table className="data-table data-table--zebra">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Provider</th>
            <th scope="col">Published rate</th>
            <th scope="col">With 18% GST</th>
            <th scope="col">Annual fee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ g, fee }) => (
            <tr key={g.slug}>
              <th scope="row">
                <Link href={`/charges/${g.slug}/`}>{g.displayName}</Link>
              </th>
              <td data-label="Published rate" className="font-mono">
                {!fee ? (
                  <span className="text-fg-subtle">not published</span>
                ) : fee.rateBp === 0 ? (
                  '0%'
                ) : (
                  <>
                    {fee.rateBp !== null ? formatRate(bp(fee.rateBp)) : ''}
                    {fee.flatFeePaise
                      ? ` + ${formatINR(paise(BigInt(fee.flatFeePaise)), { whole: true })}`
                      : ''}
                  </>
                )}
              </td>
              <td data-label="With 18% GST" className="font-mono">
                {fee && fee.rateBp !== null && fee.rateBp > 0
                  ? formatRate(effectiveRate(bp(fee.rateBp)))
                  : '—'}
              </td>
              <td data-label="Annual fee" className="font-mono">
                {g.annualMaintenancePaise === 0
                  ? 'None'
                  : formatINR(paise(BigInt(g.annualMaintenancePaise)), { whole: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
