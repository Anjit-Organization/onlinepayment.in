import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatMonthYear } from '@/common/datetime'
import { Breadcrumbs, Callout, Lane } from '@/common/ui'
import { getMethodPage } from '../domain/methods'
import { getVerifiedGateways } from '../data/gateway.repository'
import { MethodRateTable } from './method-rate-table'
import { METHOD_PAGES } from '../domain/methods'

/** Shared body for every /charges/<method>/ route. */
export function MethodChargesPage({ slug }: { slug: string }) {
  const m = getMethodPage(slug)
  if (!m) notFound()

  const gateways = getVerifiedGateways()
  const newest = gateways.map((g) => g.verifiedAt).sort().at(-1) ?? '2026-11-20'
  const priced = gateways.filter((g) => g.fees.some((f) => f.method === m.method))
  const cheapest = [...priced].sort((a, b) => {
    const ra = a.fees.find((f) => f.method === m.method)?.rateBp ?? 99_999
    const rb = b.fees.find((f) => f.method === m.method)?.rateBp ?? 99_999
    return ra - rb
  })[0]

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Charges', href: '/charges/' },
          { label: m.h1, href: `/charges/${m.slug}/` },
        ]}
      />

      <h1 className="mt-4">
        {m.h1} ({formatMonthYear(new Date(newest))})
      </h1>
      <p className="mt-3 max-w-[64ch] text-body text-fg-muted">{m.intro}</p>

      {cheapest && (
        <p className="mt-4 text-body">
          On published rates, <strong>{cheapest.displayName}</strong> is cheapest here, though at
          low volume a provider&rsquo;s annual fee can outweigh the rate entirely.
        </p>
      )}

      <section className="mt-8">
        <h2>Every provider on this method</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          Rates are GST-exclusive as providers quote them, with the real figure beside it.
          {priced.length < gateways.length &&
            ` ${gateways.length - priced.length} of ${gateways.length} providers publish no rate for this method.`}
        </p>
        <div className="mt-4">
          <MethodRateTable
            gateways={gateways}
            method={m.method}
            caption={`${m.h1} across ${gateways.length} Indian payment gateways`}
          />
        </div>
      </section>

      {m.note && (
        <Callout tone="info" title="Worth knowing">
          {m.note}
          {m.slug === 'upi' && (
            <>
              {' '}
              <Link href="/upi/mdr-tracker/">Track the current position</Link>.
            </>
          )}
        </Callout>
      )}

      <section className="mt-10">
        <h2>Work out your own cost</h2>
        <p className="mt-2 max-w-[64ch] text-body-sm text-fg-muted">
          A single method&rsquo;s rate rarely decides the bill. What matters is your mix across
          methods plus any fixed annual fee, which is what the calculator works out.
        </p>
        <p className="mt-3 text-body-sm">
          <Link href="/calculator/">Open the calculator</Link>
        </p>
      </section>

      <section className="mt-10">
        <h2>Other methods</h2>
        <ul className="mt-3 list-none p-0 text-body-sm">
          {METHOD_PAGES.filter((o) => o.slug !== m.slug).map((o) => (
            <li key={o.slug} className="py-1">
              <Link href={`/charges/${o.slug}/`}>{o.h1}</Link>
            </li>
          ))}
          <li className="py-1">
            <Link href="/charges/">All provider charges</Link>
          </li>
        </ul>
      </section>
    </Lane>
  )
}
