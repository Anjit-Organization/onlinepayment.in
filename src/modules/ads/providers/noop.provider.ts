import type { AdProvider } from './provider.interface'

/**
 * The default provider: loads nothing, serves nothing.
 *
 * This is what runs in dev, in tests, and in production until `ADS_ENABLED`
 * flips. It exists so that "ads off" is a provider like any other rather than a
 * branch threaded through every call site — and so the site ships and earns
 * partner revenue whether or not AdSense ever approves us. §6, reason 1.
 */
export const noopProvider: AdProvider = {
  id: 'noop',
  script: () => null,
  canServe: () => false,
}
