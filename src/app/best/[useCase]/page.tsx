import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatMonthYear } from '@/common/datetime'
import { Breadcrumbs, Lane } from '@/common/ui'
import { CalculatorResults, USE_CASES, getUseCase, rankGateways } from '@/modules/calculator'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

type Params = { params: Promise<{ useCase: string }> }

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ useCase: u.slug }))
}

export async function generateMetadata({ params }: Params) {
  const { useCase } = await params
  const u = getUseCase(useCase)
  if (!u) return {}
  const tooFew = getVerifiedGateways().length < 2
  return buildMetadata({
    title: u.title,
    description: u.description,
    path: `/best/${u.slug}/`,
    noindex: tooFew,
  })
}

export default async function BestForPage({ params }: Params) {
  const { useCase } = await params
  const u = getUseCase(useCase)
  if (!u) notFound()

  const gateways = getVerifiedGateways()
  const input = {
    monthlyVolumePaise: u.monthlyVolumePaise,
    avgTransactionPaise: u.avgTransactionPaise,
    mix: u.mix,
    includeSetupFee: false,
  }
  const { ranked, incomparable } = rankGateways(gateways, input)
  const cheapest = ranked[0]
  const newest = gateways.map((g) => g.verifiedAt).sort().at(-1) ?? '2026-11-20'

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Best for', href: '/best/' },
          { label: u.h1, href: `/best/${u.slug}/` },
        ]}
      />

      <h1 className="mt-4">
        {u.h1} ({formatMonthYear(new Date(newest))})
      </h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">{u.description}</p>

      {cheapest && (
        <p className="mt-4 text-body">
          On published rates, <strong>{cheapest.displayName}</strong> is cheapest for this profile.
        </p>
      )}

      {/* The unique data point this page carries vs its hub. BUILD-PLAN §5.3 */}
      <section className="mt-8">
        <h2>Why this profile ranks differently</h2>
        <p className="mt-2 max-w-[68ch] text-body-sm text-fg-muted">{u.rationale}</p>
      </section>

      <div className="mt-8">
        <CalculatorResults ranked={ranked} incomparable={incomparable} input={input} heading="Total first-year cost" />
      </div>

      <section className="mt-10">
        <h2>Other profiles</h2>
        <ul className="mt-3 list-none p-0 text-body-sm">
          {USE_CASES.filter((o) => o.slug !== u.slug).map((o) => (
            <li key={o.slug} className="py-1">
              <Link href={`/best/${o.slug}/`}>{o.h1}</Link>
            </li>
          ))}
          <li className="py-1">
            <Link href="/calculator/">Use your own numbers instead</Link>
          </li>
        </ul>
      </section>
    </Lane>
  )
}
