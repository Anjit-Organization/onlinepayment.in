import Link from 'next/link'
import { SITE_NAME } from '@/common/config'
import { Lane } from '../lane'
import { ThemeToggle } from '../theme-toggle'
import { NavDisclosure } from './nav-disclosure'

const NAV = [
  { href: '/charges/', label: 'Charges' },
  { href: '/compare/', label: 'Compare' },
  { href: '/best/', label: 'Best for' },
  { href: '/calculator/', label: 'Calculator' },
  { href: '/upi/mdr-tracker/', label: 'UPI MDR' },
  { href: '/methodology/', label: 'Methodology' },
]

/**
 * Below md the nav collapses into a native <details> disclosure: no JS, keyboard
 * accessible for free, and the links stay in the crawled HTML. An inline
 * wrapping nav cost ~190px of vertical space before the h1 on a 375px screen.
 * At md+ CSS forces it open and hides the summary. The theme toggle lives inside
 * the panel so the header cannot overflow at 375px; md:contents flattens the
 * <details> so both sit inline on desktop. UI.md §4.4.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border-default bg-surface">
      <Lane size="wide" className="py-2">
        <div className="relative flex min-h-11 items-center justify-between gap-3">
          <Link href="/" className="font-semibold no-underline text-fg">
            onlinepayment<span className="text-accent">.in</span>
            <span className="sr-only"> — {SITE_NAME} home</span>
          </Link>

          <NavDisclosure>
            <nav aria-label="Main">
              <ul className="m-0 flex list-none flex-col gap-y-1 p-0 text-body-sm md:flex-row md:gap-x-4">
                {NAV.map((n) => (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      className="inline-flex min-h-11 items-center text-fg-muted no-underline hover:text-fg"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-2 md:mt-0">
              <ThemeToggle />
            </div>
          </NavDisclosure>
        </div>
      </Lane>
    </header>
  )
}
