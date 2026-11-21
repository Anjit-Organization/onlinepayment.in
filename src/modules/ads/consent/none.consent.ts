import type { ConsentProvider } from './consent.interface'

/**
 * No consent layer — the shipped default.
 *
 * Loads nothing and, more importantly, is `certified: false`, which the config
 * refinement turns into a failed build if anyone sets ADS_ENABLED=true while
 * this is still the provider. Serving ads to the EEA, the UK or Switzerland
 * without a certified CMP is the specific mistake that gate exists to prevent.
 */
export const noneConsentProvider: ConsentProvider = {
  id: 'none',
  certified: false,
  script: () => null,
  needsConsentModeDefaults: false,
}
