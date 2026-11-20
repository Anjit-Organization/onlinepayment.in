import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/common/config'
import { SiteFooter, SiteHeader } from '@/common/ui/layout'
import { OrganizationJsonLd, WebSiteJsonLd } from '@/modules/seo'
import '@/styles/globals.css'

/**
 * next/font fetches at BUILD time and serves from our own origin, so this is
 * self-hosting — there is no runtime third-party request on the critical path.
 * UI.md §3.1.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex-sans',
  preload: true,
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-plex-mono',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description:
    'Independent, dated and sourced pricing data for Indian payment gateways. Compare real charges, calculate your true annual cost, and track UPI MDR changes.',
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximumScale and userScalable are deliberately NOT set: never block zoom.
}

/**
 * Blocking inline script to apply the stored theme before first paint. One of
 * the few places a blocking script is correct — without it there is a flash of
 * the wrong theme on every navigation.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        {/* Parked off-screen with a transform rather than sr-only +
            focus:not-sr-only: not-sr-only would not reliably undo sr-only here,
            leaving the link stuck at 1x1 and unusable by keyboard. */}
        <a
          href="#main"
          className="absolute start-2 top-2 z-50 -translate-y-20 rounded-md border border-border-control bg-surface px-4 py-2 text-body-sm no-underline transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        {/* Cookieless and same-origin: the script is served from
            /_vercel/insights and the beacon posts back to the same origin, so
            it needs no consent banner and no CSP relaxation. Inert off Vercel. */}
        <Analytics />
      </body>
    </html>
  )
}
