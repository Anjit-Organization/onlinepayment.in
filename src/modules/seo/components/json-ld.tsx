import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/common/config'

/** Inlined, not injected — it must be present in the raw HTML. TECHNICAL.md §5.1. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_TAGLINE,
        areaServed: { '@type': 'Country', name: 'India' },
      }}
    />
  )
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: 'en-IN',
        publisher: { '@id': `${SITE_URL}/#organization` },
      }}
    />
  )
}
