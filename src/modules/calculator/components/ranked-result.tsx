import Link from 'next/link'
import { formatINR, formatRate } from '@/common/money'
import { METHOD_LABEL } from '@/modules/pricing/client'
import type { RankedCost } from '../domain/calculator'

/**
 * Mobile shows a ranked list, not a restyled table: the question here is "which
 * is cheapest for me", not "compare 10 gateways cell by cell". Expansion uses
 * native <details>, so it works with zero JavaScript, is keyboard accessible for
 * free, and the breakdown stays in the crawled HTML. UI.md §5.3 / §7.4.
 */
export function RankedResult({ cost }: { cost: RankedCost }) {
  const isCheapest = cost.rank === 1

  return (
    <li
      className={`rounded-md border bg-surface p-4 ${
        isCheapest ? 'border-fresh' : 'border-border-default'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className="font-mono text-caption text-fg-subtle">
            {String(cost.rank).padStart(2, '0')}
          </span>
          <Link href={`/charges/${cost.slug}/`} className="text-h3 font-semibold no-underline">
            {cost.displayName}
          </Link>
        </div>
        <span className="font-mono text-data-lg font-medium">
          {formatINR(cost.annualTotalPaise, { whole: true })}
          <span className="ms-1 font-sans text-caption font-normal text-fg-muted">/year</span>
        </span>
      </div>

      <p className="mt-1 text-body-sm text-fg-muted">
        {isCheapest ? (
          <span className="text-fresh">Cheapest for this volume and mix</span>
        ) : (
          <>+{formatINR(cost.deltaFromCheapestPaise, { whole: true })} a year vs cheapest</>
        )}
        {' · '}
        {formatRate(cost.blendedRateBp)} effective, GST included
      </p>

      {cost.unsupportedMethods.length > 0 && (
        <p className="mt-1 text-caption text-warn">
          No published rate for:{' '}
          {cost.unsupportedMethods.map((m) => METHOD_LABEL[m]).join(', ')}
        </p>
      )}

      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-body-sm text-accent">
          See breakdown
        </summary>
        <div className="table-scroll mt-2">
          <table className="data-table">
            <caption className="sr-only">
              Annual cost breakdown by payment method for {cost.displayName}
            </caption>
            <thead>
              <tr>
                <th scope="col">Method</th>
                <th scope="col">Share</th>
                <th scope="col">Rate</th>
                <th scope="col">Annual fee</th>
              </tr>
            </thead>
            <tbody>
              {cost.breakdown.map((b) => (
                <tr key={b.method}>
                  <th scope="row">{METHOD_LABEL[b.method]}</th>
                  <td data-label="Share">{Math.round(b.sharePercent)}%</td>
                  <td data-label="Rate">
                    {b.supported && b.rateBp !== null ? formatRate(b.rateBp) : '—'}
                  </td>
                  <td data-label="Annual fee" className="font-mono">
                    {b.supported ? formatINR(b.annualFeePaise, { whole: true }) : 'not offered'}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">Fixed fees</th>
                <td data-label="Share">—</td>
                <td data-label="Rate">—</td>
                <td data-label="Annual fee" className="font-mono">
                  {formatINR(cost.annualFixedPaise, { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">GST (18%)</th>
                <td data-label="Share">—</td>
                <td data-label="Rate">18%</td>
                <td data-label="Annual fee" className="font-mono">
                  {formatINR(cost.gstPaise, { whole: true })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </li>
  )
}
