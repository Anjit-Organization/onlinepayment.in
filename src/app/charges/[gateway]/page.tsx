import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatINR, paise } from '@/common/money'
import { formatMonthYear } from '@/common/datetime'
import { Breadcrumbs, Callout, ExternalLink, Lane, VerifiedAt } from '@/common/ui'
import {
  ChangeEntry,
  DraftBanner,
  SOURCE_KIND_LABEL,
  FeeTable,
  activePromos,
  getAllGateways,
  getGatewayBySlug,
  getGatewaySlugs,
} from '@/modules/pricing'
import { pairSlug } from '@/modules/compare'
import { buildMetadata } from '@/modules/seo'

type Params = { params: Promise<{ gateway: string }> }

export function generateStaticParams() {
  return getGatewaySlugs().map((gateway) => ({ gateway }))
}

export async function generateMetadata({ params }: Params) {
  const { gateway: slug } = await params
  const g = getGatewayBySlug(slug)
  if (!g) return {}

  const verifiedAt = new Date(g.verifiedAt)
  return buildMetadata({
    // Month comes from the data, never hardcoded — this is why the page does
    // not look abandoned by March. BUILD-PLAN §5.6.
    title: `${g.displayName} charges in India (${formatMonthYear(verifiedAt)})`,
    description: `${g.displayName} charges: UPI, card, net banking and wallet rates, setup and annual fees, settlement terms. Checked ${g.verifiedAt}.`,
    path: `/charges/${g.slug}/`,
    // Drafted data is never indexable. TECHNICAL §9.3.
    noindex: g.state === 'draft',
    modified: verifiedAt,
  })
}

