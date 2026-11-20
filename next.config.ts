import type { NextConfig } from 'next'

/**
 * Build-time guard on the canonical origin.
 *
 * This lives here, not in the zod env schema, because next.config.ts runs in a
 * plain Node process with the real environment. Inside bundled app code
 * Turbopack does not expose arbitrary vars like VERCEL_ENV on process.env, so
 * the same check there silently passed and a deploy would have shipped
 * localhost canonicals across all 58 URLs.
 */
{
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const isDeploy = !!(process.env.VERCEL_ENV || process.env.CI)
  const isLocalhost = /localhost|127\.0\.0\.1/.test(siteUrl)

  if (isDeploy && isLocalhost) {
    throw new Error(
      '\n\nNEXT_PUBLIC_SITE_URL is not set (or points at localhost) in a deployment build.\n' +
        'Every canonical tag, sitemap URL and JSON-LD @id would point at localhost.\n' +
        'Set NEXT_PUBLIC_SITE_URL=https://onlinepayment.in in your Vercel project settings.\n',
    )
  }
  // A canonical origin that is not the domain actually served is the single
  // most effective way to stop a site being indexed: every sitemap URL
  // redirects, and every canonical points at a redirecting URL. Vercel exposes
  // the production domain it serves, so compare them.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (isDeploy && vercelHost && !isLocalhost) {
    const canonicalHost = new URL(siteUrl).host
    if (canonicalHost !== vercelHost) {
      console.warn(
        `\n  WARNING: canonical origin does not match the deployed domain.\n` +
          `    NEXT_PUBLIC_SITE_URL host : ${canonicalHost}\n` +
          `    Vercel production domain  : ${vercelHost}\n` +
          `  Every sitemap URL and canonical will point at ${canonicalHost},\n` +
          `  which redirects. Google reports these as "Page with redirect" and\n` +
          `  will not index them. Make the two match.\n`,
      )
    }
  }

  if (!isDeploy && isLocalhost && process.env.NODE_ENV === 'production') {
    console.warn(
      '\n  WARNING: building with NEXT_PUBLIC_SITE_URL=' + siteUrl + '\n' +
        '  Fine locally. Set the real origin before deploying.\n',
    )
  }
}

/**
 * Security headers. See TECHNICAL.md §9.3.
 *
 * NOTE on CSP: the ad-specific `script-src` entries are deliberately kept in one
 * named block so the cost of enabling ads on a page type stays visible. With
 * ADS_PROVIDER=noop (the Phase 0 default) none of them are emitted.
 */
const AD_SCRIPT_SRC: string[] = [] // populated per provider when ads are enabled

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${AD_SCRIPT_SRC.length ? ' ' + AD_SCRIPT_SRC.join(' ') : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data:`,
  `font-src 'self'`,
  `connect-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Trailing slash enforced with a 308 from the non-slash form. BUILD-PLAN §5.2.
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
