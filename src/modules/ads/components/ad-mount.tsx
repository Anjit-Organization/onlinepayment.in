'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { AdProviderId, AdSlotSpec } from '../domain/slot.types'

/**
 * Everything that touches a provider SDK in the browser.
 *
 * Why the per-provider DOM is collected here instead of in each
 * `providers/*.provider.ts`: a module carrying `'use client'` cannot also
 * export functions a server component calls, and `AdSlot` calls `script()` and
 * `canServe()` on the server. The alternative was splitting every provider
 * across two files; one client file keyed by provider id is less to keep in
 * sync. Adding a provider means its adapter plus a branch in `ProviderUnit`.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[]
    ezstandalone?: {
      cmd?: Array<() => void>
      showAds?: (...ids: number[]) => void
    }
  }
}

/** How long after mount an unfilled slot is allowed to collapse. */
const FILL_GRACE_MS = 2500

/**
 * Below-fold slots do not request an ad until they are within 200px of the
 * viewport. A slot hidden by CSS at the current breakpoint — `sidebar-sticky`
 * below 1280px, `anchor` on desktop — never intersects, so it never costs a
 * request either. §6.2.
 */
function useNearViewport(ref: RefObject<HTMLDivElement | null>, deferred: boolean): boolean {
  const [near, setNear] = useState(!deferred)

  useEffect(() => {
    if (!deferred) return

    const el = ref.current
    if (!el) return

    // Old browsers and jsdom: serve immediately rather than never.
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, deferred])

  return near
}

/**
 * A slot that fails to fill collapses to zero — but only once paint is settled.
 *
 * Collapsing during paint is precisely the layout shift the reserved box exists
 * to prevent, so the check is deferred past a grace period and the answer is
 * written to a data attribute that CSS reads. No JS ever writes a height.
 */
function useUnfilled(ref: RefObject<HTMLDivElement | null>, mounted: boolean): boolean {
  const [unfilled, setUnfilled] = useState(false)

  useEffect(() => {
    if (!mounted) return

    const timer = window.setTimeout(() => {
      const el = ref.current
      if (!el) return

      // AdSense reports its own verdict; every provider renders an iframe when
      // it fills. Absence of both after the grace period means empty.
      const status = el.querySelector('ins.adsbygoogle')?.getAttribute('data-ad-status')
      const filled = status === 'filled' || (status !== 'unfilled' && !!el.querySelector('iframe'))

      setUnfilled(!filled)
    }, FILL_GRACE_MS)

    return () => window.clearTimeout(timer)
  }, [ref, mounted])

  return unfilled
}

function AdSenseUnit({
  slot,
  unitId,
  clientId,
}: {
  slot: AdSlotSpec
  unitId: string | null
  clientId: string | null
}) {
  const pushed = useRef(false)

  useEffect(() => {
    // Strict mode runs effects twice; a second push would request a second ad
    // into the same <ins> and AdSense logs it as an error.
    if (pushed.current) return
    pushed.current = true

    try {
      ;(window.adsbygoogle = window.adsbygoogle ?? []).push({})
    } catch {
      // Blocked by an extension, or the script has not landed yet. AdSense
      // drains its own queue on load, so there is nothing to recover here.
    }
  }, [])

  const fluid = slot.desktop?.width === 'fluid' || slot.mobile?.width === 'fluid'

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%', height: '100%' }}
      data-ad-client={clientId ?? undefined}
      data-ad-slot={unitId ?? undefined}
      data-ad-format={fluid ? 'auto' : undefined}
      data-full-width-responsive={fluid ? 'true' : undefined}
    />
  )
}

function EzoicUnit({ unitId }: { unitId: string | null }) {
  const placeholder = Number(unitId)
  const valid = Number.isInteger(placeholder) && placeholder > 0

  useEffect(() => {
    if (!valid) return

    const ez = (window.ezstandalone = window.ezstandalone ?? {})
    ez.cmd = ez.cmd ?? []
    ez.cmd.push(() => window.ezstandalone?.showAds?.(placeholder))
  }, [valid, placeholder])

  if (!valid) return null

  return <div id={`ezoic-pub-ad-placeholder-${placeholder}`} />
}

function ProviderUnit({
  providerId,
  slot,
  unitId,
  clientId,
}: {
  providerId: AdProviderId
  slot: AdSlotSpec
  unitId: string | null
  clientId: string | null
}) {
  switch (providerId) {
    case 'adsense':
      return <AdSenseUnit slot={slot} unitId={unitId} clientId={clientId} />
    case 'ezoic':
      return <EzoicUnit unitId={unitId} />
    case 'noop':
      return null
  }
}

export interface AdMountProps {
  slot: AdSlotSpec
  providerId: AdProviderId
  unitId: string | null
  clientId: string | null
}

export function AdMount({ slot, providerId, unitId, clientId }: AdMountProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const near = useNearViewport(hostRef, slot.belowFold)
  const unfilled = useUnfilled(hostRef, near)

  return (
    <div
      ref={hostRef}
      /* styles/ads.css reserves this box's height per breakpoint — the
         creative's box, not the slot's, so the label cannot eat into it. */
      data-ad-host=""
      data-unfilled={unfilled ? 'true' : undefined}
    >
      {near ? (
        <ProviderUnit providerId={providerId} slot={slot} unitId={unitId} clientId={clientId} />
      ) : null}
    </div>
  )
}
