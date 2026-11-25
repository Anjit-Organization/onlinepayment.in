import { adsEnabled, consentCmpSrc, consentProviderId, env } from '@/common/config'
import { getConsentProvider } from './consent/registry'
import type { AdPolicy } from './domain/policy'
import { isSlotAllowed, slotsFor } from './domain/policy'
import type { AdProviderId, AdSlotSpec, PageType, SlotId } from './domain/slot.types'
import { getProvider } from './providers/registry'
import type { UnitIds } from './providers/provider.interface'

/**
 * Inventory and placement. This file is the whole of "where do ads go" —
 * templates never decide, they only name a slot and a page type.
 *
 * TECHNICAL.md §6.3 (inventory) and §6.4 (policy).
 */

/**
 * The slot inventory.
 *
 * `mobile`/`desktop` heights are the *tallest* creative the slot can serve at
 * that breakpoint, which is what `styles/ads.css` reserves before any script
 * runs. The two must agree: if a size changes here and not there, the box is
 * the wrong height and the CLS guarantee is gone. The `ads` unit test asserts
 * they match.
 *
 * No slot is above the fold on any page — that protects LCP, and Google's own
 * page-layout guidance treats ad-heavy above-fold layouts as a quality signal.
 */
export const AD_INVENTORY: Readonly<Record<SlotId, AdSlotSpec>> = {
  'in-content-1': {
    id: 'in-content-1',
    placement: 'in-content',
    mobile: { width: 320, height: 100 },
    desktop: { width: 336, height: 280 },
    belowFold: true,
    enabled: true,
  },

  'in-content-2': {
    id: 'in-content-2',
    placement: 'in-content',
    mobile: { width: 300, height: 250 },
    desktop: { width: 'fluid', height: 280 },
    belowFold: true,
    enabled: true,
  },

  /** Sidebar only exists at ≥1280px, so there is no mobile size to reserve. */
  'sidebar-sticky': {
    id: 'sidebar-sticky',
    placement: 'sidebar',
    mobile: null,
    desktop: { width: 300, height: 600 },
    belowFold: true,
    enabled: true,
  },

  footer: {
    id: 'footer',
    placement: 'footer',
    mobile: { width: 320, height: 100 },
    desktop: { width: 728, height: 90 },
    belowFold: true,
    enabled: true,
  },

  /**
   * Mobile sticky anchor. Highest RPM of any format and the worst effect on INP
   * and on how the site feels to use, so it ships off. Flip `enabled` to test
   * it, and measure INP before and after — not after alone. §6.5.
   */
  anchor: {
    id: 'anchor',
    placement: 'anchor',
    mobile: { width: 320, height: 50 },
    desktop: null,
    belowFold: false,
    enabled: false,
  },
}

/**
 * Placement policy.
 *
 * The reasoning, so it can be overridden knowingly: a visitor on
 * `/charges/razorpay/` or the calculator is a merchant about to choose a
 * gateway. If they click a partner link and activate, that is recurring revenue
 * on their transaction volume for as long as they stay. The same click on a
 * display ad is worth a fraction of a rupee. Ads on those pages trade a
 * compounding asset for a one-off. A visitor reading "what is UPI AutoPay" or
 * looking up an IFSC code will probably never sign up for anything — that
 * traffic is *only* monetisable by ads, so those pages carry them.
 *
 * Constraints that are not negotiable here: `methodology` and `disclosure` are
 * enforced ad-free in `domain/policy.ts` and listing slots for them has no
 * effect. An ad slot is also never placed adjacent to a partner CTA (it muddies
 * attribution, hurts conversion, and several affiliate T&Cs forbid it) and
 * never between a heading and the data table it introduces — those two are
 * placement decisions in the templates, which this file cannot police.
 */
