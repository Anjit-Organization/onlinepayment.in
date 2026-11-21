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

    /**
     * Maps our slot ids to the active provider's own unit ids:
     *
     *   in-content-1:1234567890,in-content-2:2345678901,footer:3456789012
     *
     * Provider-agnostic on purpose. AdSense wants a `data-ad-slot`, Ezoic wants
     * a numeric placeholder id, and neither spelling should reach a template.
     * A slot with no entry here renders nothing at all rather than an empty
     * reserved box. Parsed in modules/ads/ads.config.ts. TECHNICAL.md §6.
     */
    AD_UNIT_IDS: z.string().optional(),

    /**
     * Which consent layer is in place. `none` is the default and, by the
     * refinement below, is incompatible with ads being on.
     *
     *   google — Google Privacy & messaging, configured in the AdSense UI and
     *            delivered through the AdSense tag. Nothing to load here.
     *   custom — a third-party CMP from Google's certified list, loaded from
     *            CONSENT_CMP_SRC.
     */
    CONSENT_PROVIDER: z.enum(['google', 'custom', 'none']).default('none'),
    CONSENT_CMP_SRC: z.string().url().optional(),

    PLAUSIBLE_HOST: z.string().url().optional(),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  })
  .refine((v) => v.ADS_PROVIDER !== 'adsense' || !!v.ADSENSE_CLIENT_ID, {
    message: 'ADSENSE_CLIENT_ID is required when ADS_PROVIDER=adsense',
    path: ['ADSENSE_CLIENT_ID'],
  })
  .refine((v) => v.CONSENT_PROVIDER !== 'custom' || !!v.CONSENT_CMP_SRC, {
    message: 'CONSENT_CMP_SRC is required when CONSENT_PROVIDER=custom',
    path: ['CONSENT_CMP_SRC'],
  })
  /**
   * Ads may not be switched on without a consent layer.
   *
   * Google requires a Google-certified CMP integrated with the IAB TCF to serve
   * personalized ads in the EEA, the UK and Switzerland. Without one, that
   * traffic is eligible for non-personalized or limited ads at best, and the
   * publisher is carrying the legal exposure. We cannot detect an EEA visitor
   * at build time, so the gate is unconditional: declare a CMP or keep ads off.
   *
   * A loud build failure is the right failure here. The alternative is shipping
   * ads that look fine from India and are a problem the moment someone in
   * Dublin loads the page.
   */
  .refine((v) => !(v.ADS_ENABLED === 'true' && v.ADS_PROVIDER !== 'noop') || v.CONSENT_PROVIDER !== 'none', {
    message:
      'Ads are enabled but CONSENT_PROVIDER is "none". Serving ads in the EEA, the UK or ' +
      'Switzerland requires a Google-certified CMP. Set CONSENT_PROVIDER=google (configure the ' +
      'message in AdSense under Privacy & messaging) or =custom with CONSENT_CMP_SRC.',
    path: ['CONSENT_PROVIDER'],
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

/**
 * The consent layer is only ever relevant when ads are. Nothing else on the
 * site needs consent: our analytics is cookieless and same-origin.
 */
export const consentProviderId = adsEnabled ? env.CONSENT_PROVIDER : 'none'
export const consentCmpSrc = env.CONSENT_CMP_SRC ?? null

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
