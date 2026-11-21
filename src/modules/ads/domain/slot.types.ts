/**
 * The pure vocabulary of the ad system: which slots exist, which page types
 * exist, and the shape of a slot's reserved box.
 *
 * `domain/` is lint-enforced pure — no React, no `next/*`, no env, no DB. That
 * is what lets the placement policy be unit-tested without a renderer, and it
 * is why every provider SDK detail lives in `providers/` instead.
 * TECHNICAL.md §6.1.
 */

export const SLOT_IDS = [
  'in-content-1',
  'in-content-2',
  'sidebar-sticky',
  'footer',
  'anchor',
] as const

export type SlotId = (typeof SLOT_IDS)[number]

/**
 * Page types are an ad-system concept, not a route list: many routes share one
 * type (every `/charges/*` page is `charges`). Adding a route never requires
 * touching this. Adding a new *kind* of page does, and the exhaustive
 * `Record<PageType, …>` on AD_POLICY is what makes that a type error rather
 * than a silently ad-free page.
 */
export const PAGE_TYPES = [
  'charges',
  'compare',
  'calculator',
  'best',
  'guide',
  'upiGuide',
  'tool',
  'ifscLeaf',
  'methodology',
  'about',
  'disclosure',
  'mdrTracker',
] as const

export type PageType = (typeof PAGE_TYPES)[number]

export type AdProviderId = 'adsense' | 'ezoic' | 'noop'

export type SlotPlacement = 'in-content' | 'sidebar' | 'footer' | 'anchor'

/**
 * A creative size in CSS pixels. A `'fluid'` width means the provider picks the
 * width and we commit only to a height — which is all the reserved box needs.
 */
export interface SlotSize {
  readonly width: number | 'fluid'
  readonly height: number
}

export interface AdSlotSpec {
  readonly id: SlotId
  readonly placement: SlotPlacement
  /** `null` = not served at that breakpoint, so nothing is reserved there. */
  readonly mobile: SlotSize | null
  readonly desktop: SlotSize | null
  /**
   * Below-fold slots defer the ad request to an IntersectionObserver and are
   * allowed `content-visibility: auto`. No slot is above the fold today (§6.3
   * forbids it), but keeping this a flag means that stays a policy decision
   * rather than an accident of implementation.
   */
  readonly belowFold: boolean
  /** `false` ships the slot inert even when a page type lists it. §6.5. */
  readonly enabled: boolean
}

/** Whether this slot serves a creative at the given breakpoint at all. */
export function isServedOn(slot: AdSlotSpec, breakpoint: 'mobile' | 'desktop'): boolean {
  return slot[breakpoint] !== null
}

/** The tallest creative the slot can serve at a breakpoint; 0 when unserved. */
export function reservedHeight(slot: AdSlotSpec, breakpoint: 'mobile' | 'desktop'): number {
  return slot[breakpoint]?.height ?? 0
}
