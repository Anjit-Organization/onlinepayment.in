import { SITE_URL } from '@/common/config'
import { buildDataset } from '@/modules/dataset'
import { getVerifiedGateways } from '@/modules/pricing'

export const dynamic = 'force-static'

/**
 * The dataset itself. Statically generated at build time — it is derived from
 * committed seed files, so there is nothing to compute per request.
 *
 * CORS IS OPEN ON PURPOSE. This is published data under CC BY; a dataset a
 * browser cannot fetch is a dataset only a server can use, which excludes
 * exactly the people most likely to cite it. There is nothing here that is not
 * already on a public page.
 *
 * Two spaces of indentation rather than none: a human will open this in a
 * browser tab before any program does, and gzip flattens the difference.
 */
export function GET(): Response {
  const dataset = buildDataset(getVerifiedGateways(), SITE_URL)

  return new Response(JSON.stringify(dataset, null, 2) + '\n', {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
      'x-license': dataset.license.id,
      'link': `<${dataset.license.url}>; rel="license"`,
    },
  })
}