export default async function GatewayChargesPage({ params }: Params) {
  const { gateway: slug } = await params
  const g = getGatewayBySlug(slug)
  if (!g) notFound()

  const verifiedAt = new Date(g.verifiedAt)
  const promos = activePromos(g)
  // Hub-and-spoke, generated from the DB so there are no orphans. UI.md §2.
  const others = getAllGateways().filter((o) => o.slug !== g.slug)

  return (
    <Lane size="default" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Charges', href: '/charges/' },
          { label: g.displayName, href: `/charges/${g.slug}/` },
        ]}
      />

      <h1 className="mt-4">
        {g.displayName} charges in India ({formatMonthYear(verifiedAt)})
      </h1>

      <VerifiedAt
        date={verifiedAt}
        sourceUrl={g.sourceUrl}
        sourceLabel={
          g.sourceKind === 'secondary_source'
            ? `${g.displayName} website (no public rate card)`
            : 'published pricing page'
        }
        variant="block"
        state={g.state}
      />

      {g.state === 'draft' && <DraftBanner reason={g.draftReason ?? ''} />}

      <section className="mt-8">
        <h2>Rates by payment method</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          Published rates leave GST out. Gateway fees attract 18% on top, so the effective column
          is the one that matters.
        </p>
        <div className="mt-4">
          <FeeTable fees={g.fees} caption={`${g.displayName} charges by payment method`} />
        </div>
      </section>

      <section className="mt-10">
        <h2>Fixed costs</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          The part the headline rate doesn&rsquo;t tell you. Below a few lakh a month these can
          easily outweigh a better percentage.
        </p>
        <div className="table-scroll mt-4">
          <table className="data-table">
            <caption className="sr-only">{g.displayName} fixed costs</caption>
            <thead>
              <tr>
                <th scope="col">Cost</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Setup fee</th>
                <td data-label="Amount" className="font-mono">
                  {g.setupFeePaise === 0 ? 'None' : formatINR(paise(BigInt(g.setupFeePaise)), { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">Annual maintenance</th>
                <td data-label="Amount" className="font-mono">
                  {g.annualMaintenancePaise === 0
                    ? 'None'
                    : formatINR(paise(BigInt(g.annualMaintenancePaise)), { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">Monthly fee</th>
                <td data-label="Amount" className="font-mono">
                  {g.monthlyFeePaise === 0 ? 'None' : formatINR(paise(BigInt(g.monthlyFeePaise)), { whole: true })}
                </td>
              </tr>
              <tr>
                <th scope="row">Settlement cycle</th>
                <td data-label="Amount" className="font-mono">
                  {g.settlementCycleDays === null ? 'Not published' : `T+${g.settlementCycleDays}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {promos.length > 0 && (
        <section className="mt-10">
          <h2>Active offers</h2>
          <ul className="mt-3 list-none p-0">
            {promos.map((p) => (
              <li key={p.description} className="border-b border-border-default py-3 text-body-sm last:border-0">
                <p>{p.description}</p>
                <p className="mt-1 text-caption text-fg-muted">
                  {p.endsAt ? `Ends ${p.endsAt}` : 'No published end date'} &middot;{' '}
                  <ExternalLink href={p.sourceUrl} isSource>
                    source
                  </ExternalLink>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {g.notCharged.length > 0 && (
        <section className="mt-10">
          <h2>What you are not charged</h2>
          <ul className="mt-3 text-body-sm">
            {g.notCharged.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2>Pricing changes</h2>
        {g.changes.length === 0 ? (
          <p className="mt-2 text-body-sm text-fg-muted">
            No changes recorded since we started tracking {g.displayName} on {g.verifiedAt}.
          </p>
        ) : (
          <ul className="mt-3 list-none p-0">
            {g.changes.map((c) => (
              <ChangeEntry key={`${c.changedAt}-${c.field}`} {...c} />
            ))}
          </ul>
        )}
      </section>

      <Callout tone="warn" title="Confirm before committing">
        This is a starting point, not a quote. Rates move with volume and several providers price
        by business category, so what you&rsquo;re offered may differ. Get it in writing.
      </Callout>

      <section className="mt-10">
        <h2>Compared with</h2>
        <ul className="mt-3 grid list-none gap-2 p-0 text-body-sm sm:grid-cols-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link href={`/compare/${pairSlug(g.slug, o.slug)}/`}>
                {g.displayName} vs {o.displayName}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2>Sources</h2>
        <p className="mt-2 max-w-[68ch] text-body-sm text-fg-muted">
          Where {g.displayName} publishes a number, we use theirs. Where they don&rsquo;t,
          whoever we got it from is named below, so you can see which figures aren&rsquo;t the
          provider&rsquo;s own.
        </p>

        <ul className="mt-3 list-none p-0 text-body-sm">
          <li className="border-b border-border-default py-2">
            <ExternalLink href={g.sourceUrl} isSource>
              {g.displayName} published pricing
            </ExternalLink>
            <span className="ms-2 text-fg-muted">
              — {SOURCE_KIND_LABEL[g.sourceKind].toLowerCase()}
            </span>
          </li>
          {g.secondarySources.map((src) => (
            <li key={src.url} className="border-b border-border-default py-2 last:border-0">
              <ExternalLink href={src.url} isSource>
                {src.label}
              </ExternalLink>
              <span className="ms-2 text-fg-muted">— {src.covers}</span>
            </li>
          ))}
        </ul>

        {g.secondarySources.length > 0 && (
          <Callout tone="warn" title="Some figures are not from the provider">
            {g.displayName} doesn&rsquo;t publish every rate on this page. The ones above came
            from third parties, and third parties get Indian gateway pricing wrong often enough
            that you should treat these as a rough guide. Ask them directly.
          </Callout>
        )}
        <p className="mt-4 text-caption text-fg-muted">
          Checked by{' '}
          <Link href="/about/">{g.verifiedBy}</Link> on {g.verifiedAt}. Spotted an error?{' '}
          <Link href="/corrections/">Tell us</Link>.
        </p>

        <p className="mt-4 text-body-sm">
          <Link href="/calculator/">Calculate your cost with {g.displayName}</Link> &middot;{' '}
          <Link href="/charges/">All providers</Link>
        </p>
      </section>
    </Lane>
  )
}
