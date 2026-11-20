import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatINR, rupees } from '@/common/money'
import { formatMonthYear } from '@/common/datetime'
import { Breadcrumbs, Lane, VerifiedAt } from '@/common/ui'
import { DEFAULT_MIX, computeGatewayCost } from '@/modules/calculator'
import { ComparisonTable, Verdict, allPairs, findCrossover, pairSlug, parsePairSlug } from '@/modules/compare'
import { getAllGateways, getGatewayBySlug } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

type Params = { params: Promise<{ pair: string }> }

const BASE_INPUT = {
  monthlyVolumePaise: rupees(500_000),
  avgTransactionPaise: rupees(1_500),
  mix: DEFAULT_MIX,
  includeSetupFee: false,
}

/** Three volumes, so the crossover is visible rather than asserted. */
const LEVELS = [rupees(50_000), rupees(500_000), rupees(5_000_000)]

export function generateStaticParams() {
  return allPairs(getAllGateways().map((g) => g.slug)).map(([a, b]) => ({ pair: pairSlug(a, b) }))
}

function resolve(pair: string) {
  const parsed = parsePairSlug(pair)
  if (!parsed) return null
  const a = getGatewayBySlug(parsed[0])
  const b = getGatewayBySlug(parsed[1])
  if (!a || !b || a.slug === b.slug) return null
  return { a, b }
}

export async function generateMetadata({ params }: Params) {
  const { pair } = await params
  const r = resolve(pair)
  if (!r) return {}

  const newest = [r.a.verifiedAt, r.b.verifiedAt].sort().at(-1)!
  const anyDraft = r.a.state === 'draft' || r.b.state === 'draft'

  return buildMetadata({
    title: `${r.a.displayName} vs ${r.b.displayName}`,
    description: `${r.a.displayName} vs ${r.b.displayName} on real cost: UPI and card rates, annual fees, GST, and the volume where the cheaper option flips.`,
    path: `/compare/${pair}/`,
    noindex: anyDraft,
    modified: new Date(newest),
  })
}

export default async function ComparePairPage({ params }: Params) {
  const { pair } = await params
  const r = resolve(pair)
  if (!r) notFound()
  const { a, b } = r

  const crossover = findCrossover(a, b, BASE_INPUT)
  const newest = [a.verifiedAt, b.verifiedAt].sort().at(-1)!

  const levels = LEVELS.map((monthly) => {
    const input = { ...BASE_INPUT, monthlyVolumePaise: monthly }
    const ca = computeGatewayCost(a, input)
    const cb = computeGatewayCost(b, input)
    return {
      monthly,
      a: ca.annualTotalPaise,
      b: cb.annualTotalPaise,
      winner: ca.annualTotalPaise <= cb.annualTotalPaise ? a.displayName : b.displayName,
    }
  })

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Compare', href: '/compare/' },
          { label: `${a.displayName} vs ${b.displayName}`, href: `/compare/${pair}/` },
        ]}
      />

      <h1 className="mt-4">
        {a.displayName} vs {b.displayName} ({formatMonthYear(new Date(newest))})
      </h1>

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <VerifiedAt date={new Date(a.verifiedAt)} sourceUrl={a.sourceUrl} sourceLabel={`${a.displayName} pricing`} state={a.state} />
        <VerifiedAt date={new Date(b.verifiedAt)} sourceUrl={b.sourceUrl} sourceLabel={`${b.displayName} pricing`} state={b.state} />
      </div>


      {/* The answer leads. UI.md §8.3 */}
      <div className="mt-6">
        <Verdict crossover={crossover} a={a} b={b} />
      </div>

      <section className="mt-10">
        <h2>Cost at three volumes</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          Total first-year cost, GST and fixed fees included, on a typical payment mix.
        </p>
        <div className="table-scroll mt-4">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              Annual cost for {a.displayName} and {b.displayName} at three monthly volumes
            </caption>
            <thead>
              <tr>
                <th scope="col">Monthly volume</th>
                <th scope="col">{a.displayName}</th>
                <th scope="col">{b.displayName}</th>
                <th scope="col">Cheaper</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={String(l.monthly)}>
                  <th scope="row" className="font-mono">
                    {formatINR(l.monthly, { whole: true })}
                  </th>
                  <td data-label={a.displayName} className="font-mono">
                    {formatINR(l.a, { whole: true })}
                  </td>
                  <td data-label={b.displayName} className="font-mono">
                    {formatINR(l.b, { whole: true })}
                  </td>
                  <td data-label="Cheaper">{l.winner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2>Charges side by side</h2>
        <div className="mt-4">
          <ComparisonTable a={a} b={b} />
        </div>
      </section>

      <section className="mt-10">
        <h2>More</h2>
        <ul className="mt-3 list-none p-0 text-body-sm">
          <li className="py-1">
            <Link href={`/charges/${a.slug}/`}>All {a.displayName} charges</Link>
          </li>
          <li className="py-1">
            <Link href={`/charges/${b.slug}/`}>All {b.displayName} charges</Link>
          </li>
          <li className="py-1">
            <Link href="/calculator/">Calculate your own cost</Link>
          </li>
          <li className="py-1">
            <Link href="/compare/">All comparisons</Link>
          </li>
        </ul>
      </section>
    </Lane>
  )
}
