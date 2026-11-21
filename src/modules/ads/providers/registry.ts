import type { AdProviderId } from '../domain/slot.types'
import { adsenseProvider } from './adsense.provider'
import { ezoicProvider } from './ezoic.provider'
import { noopProvider } from './noop.provider'
import type { AdProvider } from './provider.interface'

/**
 * The exhaustive `Record` is the point: adding an id to `AdProviderId` without
 * writing its adapter is a type error, not a runtime `undefined`.
 */
const PROVIDERS: Readonly<Record<AdProviderId, AdProvider>> = {
  adsense: adsenseProvider,
  ezoic: ezoicProvider,
  noop: noopProvider,
}

export function getProvider(id: AdProviderId): AdProvider {
  return PROVIDERS[id]
}
