import { z } from 'zod'

/**
 * Env is parsed once, at module load. A missing variable fails the boot, never a
 * request. No other file may read process.env. TECHNICAL.md §9.1.
 */
const schema = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.string().url().default('https://onlinepayment.in'),
    /** Set by Vercel and by most CI runners; used to detect a real deployment. */
    VERCEL_ENV: z.string().optional(),
    CI: z.string().optional(),

    /**
     * Optional in Phase 0: there are no data-backed pages yet, so the app must
     * build and run without a database. `getDb()` throws if it is accessed
     * without this set, which keeps the failure loud but local.
     */
    DATABASE_URL: z.string().url().optional(),

    /**
     * Supabase. The publishable key is public by design — it is safe in
     * client-side code and protected by Row Level Security, not by secrecy.
     * DDL cannot go through it; migrations need DATABASE_URL.
     */
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20).optional(),

    REVALIDATE_SECRET: z.string().min(32).optional(),
    INDEXNOW_KEY: z.string().min(8).optional(),

    ADS_ENABLED: z.enum(['true', 'false']).default('false'),
    ADS_PROVIDER: z.enum(['adsense', 'ezoic', 'noop']).default('noop'),
    ADSENSE_CLIENT_ID: z.string().optional(),

    PLAUSIBLE_HOST: z.string().url().optional(),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((v) => v.ADS_PROVIDER !== 'adsense' || !!v.ADSENSE_CLIENT_ID, {
    message: 'ADSENSE_CLIENT_ID is required when ADS_PROVIDER=adsense',
    path: ['ADSENSE_CLIENT_ID'],
  })
  /**
   * Fail the build rather than ship localhost canonicals.
   *
   * Every canonical tag, sitemap URL, JSON-LD @id and the robots.txt Sitemap
   * directive is derived from this. Deploying with the default would point
   * Google at http://localhost:3000 for the entire site, which is close to the
   * worst single SEO mistake available. Better a loud failure at build time.
   */
  .refine(
    // Hard-fail on a real deployment or in CI. A plain local `next build` also
    // sets NODE_ENV=production, so gating on that alone would break every
    // local build; that case gets the warning below instead.
    (v) =>
      !(v.VERCEL_ENV || v.CI) || !/localhost|127\.0\.0\.1/.test(v.NEXT_PUBLIC_SITE_URL),
    {
      message:
        'NEXT_PUBLIC_SITE_URL still points at localhost in a production build. ' +
        'Set it to the real origin (https://onlinepayment.in) before deploying.',
      path: ['NEXT_PUBLIC_SITE_URL'],
    },
  )

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data

if (
  env.NODE_ENV === 'production' &&
  /localhost|127\.0\.0\.1/.test(env.NEXT_PUBLIC_SITE_URL)
) {
  console.warn(
    '\n  WARNING: NEXT_PUBLIC_SITE_URL is localhost in a production build.\n' +
      '  Canonicals, the sitemap and JSON-LD will all point at localhost.\n' +
      '  Set it to https://onlinepayment.in before deploying.\n',
  )
}

export const isProd = env.NODE_ENV === 'production'

/**
 * Subscriptions are only offered when there is somewhere to store them.
 * Without this the form would render and fail on every submission.
 */
export const subscriptionsEnabled = !!env.DATABASE_URL
export const adsEnabled = env.ADS_ENABLED === 'true' && env.ADS_PROVIDER !== 'noop'

/** Canonical origin, no trailing slash. */
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')

/** Data freshness thresholds. The UI never hardcodes these. UI.md §7.1. */
export const STALE_WARN_DAYS = 30
export const STALE_ALERT_DAYS = 60
export const STALE_BLOCK_DAYS = 90

/**
 * Editorial identity. YMYL finance content needs a named, contactable person
 * behind the figures — this is what /about/, the corrections route and the
 * Person JSON-LD all read from.
 */
export const AUTHOR = {
  name: 'Anjit Kumar Yadav',
  role: 'Editor',
  email: 'admin.onlinepayment@gmail.com',
} as const

export const CONTACT_EMAIL = AUTHOR.email

export const SITE_NAME = 'OnlinePayment.in'
export const SITE_TAGLINE = 'What Indian payments actually cost'
