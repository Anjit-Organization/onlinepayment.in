import type { AdProvider } from './provider.interface'

/**
 * Ezoic, via the `ezstandalone` placeholder integration.
 *
 * The full-site/Humix mode is not used, for the same reason AdSense Auto Ads
 * are not: it places units itself. Placeholders keep placement ours.
 *
 * Ezoic unit ids are numeric placeholder ids, so this provider reads
 * `AD_UNIT_IDS` as numbers and refuses anything else.
 */
export const ezoicProvider: AdProvider = {
  id: 'ezoic',

  script() {
    return {
      id: 'ezstandalone-js',
      src: 'https://www.ezojs.com/ezoic/sa.min.js',
      attributes: { 'data-ezscrex': 'false' },
    }
  },

  canServe(_slot, { unitId }) {
    if (!unitId) return false
    const n = Number(unitId)
    return Number.isInteger(n) && n > 0
  },
}
