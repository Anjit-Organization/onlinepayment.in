import Link from 'next/link'
import { bp, effectiveRate, formatRate } from '@/common/money'
import { Badge, Button, Lane } from '@/common/ui'
import { getAllGateways } from '@/modules/pricing'
import { getTracker } from '@/modules/regulatory'
import { buildMetadata } from '@/modules/seo'

export const metadata = buildMetadata({
  title: 'What Indian payments actually cost',
  description:
    'Independent, dated and sourced pricing data for Indian payment gateways. Compare real charges, calculate your true annual cost, and track UPI MDR changes.',
  path: '/',
})

const STEPS = [
  {
    n: '01',
    h: 'Read off the rate card',
    p: "We take the number from the provider's own pricing page, a written quote, or a live dashboard. Where none of those exist, we say who we got it from instead.",
  },
  {
    n: '02',
    h: 'Dated, every one',
    p: 'Each price shows when we last checked it and links to the source. Older than 60 days and the page tells you so.',
  },
  {
    n: '03',
    h: 'Nothing gets overwritten',
    p: 'When a rate moves we keep the old one too. You can see what it was, what it is now, and the day it changed.',
  },
]

export default function HomePage() {
  const gateways = getAllGateways()
  const tracker = getTracker('upi-mdr')

  return (
    <>
      <Lane size="wide" className="py-10 md:py-14">
        <h1 className="max-w-[24ch]">What Indian payments actually cost</h1>
        <p className="mt-4 max-w-[60ch] text-body text-fg-muted">
          Nobody publishes this properly. Rates sit on marketing pages that go stale, annual fees
          get buried in a footnote, and half the comparison articles are quoting offers that
          expired last year. So we keep our own record, dated and sourced, of what the eight big
          providers actually charge.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/calculator/" variant="accent">
            Calculate your cost
          </Button>
          <Button href="/charges/" variant="ghost">
            Compare {gateways.length} providers
          </Button>
        </div>

      </Lane>

      {/* Live, topical, high-anxiety question. UI.md §8.1 */}
      <section className="border-y border-border-default bg-surface">
        <Lane size="wide" className="py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-h3">UPI MDR status</h2>
            <Badge tone="info" dot>
              Deferred
            </Badge>
          </div>
          <p className="mt-2 max-w-[70ch] text-body-sm text-fg-muted">{tracker.currentAnswer}</p>
          <p className="mt-3 text-body-sm">
            <Link href="/upi/mdr-tracker/">See the full timeline and sources</Link>
          </p>
        </Lane>
      </section>

      <Lane size="wide" className="py-10">
        <h2>What they charge on UPI</h2>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {gateways.map((g) => {
            const upi = g.fees.find((f) => f.method === 'upi')
            return (
              <li key={g.slug} className="rounded-md border border-border-default bg-surface p-4">
                <h3 className="text-body">
                  <Link href={`/charges/${g.slug}/`} className="no-underline">
                    {g.displayName}
                  </Link>
                </h3>
                <p className="mt-2 font-mono text-data">
                  {upi?.rateBp === 0
                    ? '0% UPI'
                    : upi?.rateBp != null
                      ? `${formatRate(bp(upi.rateBp))} UPI`
                      : '—'}
                </p>
                <p className="text-caption text-fg-muted">
                  {upi?.rateBp ? `${formatRate(effectiveRate(bp(upi.rateBp)))} with GST` : 'no MDR'}
                </p>
              </li>
            )
          })}
        </ul>
      </Lane>

      <section className="border-t border-border-default bg-surface">
        <Lane size="wide" className="py-10">
          <h2>How we check</h2>
          <ol className="mt-5 grid list-none gap-5 p-0 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="font-mono text-caption text-accent">{s.n}</span>
                <h3 className="mt-1">{s.h}</h3>
                <p className="mt-1 text-body-sm text-fg-muted">{s.p}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-body-sm">
            <Link href="/methodology/">Read the full methodology</Link> &middot;{' '}
            <Link href="/disclosure/">How we make money</Link>
          </p>
        </Lane>
      </section>
    </>
  )
}
