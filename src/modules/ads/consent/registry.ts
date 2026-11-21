import type { ConsentProvider, ConsentProviderId } from './consent.interface'
import { createCustomConsentProvider } from './custom.consent'
import { googleConsentProvider } from './google.consent'
import { noneConsentProvider } from './none.consent'

/**
 * `custom` is built per-call because it closes over CONSENT_CMP_SRC, so this is
 * a function rather than the flat `Record` the ad providers get.
 */
export function getConsentProvider(id: ConsentProviderId, cmpSrc: string | null): ConsentProvider {
  switch (id) {
    case 'google':
      return googleConsentProvider
    case 'custom':
      return createCustomConsentProvider(cmpSrc)
    case 'none':
      return noneConsentProvider
  }
}
