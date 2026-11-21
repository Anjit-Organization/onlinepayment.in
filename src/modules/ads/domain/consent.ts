/**
 * Consent vocabulary and the Consent Mode v2 default payload.
 *
 * Pure by lint rule, like the rest of `domain/`: this builds a string and
 * decides who is in scope. Nothing here loads anything.
 *
 * The thing to understand before changing any of it: Google requires a
 * *Google-certified* CMP integrated with the IAB TCF to serve personalized ads
 * to the EEA, the UK and Switzerland. A banner we write ourselves is not
 * certified, however correct its UI, and traffic behind one is eligible only
 * for non-personalized or limited ads. So this module never renders a dialog.
 * It declares defaults and loads a certified CMP. TECHNICAL.md §6.5.
 */

/** Signals Consent Mode v2 understands. */
export type ConsentSignal =
  | 'ad_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'analytics_storage'

export const CONSENT_SIGNALS: readonly ConsentSignal[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
]

export type ConsentValue = 'granted' | 'denied'

/**
 * Where consent must be collected before personalized ads may serve: the EU 27,
 * the three non-EU EEA states, the UK and Switzerland.
 *
 * ISO 3166-1 alpha-2, which is what Consent Mode's `region` expects. Keep it
 * sorted — a duplicate or a stray code is easy to miss in review, and the
 * `consent` unit test checks both.
 */
export const CONSENT_REQUIRED_REGIONS: readonly string[] = [
  // EU 27
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
  'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
  'SE', 'SI', 'SK',
  // EEA, non-EU
  'IS', 'LI', 'NO',
  // UK and Switzerland
  'CH', 'GB',
]

/**
 * How long tags wait for the CMP to report a decision before acting on the
 * defaults below. Google's guidance is 500ms; shorter risks firing on `denied`
 * for a user who had already consented on a previous visit.
 */
export const CONSENT_WAIT_FOR_UPDATE_MS = 500

/**
 * The inline script that sets Consent Mode v2 defaults.
 *
 * Two `default` calls, deliberately:
 *
 *  1. a global one granting storage, which is the state for the traffic this
 *     site actually has — India and the rest of the non-EEA world; and
 *  2. a region-scoped one denying everything for CONSENT_REQUIRED_REGIONS.
 *
 * The region-scoped call takes precedence over the global one regardless of
 * order, so an EEA visitor starts denied and stays denied until the CMP says
 * otherwise. This must execute *before* the ad tag, which is why
 * `ConsentScript` renders it `beforeInteractive`.
 *
 * India's DPDP Act is not addressed here. Consent Mode is Google's mechanism
 * for Google's tags; DPDP obligations are a separate piece of work and this
 * function is not it.
 */
export function buildConsentModeScript(): string {
  const denied: Record<string, unknown> = {
    ...Object.fromEntries(CONSENT_SIGNALS.map((signal) => [signal, 'denied'])),
    region: CONSENT_REQUIRED_REGIONS,
    wait_for_update: CONSENT_WAIT_FOR_UPDATE_MS,
  }

  const granted = Object.fromEntries(CONSENT_SIGNALS.map((signal) => [signal, 'granted']))

  return [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){window.dataLayer.push(arguments);}',
    `gtag('consent','default',${JSON.stringify(granted)});`,
    `gtag('consent','default',${JSON.stringify(denied)});`,
  ].join('')
}
