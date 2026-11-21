import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AD_INVENTORY,
  AD_POLICY,
  ALWAYS_AD_FREE,
  PAGE_TYPES,
  SLOT_IDS,
  isAlwaysAdFree,
  isSlotAllowed,
  isSlotEnabled,
  pageTypeHasAds,
  reservedHeight,
  slotsFor,
} from '@/modules/ads'
import type { AdPolicy, PageType, SlotId } from '@/modules/ads'

/**
 * These tests guard the three things that are expensive to get wrong: the
 * hard ad-free invariants, the money decision about which page types carry
 * ads, and the reserved heights (where a mismatch between config and CSS is
 * invisible in review and shows up as a CLS regression in the field).
 */

describe('hard constraints', () => {
  it('keeps methodology and disclosure ad-free whatever the config says', () => {
    const reckless: AdPolicy = {
      ...AD_POLICY,
      methodology: ['in-content-1', 'footer'],
      disclosure: ['in-content-1', 'footer'],
    }

    for (const pageType of ALWAYS_AD_FREE) {
      expect(slotsFor(reckless, pageType)).toEqual([])
      expect(isSlotAllowed(reckless, pageType, 'in-content-1')).toBe(false)
      expect(pageTypeHasAds(reckless, pageType)).toBe(false)
    }
  })

  it('names methodology and disclosure as the always-ad-free pair', () => {
    expect(isAlwaysAdFree('methodology')).toBe(true)
    expect(isAlwaysAdFree('disclosure')).toBe(true)
    expect(isAlwaysAdFree('guide')).toBe(false)
  })
})

describe('placement policy', () => {
  const HIGH_INTENT: PageType[] = ['charges', 'compare', 'calculator', 'best']
  const TRUST: PageType[] = ['methodology', 'about', 'disclosure', 'mdrTracker']
  const INFORMATIONAL: PageType[] = ['guide', 'upiGuide', 'tool', 'ifscLeaf']

  it('carries no ads on high-intent pages', () => {
    // A partner activation there is recurring revenue on the merchant's volume;
    // a display click is worth paise. If this ever goes green-to-red, someone
    // has traded a compounding asset for a one-off.
    for (const pageType of HIGH_INTENT) {
      expect(pageTypeHasAds(AD_POLICY, pageType)).toBe(false)
    }
  })

  it('carries no ads on trust pages', () => {
    for (const pageType of TRUST) {
      expect(pageTypeHasAds(AD_POLICY, pageType)).toBe(false)
    }
  })

  it('carries ads on informational pages', () => {
    for (const pageType of INFORMATIONAL) {
      expect(pageTypeHasAds(AD_POLICY, pageType)).toBe(true)
    }
  })

  it('covers every page type, so a new one is never silently ad-free', () => {
    for (const pageType of PAGE_TYPES) {
      expect(AD_POLICY[pageType]).toBeDefined()
    }
  })

  it('references only slots that exist in the inventory', () => {
    for (const slots of Object.values(AD_POLICY)) {
      for (const slotId of slots) {
        expect(SLOT_IDS).toContain(slotId)
      }
    }
  })

  it('lists no slot twice on one page type', () => {
    for (const [pageType, slots] of Object.entries(AD_POLICY)) {
      expect(new Set(slots).size, `${pageType} repeats a slot`).toBe(slots.length)
    }
  })
})

describe('inventory', () => {
  it('serves every slot on at least one breakpoint', () => {
    for (const slotId of SLOT_IDS) {
      const slot = AD_INVENTORY[slotId]
      expect(slot.mobile ?? slot.desktop, `${slotId} is served nowhere`).not.toBeNull()
    }
  })

  it('ships the anchor slot disabled', () => {
    // Highest RPM, worst INP. §6.5 says measure before flipping this.
    expect(AD_INVENTORY.anchor.enabled).toBe(false)
  })

  it('does not serve the sidebar on mobile or the anchor on desktop', () => {
    expect(AD_INVENTORY['sidebar-sticky'].mobile).toBeNull()
    expect(AD_INVENTORY.anchor.desktop).toBeNull()
  })

  it('defers every slot that is not the anchor', () => {
    // No slot renders above the fold (§6.3), so everything else lazy-mounts.
    for (const slotId of SLOT_IDS) {
      if (slotId === 'anchor') continue
      expect(AD_INVENTORY[slotId].belowFold, `${slotId} should be below fold`).toBe(true)
    }
  })

  it('keys every entry by its own id', () => {
    for (const slotId of SLOT_IDS) {
      expect(AD_INVENTORY[slotId].id).toBe(slotId)
    }
  })
})

describe('reserved heights match styles/ads.css', () => {
  /**
   * The CLS guarantee is a handshake between two files. Config says a slot can
   * serve a 280px creative; CSS reserves 280px for it. Nothing in the type
   * system connects them, so this test reads the stylesheet and checks.
   */
  const css = readFileSync(
    fileURLToPath(new URL('../../src/styles/ads.css', import.meta.url)),
    'utf8',
  )

  /** Last `min-height` declared for a slot's host inside the given block. */
  function declaredMinHeight(slotId: SlotId, scope: string): number | null {
    const pattern = new RegExp(
      `\\.ad-slot\\[data-slot='${slotId}'\\] \\[data-ad-host\\] \\{[^}]*?min-height:\\s*(\\d+)px`,
      'g',
    )
    const matches = [...scope.matchAll(pattern)]
    const last = matches.at(-1)
    return last ? Number(last[1]) : null
  }

  const desktopBlock = css.slice(css.indexOf('@media (width >= 768px)'))
  const xlBlock = css.slice(css.indexOf('@media (width >= 1280px)'))
  const mobileBlock = css.slice(0, css.indexOf('@media (width >= 768px)'))

  it.each(SLOT_IDS.filter((id) => AD_INVENTORY[id].mobile !== null))(
    'reserves the mobile height for %s',
    (slotId) => {
      expect(declaredMinHeight(slotId, mobileBlock)).toBe(reservedHeight(AD_INVENTORY[slotId], 'mobile'))
    },
  )

  it.each(['in-content-1', 'in-content-2', 'footer'] as const)(
    'reserves the desktop height for %s',
    (slotId) => {
      expect(declaredMinHeight(slotId, desktopBlock)).toBe(
        reservedHeight(AD_INVENTORY[slotId], 'desktop'),
      )
    },
  )

  it('reserves the sidebar height at its own breakpoint', () => {
    expect(declaredMinHeight('sidebar-sticky', xlBlock)).toBe(
      reservedHeight(AD_INVENTORY['sidebar-sticky'], 'desktop'),
    )
  })

  it('declares no min-height on .ad-slot itself', () => {
    // A min-height on the outer box is shared with the "Advertisement" label,
    // so the creative would push the box taller on fill. That is the shift.
    expect(css).not.toMatch(/\.ad-slot\[data-slot='[^']+'\] \{[^}]*min-height:\s*[1-9]/)
  })
})

describe('isSlotEnabled with ads off (the shipped default)', () => {
  it('enables nothing anywhere', () => {
    // ADS_ENABLED defaults to 'false' and ADS_PROVIDER to 'noop', so the whole
    // system must be inert until both are set — including on page types whose
    // policy lists slots.
    for (const pageType of PAGE_TYPES) {
      for (const slotId of SLOT_IDS) {
        expect(isSlotEnabled(pageType, slotId), `${pageType}/${slotId}`).toBe(false)
      }
    }
  })
})
