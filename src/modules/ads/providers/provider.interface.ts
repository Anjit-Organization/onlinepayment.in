import type { AdProviderId, AdSlotSpec } from '../domain/slot.types'

/** The single script a provider needs, or `null` when it loads nothing. */
export interface AdScriptSpec {
  /** Stable id. `next/script` dedupes by it, which is what keeps it single. */
  readonly id: string
  readonly src: string
  readonly crossOrigin?: 'anonymous'
  /** Extra attributes, e.g. AdSense's `data-ad-client`. */
  readonly attributes?: Readonly<Record<string, string>>
}

export interface UnitIds {
  /** Publisher account id (AdSense's `ca-pub-…`). `null` for providers without one. */
  readonly clientId: string | null
  /** Per-slot unit id from `AD_UNIT_IDS`, when the provider needs one. */
  readonly unitId: string | null
}

/**
 * A provider adapter.
 *
 * Deliberately server-safe and React-free: it describes what to load and
 * whether a slot can serve, nothing more. The browser DOM each provider wants
 * lives in `components/ad-mount.tsx`, because a module carrying `'use client'`
 * cannot also export functions a server component calls — and `AdSlot` calls
 * both `script()` and `canServe()` on the server. See the note in that file.
 */
export interface AdProvider {
  readonly id: AdProviderId
  /** The one script tag this provider needs on a page that has an enabled slot. */
  script(clientId: string | null): AdScriptSpec | null
  /**
   * Fail-closed guard. A slot with no configured unit id renders nothing at
   * all rather than an empty box — a reserved 280px hole with no ad in it is
   * worse than no slot.
   */
  canServe(slot: AdSlotSpec, ids: UnitIds): boolean
}
