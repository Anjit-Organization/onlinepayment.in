import type { AdProvider } from './provider.interface'

/**
 * Google AdSense — manual units only.
 *
 * Auto Ads are deliberately unsupported, with no config switch to turn them on.
 * They inject units wherever Google decides, which breaks both the reserved-box
 * CLS guarantee (§6.2) and the placement policy that keeps ads off the
 * high-intent and trust pages (§6.4). An Auto Ads tag would quietly put a unit
 * on `/charges/razorpay/` and on `/methodology/`. TECHNICAL.md §6.5.
 */
export const adsenseProvider: AdProvider = {
  id: 'adsense',

  script(clientId) {
    if (!clientId) return null

    return {
      id: 'adsbygoogle-js',
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`,
      crossOrigin: 'anonymous',
      attributes: { 'data-ad-client': clientId },
    }
  },

  /** AdSense needs both the publisher id and a per-unit `data-ad-slot`. */
  canServe(_slot, { clientId, unitId }) {
    return !!clientId && !!unitId
  },
}
