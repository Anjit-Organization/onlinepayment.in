import { SITE_URL } from '@/common/config'
import { buildDataset, toCsv } from '@/modules/dataset'
import { getVerifiedGateways } from '@/modules/pricing'

export const dynamic = 'force-static'

/**
 * The same data flattened to one row per provider-and-method, for everyone who
 * is going to open it in a spreadsheet rather than parse it. The JSON keeps the
 * nested extras (promos, pricing changes, third-party source attributions) that
 * do not survive flattening; this is the pricing grid.
 *
 * No `content-disposition: attachment` — a browser showing the file is a
 * feature, and anyone who wants it on disk is using curl or Save As anyway.
 */
export function GET(): Response {
  const dataset = buildDataset(getVerifiedGateways(), SITE_URL)

  return new Response(toCsv(dataset), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      'x-license': dataset.license.id,
      'link': `<${dataset.license.url}>; rel="license"`,
    },
  })
}
