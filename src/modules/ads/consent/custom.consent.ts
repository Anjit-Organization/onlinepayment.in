import type { AdScriptSpec } from '../providers/provider.interface'
import type { ConsentProvider } from './consent.interface'

/**
 * A third-party CMP, loaded from CONSENT_CMP_SRC.
 *
 * For a Cookiebot, Sourcepoint, Didomi or similar. The URL must belong to a CMP
 * on Google's certified list — Google certifies for TCF compliance only, does
 * not check CMPs against privacy law generally, and adds to that list over
 * time, so check it rather than assuming a familiar name is on it.
 *
 * The script loads `beforeInteractive`: a CMP that lands after the ad tag has
 * already requested an ad has not gated anything. That ordering is the whole
 * reason this is a provider rather than a line in the root layout.
 */
export function createCustomConsentProvider(src: string | null): ConsentProvider {
  return {
    id: 'custom',

    // Certification is a property of the CMP we cannot inspect from a URL. The
    // operator asserts it by configuring this provider at all; the build gate
    // exists to make that an explicit choice rather than a default.
    certified: true,

    script(): AdScriptSpec | null {
      if (!src) return null
      return { id: 'cmp-js', src }
    },

    needsConsentModeDefaults: true,
  }
}
