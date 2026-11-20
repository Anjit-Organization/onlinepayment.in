import Link from 'next/link'
import { formatRate } from '@/common/money'
import { bp, effectiveRate } from '@/common/money'
import { Badge, Breadcrumbs, Lane } from '@/common/ui'
import { getAllGateways, getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

/**
 * A hub listing even one unverified rate is an unverified hub, so it is noindex
 * until every provider shown on it is verified. Excluding it from the sitemap is
 * not enough on its own — internal links can still get a page indexed.
 */
export function generateMetadata() {
  // Publishes as soon as there is verified data to show. Unverified providers
  // are listed separately rather than mixed into the table, so the page makes
  // no unverified claim.
  const noVerified = getVerifiedGateways().length === 0
  return buildMetadata({
    title: 'Payment gateway charges in India',
    description:
      'Charges for 8 Indian payment gateways, each figure dated and linked to its source. UPI, card and net banking rates side by side.',
    path: '/charges/',
    noindex: noVerified,
  })
}

export default function ChargesHubPage() {
  const gateways = getVerifiedGateways()
  const pending = getAllGateways().filter((g) => g.state === 'draft')

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Charges', href: '/charges/' },
        ]}
      />

      <h1 className="mt-4">Payment gateway charges in India</h1>
      <p className="mt-3 max-w-[60ch] text-body text-fg-muted">
        Rates for {gateways.length} providers, each one linked back to where we got it. Figures
        are GST-exclusive because that&rsquo;s how providers quote them, with the real number you
        pay shown next to it.
      </p>


      <div className="table-scroll mt-6">
        <table className="data-table data-table--zebra">
          <caption className="sr-only">
            Indian payment gateways with their headline UPI and domestic card rates
          </caption>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">UPI</th>
              <th scope="col">Cards (domestic)</th>
              <th scope="col">Annual fee</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {gateways.map((g) => {
              const upi = g.fees.find((f) => f.method === 'upi')
              const card = g.fees.find((f) => f.method === 'credit_card_domestic')
              const rate = (v: number | null | undefined) =>
                v === null || v === undefined
                  ? '—'
                  : v === 0
                    ? '0%'
                    : `${formatRate(bp(v))} (${formatRate(effectiveRate(bp(v)))} eff.)`
              return (
                <tr key={g.slug}>
                  <th scope="row">
                    <Link href={`/charges/${g.slug}/`}>{g.displayName}</Link>
                  </th>
                  <td data-label="UPI" className="font-mono">
                    {rate(upi?.rateBp)}
                  </td>
                  <td data-label="Cards (domestic)" className="font-mono">
                    {rate(card?.rateBp)}
                  </td>
                  <td data-label="Annual fee" className="font-mono">
                    {g.annualMaintenancePaise === 0 ? 'None' : `₹${g.annualMaintenancePaise / 100}`}
                  </td>
                  <td data-label="Status">
                    {g.state === 'draft' ? (
                      <Badge tone="danger" dot>
                        Draft
                      </Badge>
                    ) : (
                      <Badge tone="fresh" dot>
                        Verified
                      </Badge>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pending.length > 0 && (
        <section className="mt-10">
          <h2>Not yet verified</h2>
          <p className="mt-2 max-w-[68ch] text-body-sm text-fg-muted">
            {pending.length} providers are not listed above because their published pricing could
            not be confirmed — the page is ambiguous, incomplete, or there is no public rate card at
            all. Their pages exist but are excluded from search and carry a warning.
          </p>
          <ul className="mt-3 list-none p-0 text-body-sm">
            {pending.map((g) => (
              <li key={g.slug} className="border-b border-border-default py-2 last:border-0">
                <Link href={`/charges/${g.slug}/`}>{g.displayName}</Link>
                <span className="ms-2 text-fg-subtle">{g.draftReason?.split('.')[0]}.</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-body-sm">
        <Link href="/calculator/">Work out your own cost with the calculator</Link> &middot;{' '}
        <Link href="/methodology/">How we verify these figures</Link>
      </p>
    </Lane>
  )
}
