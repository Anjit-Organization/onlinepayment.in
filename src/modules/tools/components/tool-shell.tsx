import type { ReactNode } from 'react'
import { SITE_NAME, SITE_URL } from '@/common/config'
import { Badge, Breadcrumbs, Lane } from '@/common/ui'
import type { Tool } from '../domain/tools.registry'

/**
 * Shared chrome for every tool page: breadcrumbs, heading, intro, and the
 * SoftwareApplication JSON-LD.
 *
 * WHY SoftwareApplication AND NOT WebPage
 * These pages are applications, and the schema says so. `offers` with price 0
 * is what makes a free tool eligible to be described as free in a rich result;
 * leaving it off is the usual reason a tool page gets no treatment. The type
 * is honest here in a way `Product` would not be on a gateway page — we do
 * own these tools, so we can describe them.
 */
export function ToolShell({
  tool,
  intro,
  children,
}: {
  tool: Tool
  /** The lede. Written per tool, not generated from the description. */
  intro: ReactNode
  children: ReactNode
}) {
  const url = `${SITE_URL}/tools/${tool.slug}/`

  return (
    <Lane size="wide" className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            '@id': `${url}#tool`,
            name: tool.h1,
            url,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires JavaScript',
            description: tool.description,
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'INR' },
            publisher: { '@id': `${SITE_URL}/#organization` },
            inLanguage: 'en-IN',
          }),
        }}
      />

      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools/' },
          { label: tool.label, href: `/tools/${tool.slug}/` },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="m-0">{tool.h1}</h1>
        {tool.runsLocally ? (
          <Badge tone="fresh" dot>
            Runs in your browser
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 max-w-[62ch] text-body text-fg-muted">{intro}</div>

      {children}

      <p className="mt-10 text-caption text-fg-subtle">
        Part of {SITE_NAME}. Found a mistake?{' '}
        <a href="/corrections/">Tell us and we will fix it.</a>
      </p>
    </Lane>
  )
}
