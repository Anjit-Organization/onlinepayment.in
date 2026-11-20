import { getDb, hasDb } from '@/common/db/client'
import { subscribers } from '@/common/db/schema'
import { logger } from '@/common/logger'
import { AppError, ConfigError } from '@/common/errors'
import { err, ok, type Result } from '@/common/result'

/**
 * Writes through Drizzle to Postgres.
 *
 * This previously posted to Supabase PostgREST with the publishable key. The
 * database moved to Neon, which has no REST layer, so that path wrote to a
 * table that did not exist — the form rendered and every submission failed.
 *
 * A server-only connection is also the stronger posture: there is no public key
 * that can reach this table at all, and the app exposes no read endpoint for it.
 */

export type SubscribeFailure = 'already_subscribed' | 'storage_unavailable' | 'rejected'

const fail = (reason: SubscribeFailure, code: 'UPSTREAM' | 'VALIDATION', msg: string) =>
  err(Object.assign(new AppError(code, msg), { reason }))

export async function insertSubscriber(
  email: string,
  topic: string,
  source: string,
): Promise<Result<'created', AppError & { reason: SubscribeFailure }>> {
  if (!hasDb()) {
    throw new ConfigError('DATABASE_URL is not set; subscriptions cannot be accepted.')
  }

  try {
    const result = await getDb()
      .insert(subscribers)
      .values({ email: email.toLowerCase(), topic, source })
      // Untargeted: the unique index is on lower(email) + topic, an expression
      // index that Drizzle's typed target cannot express. It is also the only
      // unique constraint on this table, so a bare conflict means exactly that.
      .onConflictDoNothing()
      .returning({ id: subscribers.id })

    if (result.length === 0) return fail('already_subscribed', 'VALIDATION', 'already subscribed')
    return ok('created')
  } catch (e) {
    // Never log the error body verbatim: it can echo the submitted address.
    logger.error('subscriber insert failed', {
      code: e instanceof Error ? e.name : 'unknown',
    })
    return fail('storage_unavailable', 'UPSTREAM', 'storage unreachable')
  }
}
