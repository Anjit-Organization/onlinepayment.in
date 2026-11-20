import Link from 'next/link'
import { Breadcrumbs, Lane } from '@/common/ui'
import { USE_CASES } from '@/modules/calculator'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'

export function generateMetadata() {
  const tooFew = getVerifiedGateways().length < 2
  return buildMetadata({
    title: 'Best payment gateway by business type',
    description:
      'The cheapest Indian payment gateway depends on your volume and payment mix. Rankings for small business, freelancers, D2C, SaaS and high volume.',
    path: '/best/',
    noindex: tooFew,
  })
}

export default function BestHubPage() {
  const count = getVerifiedGateways().length
  return (
    <Lane size="wide" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Best for', href: '/best/' },
        ]}
      />
      <h1 className="mt-4">Best payment gateway by business type</h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">
        There is no single cheapest provider. The ranking changes with your monthly volume, your
        average transaction size and how much of your money arrives over UPI rather than cards.
        These are computed for six common profiles, across the {count} providers whose pricing we
        have verified against their own rate cards.
      </p>

      <ul className="mt-6 grid list-none gap-3 p-0 md:grid-cols-2">
        {USE_CASES.map((u) => (
          <li key={u.slug} className="rounded-md border border-border-default bg-surface p-4">
            <h2 className="text-h3">
              <Link href={`/best/${u.slug}/`} className="no-underline">
                {u.h1}
              </Link>
            </h2>
            <p className="mt-1 text-body-sm text-fg-muted">{u.description}</p>
          </li>
        ))}
      </ul>
    </Lane>
  )
}
