import { AD_CLIENT_ID, AD_INVENTORY, AD_PROVIDER_ID, isSlotEnabled, unitIdsFor } from '../ads.config'
import type { PageType, SlotId } from '../domain/slot.types'
import { AdMount } from './ad-mount'
import { AdScript } from './ad-script'
import { ConsentScript } from './consent-script'

export interface AdSlotProps {
  id: SlotId
  pageType: PageType
}

/**
 * The only ad entry point in the codebase. Templates write exactly this:
 *
 *     <AdSlot id="in-content-1" pageType="guide" />
 *
 * and nothing else — no provider code, no `<ins>`, no script tags. When the
 * slot is disabled it renders literally nothing, so an ad-free page type ships
 * no markup, no script and no consent layer.
 *
 * Server component by design: the policy decision and the provider ids are
 * resolved from server-only env and handed to the client mount as props, so
 * `ADS_PROVIDER` and `ADSENSE_CLIENT_ID` never need to become `NEXT_PUBLIC_`.
 *
 * The reserved box deliberately carries **no inline height**. Heights are
 * per-breakpoint and come from CSS keyed on `data-slot` (`styles/ads.css`);
 * an inline style would beat the media queries and pin every slot to a single
 * height, which on mobile means reserving 280px for a 100px creative. §6.2.
 */
export function AdSlot({ id, pageType }: AdSlotProps) {
  if (!isSlotEnabled(pageType, id)) return null

  const slot = AD_INVENTORY[id]

  return (
    <>
      <div
        className="ad-slot"
        data-slot={slot.id}
        data-placement={slot.placement}
        role="complementary"
        aria-label="Advertisement"
      >
        <AdMount
          slot={slot}
          providerId={AD_PROVIDER_ID}
          unitId={unitIdsFor(id).unitId}
          clientId={AD_CLIENT_ID}
        />
      </div>
      {/* Consent first, then the ad tag. ConsentScript renders nothing on the
          google path, where the message rides the AdSense tag itself. */}
      <ConsentScript />
      <AdScript />
    </>
  )
}
