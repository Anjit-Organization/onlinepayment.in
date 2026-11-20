import Link from 'next/link'
import { Breadcrumbs, Lane } from '@/common/ui'
import { allPairs, pairSlug } from '@/modules/compare'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

export function generateMetadata() {
  const tooFew = getVerifiedGateways().length < 2
  return buildMetadata({
    title: 'Compare Indian payment gateways',
    description:
      'Side-by-side comparisons of Indian payment gateways, with the monthly volume at which one becomes cheaper than the other.',
    path: '/compare/',
    noindex: tooFew,
  })
}

export default function CompareHubPage() {
  const gateways = getVerifiedGateways()
  const bySlug = new Map(gateways.map((g) => [g.slug, g.displayName]))
  const pairs = allPairs(gateways.map((g) => g.slug))

  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Compare', href: '/compare/' },
        ]}
      />

      <h1 className="mt-4">Compare Indian payment gateways</h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">
        {pairs.length} head-to-head comparisons across {gateways.length} providers. Each one works
        out the volume where the cheaper option flips, since at small scale an annual fee usually
        outweighs whatever the advertised rate says.
      </p>

      <ul className="mt-6 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map(([a, b]) => (
          <li key={pairSlug(a, b)}>
            <Link
              href={`/compare/${pairSlug(a, b)}/`}
              className="flex min-h-11 items-center rounded-md border border-border-default bg-surface px-3 text-body-sm no-underline"
            >
              {bySlug.get(a)} vs {bySlug.get(b)}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-body-sm">
        <Link href="/calculator/">Work out your own cost instead</Link> &middot;{' '}
        <Link href="/charges/">All published charges</Link>
      </p>
    </Lane>
  )
}
