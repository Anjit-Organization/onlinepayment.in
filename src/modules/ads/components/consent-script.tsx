import Script from 'next/script'
import { consentProvider } from '../ads.config'
import { buildConsentModeScript } from '../domain/consent'

/**
 * The consent layer, such as it is in code.
 *
 * There is no banner here by design. Google requires a Google-certified CMP
 * integrated with the IAB TCF to serve personalized ads to the EEA, the UK and
 * Switzerland; a dialog we wrote ourselves is not certified and traffic behind
 * one is eligible for non-personalized or limited ads at best. So this renders
 * at most two things: the Consent Mode v2 defaults, and the certified CMP's own
 * script. On the default `google` path it renders nothing at all, because
 * Privacy & messaging is delivered through the AdSense tag.
 *
 * Ordering. Consent must be established before an ad is requested. Both scripts
 * here are `afterInteractive` while the ad tag is `lazyOnload`, which runs
 * strictly later — and the ad request itself happens later still, when AdMount
 * pushes on intersection. `beforeInteractive` would be earlier but, in the App
 * Router, only works from the root layout, and putting it there would load
 * consent on `/charges/*` and the calculator, which §6.5 explicitly does not
 * want. If a future CMP genuinely needs defaults before hydration, the root
 * layout is the place and the cost is that page-type gating is lost.
 *
 * Rendered from `AdSlot`, so it exists only on pages with an enabled slot.
 */
export function ConsentScript() {
  const cmp = consentProvider.script()
  const needsDefaults = consentProvider.needsConsentModeDefaults

  if (!needsDefaults && !cmp) return null

  return (
    <>
      {needsDefaults ? (
        <Script
          id="consent-mode-defaults"
          strategy="afterInteractive"
          // Inline and tiny: it only pushes two `consent default` calls onto
          // the dataLayer. next/script dedupes inline scripts by id, so four
          // slots on a page still yield one copy.
          dangerouslySetInnerHTML={{ __html: buildConsentModeScript() }}
        />
      ) : null}

      {cmp ? <Script id={cmp.id} src={cmp.src} strategy="afterInteractive" /> : null}
    </>
  )
}
