import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/common/config'
import { SCENARIOS, USE_CASES } from '@/modules/calculator'
import { allPairs, pairSlug } from '@/modules/compare'
import { buildDataset } from '@/modules/dataset'
import { METHOD_PAGES, getVerifiedGateways } from '@/modules/pricing'
import { getTracker } from '@/modules/regulatory'
import { TOOLS } from '@/modules/tools'
import { STATIC_ROUTES } from '@/modules/seo'

/**
 * The verification gate. TECHNICAL §9.3 / BUILD-PLAN §5.4.
 *
 * Only VERIFIED data reaches the sitemap. A drafted gateway page still renders
 * (so it can be reviewed in situ) but is noindex and absent from here, so it can
 * never be submitted to Google by accident. Promoting a record to `verified` in
 * its seed file is what publishes it.
 *
 * lastModified is never `new Date()` — fabricated values get sitemaps ignored.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: new Date(r.lastModified),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const verified = getVerifiedGateways()
  // Hubs publish once there is verified data to show. They render ONLY verified
  // providers, so an unverified provider cannot leak onto an indexed page —
  // which is what the old "every provider verified" gate was protecting against.
  // That gate could never open: CCAvenue publishes no public rate card at all.
  const canPublishHubs = verified.length >= 2

  // Individual gateway pages: each gated on its own verification state.
  for (const g of verified) {
    entries.push({
      url: `${SITE_URL}/charges/${g.slug}/`,
      lastModified: new Date(g.verifiedAt),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  }

  // Hubs and the calculator compare across providers, so they only publish once
  // EVERY provider shown on them is verified. A hub listing one unverified rate
  // is an unverified hub.
  if (canPublishHubs) {
    const newest = verified
      .map((g) => g.verifiedAt)
      .sort()
      .at(-1)!

    entries.push({
      url: `${SITE_URL}/charges/`,
      lastModified: new Date(newest),
      changeFrequency: 'weekly',
      priority: 0.9,
    })
    entries.push({
      url: `${SITE_URL}/calculator/`,
      lastModified: new Date(newest),
      changeFrequency: 'weekly',
      priority: 1.0,
    })
    for (const s of SCENARIOS) {
      entries.push({
        url: `${SITE_URL}/calculator/${s.slug}/`,
        lastModified: new Date(newest),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // Comparisons and use-case pages compare across providers, so they publish
    // only when every provider on them is verified.
    entries.push({
      url: `${SITE_URL}/compare/`,
      lastModified: new Date(newest),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    for (const [x, y] of allPairs(verified.map((g) => g.slug))) {
      entries.push({
        url: `${SITE_URL}/compare/${pairSlug(x, y)}/`,
        lastModified: new Date(newest),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // Method pages rank every provider on one method, so they publish on the
    // same condition as the other cross-provider surfaces.
    for (const m of METHOD_PAGES) {
      entries.push({
        url: `${SITE_URL}/charges/${m.slug}/`,
        lastModified: new Date(newest),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    entries.push({
      url: `${SITE_URL}/best/`,
      lastModified: new Date(newest),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    for (const u of USE_CASES) {
      entries.push({
        url: `${SITE_URL}/best/${u.slug}/`,
        lastModified: new Date(newest),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
  }

  /**
   * Tool pages. Two of the four render cross-provider pricing tables, so those
   * publish on the same condition as the other comparison surfaces; the
   * signature verifier and the IFSC checker carry no pricing and publish
   * unconditionally. lastModified is the tool's own content date.
   */
  const NEEDS_VERIFIED_PRICING = new Set(['bin-lookup', 'settlement-calculator'])

  entries.push({
    url: `${SITE_URL}/tools/`,
    lastModified: new Date(
      TOOLS.map((t) => t.lastModified)
        .sort()
        .at(-1)!,
    ),
    changeFrequency: 'monthly',
    priority: 0.7,
  })

  for (const t of TOOLS) {
    if (NEEDS_VERIFIED_PRICING.has(t.slug) && !canPublishHubs) continue
    entries.push({
      url: `${SITE_URL}/tools/${t.slug}/`,
      lastModified: new Date(t.lastModified),
      changeFrequency: 'monthly',
      priority: 0.7,
    })
  }

  /**
   * The dataset landing page. It is a projection of the same verified records
   * the hubs render, so it publishes on the same condition, and its lastModified
   * is the dataset's own version — the newest verifiedAt in the data.
   */
  if (canPublishHubs) {
    entries.push({
      url: `${SITE_URL}/data/`,
      lastModified: new Date(buildDataset(verified, SITE_URL).version),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  const tracker = getTracker('upi-mdr')
  if (tracker.state === 'verified') {
    entries.push({
      url: `${SITE_URL}/upi/mdr-tracker/`,
      lastModified: new Date(tracker.asOf),
      changeFrequency: 'daily',
      priority: 1.0,
    })
  }

  return entries
}
