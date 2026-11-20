import Link from 'next/link'
import { SITE_URL } from '../config'

export type Crumb = { label: string; href: string }

/**
 * Rendered as visible HTML AND emitted as BreadcrumbList JSON-LD from the same
 * data, so the two can never disagree. TECHNICAL.md §5.5.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href}`,
    })),
  }

  return (
    <nav aria-label="Breadcrumb" className="text-caption text-fg-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex list-none flex-wrap items-center gap-1 p-0">
        {trail.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="text-fg-subtle">
                /
              </span>
            )}
            {i === trail.length - 1 ? (
              <span aria-current="page">{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
