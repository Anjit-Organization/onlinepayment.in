import type { PageType, SlotId } from './slot.types'

/** Which slots each page type may show. The data lives in `ads.config.ts`. */
export type AdPolicy = Readonly<Record<PageType, readonly SlotId[]>>

/**
 * Page types that stay ad-free whatever the config says.
 *
 * `/methodology/` and `/disclosure/` exist to establish that our numbers are
 * not for sale; an ad on either contradicts the only job that page has. So this
 * is an invariant in `domain/` rather than a default in config — a well-meaning
 * config edit should not be able to undo it. TECHNICAL.md §6.4.
 */
export const ALWAYS_AD_FREE: readonly PageType[] = ['methodology', 'disclosure']

export function isAlwaysAdFree(pageType: PageType): boolean {
  return ALWAYS_AD_FREE.includes(pageType)
}

/** The slots a page type may show, after the hard constraints are applied. */
export function slotsFor(policy: AdPolicy, pageType: PageType): readonly SlotId[] {
  if (isAlwaysAdFree(pageType)) return []
  return policy[pageType] ?? []
}

/** Pure placement decision: may this slot render on this page type? */
export function isSlotAllowed(policy: AdPolicy, pageType: PageType, slotId: SlotId): boolean {
  return slotsFor(policy, pageType).includes(slotId)
}

/**
 * Whether a page type carries any ads at all.
 *
 * The provider script and the EEA consent layer both hang off this: a page with
 * no enabled slot must load neither, which is what keeps the high-intent pages
 * fast and consent-free. §6.5.
 */
export function pageTypeHasAds(policy: AdPolicy, pageType: PageType): boolean {
  return slotsFor(policy, pageType).length > 0
}
