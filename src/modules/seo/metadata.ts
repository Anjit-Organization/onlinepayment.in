import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/common/config'

/**
 * Every page's metadata goes through here, so canonical and OG handling can
 * never be forgotten per-page. BUILD-PLAN §5.2, §5.6.
 *
 * Titles for data pages interpolate the verification month from the data rather
 * than hardcoding a year — see formatMonthYear. A hardcoded year is why every
 * competitor's page looks abandoned by March.
 */
export function buildMetadata(opts: {
  title: string
  description: string
  path: string
  noindex?: boolean
  modified?: Date
}): Metadata {
  const canonical = `${SITE_URL}${opts.path}`
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical },
    robots: opts.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      url: canonical,
      locale: 'en_IN',
      ...(opts.modified ? { modifiedTime: opts.modified.toISOString() } : {}),
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description },
  }
}
