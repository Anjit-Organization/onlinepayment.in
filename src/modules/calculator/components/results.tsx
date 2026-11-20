import Link from 'next/link'
import { formatINR } from '@/common/money'
import { METHOD_LABEL } from '@/modules/pricing'
import type { CalcInput, GatewayCost, RankedCost } from '../domain/calculator'
import { RankedResult } from './ranked-result'

/** Server-rendered results with assumptions stated. UI.md §8.4. */
export function CalculatorResults({
  ranked,
  incomparable = [],
  input,
  heading,
}: {
  ranked: RankedCost[]
  incomparable?: GatewayCost[]
  input: CalcInput
  heading: string
}) {
  const mixEntries = Object.entries(input.mix).filter(([, v]) => (v ?? 0) > 0)

  return (
    <>
      <section aria-label={heading}>
        <h2>{heading}</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          First-year total, GST included, cheapest first. The order falls out of the published
          rates. No provider can pay to move up it.
        </p>
        <ol className="mt-4 grid list-none gap-3 p-0">
          {ranked.map((c) => (
            <RankedResult key={c.slug} cost={c} />
          ))}
        </ol>
      </section>

      {incomparable.length > 0 && (
        <section className="mt-8">
          <h2>Not comparable on this mix</h2>
          <p className="mt-2 max-w-[68ch] text-body-sm text-fg-muted">
            These don&rsquo;t publish a rate for every method in this mix. Ranking them anyway
            would charge them for less than they actually handle and make one of them look
            cheapest when it just isn&rsquo;t priced. Ask them for a quote instead.
          </p>
          <ul className="mt-3 list-none p-0">
            {incomparable.map((c) => (
              <li
                key={c.slug}
                className="border-b border-border-default py-3 text-body-sm last:border-0"
              >
                <Link href={`/charges/${c.slug}/`} className="font-medium">
                  {c.displayName}
                </Link>
{' '}
                <span className="text-fg-muted">
                  publishes rates for {c.pricedSharePercent}% of this mix — no rate for{' '}
                  {c.unsupportedMethods.map((m) => METHOD_LABEL[m]).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2>Assumptions</h2>
        <div className="table-scroll mt-3">
          <table className="data-table">
            <caption className="sr-only">Assumptions used in this calculation</caption>
            <thead>
              <tr>
                <th scope="col">Assumption</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Monthly volume</th>
                <td data-label="Value" className="font-mono">
                  {formatINR(input.monthlyVolumePaise, { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">Average transaction</th>
                <td data-label="Value" className="font-mono">
                  {formatINR(input.avgTransactionPaise, { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">Payment mix</th>
                <td data-label="Value">
                  {mixEntries
                    .map(([m, v]) => `${METHOD_LABEL[m as keyof typeof METHOD_LABEL]} ${Math.round(v ?? 0)}%`)
                    .join(', ')}
                </td>
              </tr>
              <tr>
                <th scope="row">GST</th>
                <td data-label="Value">18%, applied to all fees</td>
              </tr>
              <tr>
                <th scope="row">Setup fees</th>
                <td data-label="Value">{input.includeSetupFee ? 'Included' : 'Excluded'}</td>
              </tr>
              <tr>
                <th scope="row">Promotional rates</th>
                <td data-label="Value">Excluded — headline rates only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
