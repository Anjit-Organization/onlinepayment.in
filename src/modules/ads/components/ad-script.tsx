import Script from 'next/script'
import { AD_CLIENT_ID, adProvider } from '../ads.config'

/**
 * The provider's one script tag.
 *
 * §6.2 says "one `next/script` … mounted in the root layout, never per-slot".
 * It is rendered from `AdSlot` instead, and the deviation is deliberate: the
 * root layout cannot know the page type, so mounting it there would load ad JS
 * on `/charges/*`, `/compare/*` and the calculator — the zero-slot,
 * highest-intent pages whose CWV budget this module exists to protect, and the
 * pages §6.5 wants to stay consent-free.
 *
 * The "exactly one script" guarantee survives: at `lazyOnload` Next puts no
 * script tag in the SSR HTML (only a Flight entry per slot) and dedupes by src
 * when it injects on the client. Verified on a page rendering three enabled
 * slots: one `<script id="adsbygoogle-js">` in the DOM.
 */
export function AdScript() {
  const spec = adProvider.script(AD_CLIENT_ID)
  if (!spec) return null

  return (
    <Script
      id={spec.id}
      src={spec.src}
      strategy="lazyOnload"
      crossOrigin={spec.crossOrigin}
      {...spec.attributes}
    />
  )
}