export const AD_POLICY: AdPolicy = {
  // HIGH commercial intent — partner CTAs earn far more than a display click.
  charges: [],
  compare: [],
  calculator: [],
  best: [],

  // INFORMATIONAL — low partner intent, so display ads are the right call.
  guide: ['in-content-1', 'in-content-2', 'sidebar-sticky', 'footer'],
  upiGuide: ['in-content-1', 'in-content-2', 'sidebar-sticky', 'footer'],
  tool: ['in-content-1', 'footer'],
  ifscLeaf: ['in-content-1', 'footer'],

  // TRUST — ads here undermine the thing these pages exist to establish.
  methodology: [],
  about: [],
  disclosure: [],
  mdrTracker: [],
  // The dataset's whole value is being cited by other people's work. An ad
  // beside it is worth a fraction of a cent; being the source a journalist or
  // an assistant is willing to name is worth considerably more.
  dataset: [],
}

/**
 * The active provider. `adsEnabled` already folds in both `ADS_ENABLED` and
 * `ADS_PROVIDER !== 'noop'`, so this collapses to `noop` whenever ads are off
 * and there is no second place to get that wrong.
 */
export const AD_PROVIDER_ID: AdProviderId = adsEnabled ? env.ADS_PROVIDER : 'noop'

export const adProvider = getProvider(AD_PROVIDER_ID)

/**
 * The active consent layer. `common/config` already fails the boot if ads are
 * on with CONSENT_PROVIDER=none, so in a running app with ads enabled this is
 * always a certified CMP. The `certified` check in `isSlotEnabled` is the
 * second lock on the same door: cheap, and it means a future code path that
 * bypasses the env refinement still cannot serve an ad without consent.
 */
export const consentProvider = getConsentProvider(consentProviderId, consentCmpSrc)

/** Publisher account id, where the provider has such a thing. */
export const AD_CLIENT_ID: string | null = env.ADSENSE_CLIENT_ID ?? null

/**
 * Parses `AD_UNIT_IDS` ("slot-id:unit-id,…"). Unknown slot ids and malformed
 * pairs are dropped rather than thrown on: a typo in one unit id should cost
 * that one slot, not boot the whole site.
 */
function parseUnitIds(raw: string | undefined): Readonly<Partial<Record<SlotId, string>>> {
  if (!raw) return {}

  const out: Partial<Record<SlotId, string>> = {}

  for (const pair of raw.split(',')) {
    const [slot, unit] = pair.split(':').map((part) => part.trim())
    if (!slot || !unit) continue
    if (!(slot in AD_INVENTORY)) continue
    out[slot as SlotId] = unit
  }

  return out
}

export const AD_UNIT_IDS = parseUnitIds(env.AD_UNIT_IDS)

export function unitIdsFor(slotId: SlotId): UnitIds {
  return { clientId: AD_CLIENT_ID, unitId: AD_UNIT_IDS[slotId] ?? null }
}

/** The slots a page type may show, hard constraints applied. */
export function slotsForPage(pageType: PageType): readonly SlotId[] {
  return slotsFor(AD_POLICY, pageType)
}

/**
 * The single question `AdSlot` asks. Every gate in one place, fail-closed:
 * ads off, slot shipped off, page type disallows it, or the provider has no
 * unit id to serve — any of those and the slot renders nothing at all.
 */
export function isSlotEnabled(pageType: PageType, slotId: SlotId): boolean {
  if (!adsEnabled) return false
  if (!consentProvider.certified) return false

  const slot = AD_INVENTORY[slotId]
  if (!slot.enabled) return false
  if (!isSlotAllowed(AD_POLICY, pageType, slotId)) return false

  return adProvider.canServe(slot, unitIdsFor(slotId))
}

/**
 * Whether a page type will carry any ad at all, with the live config applied.
 *
 * This is the hook for the EEA consent layer: it must load only on pages that
 * actually serve an ad, which is how the high-value pages stay consent-free and
 * fast. Our analytics (Vercel, cookieless, same-origin) needs no consent of its
 * own. §6.5.
 */
export function pageHasAds(pageType: PageType): boolean {
  return slotsForPage(pageType).some((slotId) => isSlotEnabled(pageType, slotId))
}
