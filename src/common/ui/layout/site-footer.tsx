import Link from 'next/link'
import { AUTHOR, SITE_NAME } from '@/common/config'
import { Lane } from '../lane'

const GROUPS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Data',
    links: [
      { href: '/charges/', label: 'Gateway charges' },
      { href: '/compare/', label: 'Comparisons' },
      { href: '/best/', label: 'Best by business type' },
      { href: '/calculator/', label: 'Cost calculator' },
      { href: '/data/changelog/', label: 'Changelog' },
    ],
  },
  {
    heading: 'UPI',
    links: [
      { href: '/upi/mdr-tracker/', label: 'MDR tracker' },
      { href: '/upi/limits/', label: 'Transaction limits' },
      { href: '/upi/rules/', label: 'Rule changes' },
    ],
  },
  {
    heading: 'About',
    links: [
      { href: '/methodology/', label: 'How we verify' },
      { href: '/about/', label: 'About' },
      { href: '/disclosure/', label: 'Disclosure' },
      { href: '/corrections/', label: 'Corrections' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-border-default bg-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Lane size="wide" className="py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-semibold">
              onlinepayment<span className="text-accent">.in</span>
            </p>
            <p className="mt-1 text-caption text-fg-muted">
              Independent pricing data for Indian payments. Every figure dated and sourced.
            </p>
            <p className="mt-2 text-caption text-fg-muted">
              Maintained by {AUTHOR.name} &middot;{' '}
              <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
            </p>
          </div>
          {GROUPS.map((g) => (
            <nav key={g.heading} aria-label={g.heading}>
              <h2 className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
                {g.heading}
              </h2>
              <ul className="mt-2 list-none space-y-1 p-0 text-body-sm">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-fg-muted no-underline hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-8 border-t border-border-default pt-4 text-caption text-fg-subtle">
          {SITE_NAME} is not a payment gateway, aggregator or financial advisor. Pricing shown is
          collected from public rate cards and merchant quotes, and may change without notice —
          always confirm with the provider before committing. See{' '}
          <Link href="/disclosure/">our disclosure</Link>.
        </p>
      </Lane>
    </footer>
  )
}
