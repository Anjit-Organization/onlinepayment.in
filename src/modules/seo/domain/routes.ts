/**
 * The static route registry. Sitemap segments are generated from this, so a page
 * cannot ship without being registered — which is how we avoid orphans.
 * BUILD-PLAN §5.4.
 *
 * `lastModified` is a REAL content date, hand-set when the page's content
 * actually changes. Fabricated lastmod values get the whole sitemap ignored.
 * Data-backed pages take theirs from the data's verifiedAt instead.
 */
export type SitemapSegment = 'static' | 'charges' | 'calculator' | 'upi'

export type StaticRoute = {
  path: string
  segment: SitemapSegment
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
  lastModified: string
}

const PHASE_0 = '2026-11-19'

/**
 * Trust pages make no pricing claims, so they are always indexable. Everything
 * data-backed is gated on verification — see sitemap.ts.
 */
export const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', segment: 'static', changeFrequency: 'daily', priority: 1.0, lastModified: PHASE_0 },
  { path: '/methodology/', segment: 'static', changeFrequency: 'monthly', priority: 0.8, lastModified: PHASE_0 },
  { path: '/about/', segment: 'static', changeFrequency: 'monthly', priority: 0.5, lastModified: PHASE_0 },
  { path: '/disclosure/', segment: 'static', changeFrequency: 'monthly', priority: 0.5, lastModified: PHASE_0 },
  { path: '/corrections/', segment: 'static', changeFrequency: 'monthly', priority: 0.4, lastModified: PHASE_0 },
]

export const routesForSegment = (s: SitemapSegment): StaticRoute[] =>
  STATIC_ROUTES.filter((r) => r.segment === s)
