import Link from 'next/link'
import { rupees } from '@/common/money'
import { Breadcrumbs, Lane } from '@/common/ui'
import { CalculatorResults, DEFAULT_MIX, SCENARIOS, rankGateways } from '@/modules/calculator'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

/** Results computed from any unverified rate are themselves unverified. */
export function generateMetadata() {
  const tooFew = getVerifiedGateways().length < 2
  return buildMetadata({
    title: 'Payment gateway cost calculator',
    description:
      'Work out the real annual cost of 8 Indian payment gateways for your volume and payment mix, including the annual fees headline rates leave out.',
    path: '/calculator/',
    noindex: tooFew,
  })
}

const DEFAULT_INPUT = {
  monthlyVolumePaise: rupees(500_000),
  avgTransactionPaise: rupees(1_500),
  mix: DEFAULT_MIX,
  includeSetupFee: false,
}

export default function CalculatorPage() {
  const gateways = getVerifiedGateways()
  const { ranked, incomparable } = rankGateways(gateways, DEFAULT_INPUT)

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Calculator', href: '/calculator/' },
        ]}
      />

      <h1 className="mt-4">Payment gateway cost calculator</h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">
        The cheapest rate is often not the cheapest gateway. Put 1.75% with a ₹4,999 annual fee
        against a flat 2% with no annual fee and the second one wins until you&rsquo;re doing
        about ₹2 lakh a month. This works out the real total for your numbers.
      </p>

      <div className="mt-8">
        <CalculatorResults
          ranked={ranked}
          incomparable={incomparable}
          input={DEFAULT_INPUT}
          heading="Cost at ₹5 lakh a month, balanced payment mix"
        />
      </div>

      <section className="mt-10">
        <h2>Other volumes</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          Pick whichever is closest to your business. Sliders are coming. These cover the usual
          cases in the meantime.
        </p>
        <ul className="mt-4 grid list-none gap-3 p-0 md:grid-cols-2">
          {SCENARIOS.map((s) => (
            <li key={s.slug} className="rounded-md border border-border-default bg-surface p-4">
              <h3>
                <Link href={`/calculator/${s.slug}/`} className="no-underline">
                  {s.title}
                </Link>
              </h3>
              <p className="mt-1 text-body-sm text-fg-muted">{s.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2>Why fixed fees matter</h2>
        <div className="prose-body lane-prose mt-3 !px-0 text-body-sm">
          <p>
            Comparison articles rank on headline percentage because it&rsquo;s the one number
            everybody publishes. At low volume that ranking is just wrong.
          </p>
          <p>
            Here&rsquo;s the arithmetic. A ₹4,999 annual fee is 0.83% of ₹50,000 a month. On ₹20
            lakh a month it&rsquo;s 0.02%. Same fee, same two providers, opposite answer. What you
            actually want to know is where they cross over, and that&rsquo;s what this works out.
          </p>
          <p>
            <Link href="/methodology/">How we verify these rates</Link>
          </p>
        </div>
      </section>
    </Lane>
  )
}
