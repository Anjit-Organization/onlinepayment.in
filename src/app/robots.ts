import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/common/config'

/**
 * AI crawlers are explicitly ALLOWED. BUILD-PLAN §5.8.
 *
 * With ~68% of searches ending without a click, being cited is worth nearly as
 * much as being clicked — and citation drives branded search, the one segment
 * AI search does not erode. Blocking these would protect nothing we sell.
 */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bingbot',
]

/**
 * NOTE: there is deliberately no blanket `/*?` rule here.
 *
 * It looked like cheap crawl-trap insurance, but this site has no faceted or
 * filter params, and it silently blocked our own Open Graph image — Next
 * serves that at /opengraph-image?<hash>, so social and search crawlers that
 * respect robots.txt could not fetch the preview card.
 *
 * If query-string surfaces ever appear, block those specific params rather
 * than every URL that happens to carry one.
 */
const DISALLOW = ['/api/', '/_next/data/', '/search']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
