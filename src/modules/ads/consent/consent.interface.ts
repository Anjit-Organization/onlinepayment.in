import type { AdScriptSpec } from '../providers/provider.interface'

export type ConsentProviderId = 'google' | 'custom' | 'none'

/**
 * A consent adapter.
 *
 * Server-safe and React-free, for the same reason the ad providers are: the
 * decision is made during render on the server and only the resulting script
 * spec crosses to the client.
 */
export interface ConsentProvider {
  readonly id: ConsentProviderId

  /**
   * Whether this provider is a Google-certified CMP integrated with the IAB
   * TCF. Only traffic behind one of those is eligible for personalized ads in
   * the EEA, the UK and Switzerland; everything else gets non-personalized or
   * limited ads at best. `false` here is what makes the build refuse to ship
   * ads — see the refinement in common/config.
   */
  readonly certified: boolean

  /**
   * The CMP's own script, or `null` when it does not need one.
   *
   * `null` is not "no consent". Google's Privacy & messaging — the free
   * certified CMP most AdSense publishers use — is configured in the AdSense
   * UI and delivered through the existing AdSense tag, so there is genuinely
   * nothing for us to load.
   */
  script(): AdScriptSpec | null

  /**
   * Whether to emit the Consent Mode v2 defaults ahead of the ad tag. Google's
   * own CMP sets them itself; a third-party CMP generally expects the publisher
   * to declare them first.
   */
  readonly needsConsentModeDefaults: boolean
}
