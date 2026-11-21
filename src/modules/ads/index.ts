/**
 * Public surface of the ads module.
 *
 * There is no `client.ts` counterpart: `AdSlot` is a server component on
 * purpose (it reads server-only env), and no client component should be
 * reaching for ad internals. If one ever needs to, the types below are the
 * only safe thing to hand it.
 */
export { AdSlot, type AdSlotProps } from './components/ad-slot'

export {
  AD_INVENTORY,
  AD_POLICY,
  AD_PROVIDER_ID,
  isSlotEnabled,
  pageHasAds,
  slotsForPage,
} from './ads.config'

export { consentProvider } from './ads.config'

export {
  CONSENT_REQUIRED_REGIONS,
  CONSENT_SIGNALS,
  CONSENT_WAIT_FOR_UPDATE_MS,
  buildConsentModeScript,
  type ConsentSignal,
  type ConsentValue,
} from './domain/consent'

export type { ConsentProvider, ConsentProviderId } from './consent/consent.interface'

export {
  ALWAYS_AD_FREE,
  isAlwaysAdFree,
  isSlotAllowed,
  pageTypeHasAds,
  slotsFor,
  type AdPolicy,
} from './domain/policy'

export {
  PAGE_TYPES,
  SLOT_IDS,
  isServedOn,
  reservedHeight,
  type AdProviderId,
  type AdSlotSpec,
  type PageType,
  type SlotId,
  type SlotPlacement,
} from './domain/slot.types'
