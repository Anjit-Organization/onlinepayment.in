import { revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { env } from '@/common/config'
import { logger } from '@/common/logger'

/**
 * On-demand revalidation. TECHNICAL.md §5.2.
 *
 * The important half of the freshness pipeline: a verified rate change should be
 * live and submitted to IndexNow within seconds. For a site whose entire value
 * is freshness, this pipeline IS the product.
 */
const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(128)).min(1).max(64),
})

function authorised(header: string | null): boolean {
  if (!env.REVALIDATE_SECRET || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(env.REVALIDATE_SECRET)
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request): Promise<Response> {
  if (!authorised(req.headers.get('x-revalidate-secret'))) {
    return Response.json({ error: 'unauthorised' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'invalid body' }, { status: 400 })
  }

  // Next 16 requires a cacheLife profile. 'max' fully expires the tag, which is
  // what a verified pricing change needs — the old figure must not be served.
  for (const tag of parsed.data.tags) revalidateTag(tag, 'max')
  logger.info('revalidated', { tagCount: parsed.data.tags.length })

  // TODO Phase 1: write to change_log, then ping IndexNow with the changed URLs.
  return Response.json({ revalidated: parsed.data.tags.length })
}
