import type { ConsentProvider } from './consent.interface'

/**
 * Google Privacy & messaging (what used to be Funding Choices).
 *
 * The free, Google-certified, TCF-integrated CMP. It is configured entirely in
 * the AdSense UI — Privacy & messaging → GDPR → Create message — and then
 * served through the existing AdSense tag. There is no script for us to add and
 * no banner for us to write; `script()` returning `null` is the correct and
 * complete implementation.
 *
 * Two consequences worth knowing:
 *
 *  - Setting CONSENT_PROVIDER=google is a *declaration* that the message has
 *    been created and published in AdSense. Nothing in this codebase can verify
 *    that, so it stays a declaration.
 *  - Because the message rides the ad tag, and the ad tag only loads on pages
 *    with an enabled slot, §6.5's "consent is loaded only when an ad slot is
 *    actually enabled" is satisfied for free on this path.
 *
 * To test a message without waiting for EEA traffic, append
 * `?fc=alwaysshow&fctype=gdpr` to a page URL.
 */
export const googleConsentProvider: ConsentProvider = {
  id: 'google',
  certified: true,
  script: () => null,
  // Google's own CMP sets Consent Mode itself; a second set of defaults from us
  // would be redundant and could race it.
  needsConsentModeDefaults: false,
}
