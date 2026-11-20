import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Breadcrumbs, Lane } from '@/common/ui'
import { CalculatorResults, SCENARIOS, getScenario, rankGateways } from '@/modules/calculator'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

type Params = { params: Promise<{ scenario: string }> }

/**
 * Statically generated scenario pages are the crawlable surface a pure-JS
 * calculator never gets. BUILD-PLAN §5.1.
 */
export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ scenario: s.slug }))
}

export async function generateMetadata({ params }: Params) {
  const { scenario: slug } = await params
  const s = getScenario(slug)
  if (!s) return {}

  const tooFew = getVerifiedGateways().length < 2
  return buildMetadata({
    title: `Cheapest gateway: ${s.shortTitle}`,
    description: `${s.description} Annual cost across 8 Indian gateways, GST included.`,
    path: `/calculator/${s.slug}/`,
    noindex: tooFew,
  })
}

export default async function ScenarioPage({ params }: Params) {
  const { scenario: slug } = await params
  const s = getScenario(slug)
  if (!s) notFound()

  const gateways = getVerifiedGateways()
  const input = {
    monthlyVolumePaise: s.monthlyVolumePaise,
    avgTransactionPaise: s.avgTransactionPaise,
    mix: s.mix,
    includeSetupFee: false,
  }
  const { ranked, incomparable } = rankGateways(gateways, input)
  const cheapest = ranked[0]

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Calculator', href: '/calculator/' },
          { label: s.title, href: `/calculator/${s.slug}/` },
        ]}
      />

      <h1 className="mt-4">Cheapest payment gateway for {s.shortTitle}</h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">{s.description}</p>

      {cheapest && (
        <p className="mt-4 text-body">
          On published rates, <strong>{cheapest.displayName}</strong> is cheapest for this profile.
        </p>
      )}

      <div className="mt-8">
        <CalculatorResults ranked={ranked} incomparable={incomparable} input={input} heading="Total first-year cost" />
      </div>

      <section className="mt-10">
        <h2>Other scenarios</h2>
        <ul className="mt-3 list-none p-0 text-body-sm">
          {SCENARIOS.filter((o) => o.slug !== s.slug).map((o) => (
            <li key={o.slug} className="py-1">
              <Link href={`/calculator/${o.slug}/`}>{o.title}</Link>
            </li>
          ))}
        </ul>
      </section>
    </Lane>
  )
}
