import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env, isProd } from '../config'
import { ConfigError } from '../errors'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let cached: Db | undefined

/**
 * Lazy singleton. Phase 0 has no data-backed pages, so the app builds and runs
 * without DATABASE_URL — but any accidental data access fails loudly here
 * rather than silently returning nothing. TECHNICAL.md §9.1.
 *
 * Uses the pooled connection endpoint: ISR revalidation opens many short-lived
 * connections and would exhaust a direct Postgres connection limit.
 */
export function getDb(): Db {
  if (cached) return cached
  if (!env.DATABASE_URL) {
    throw new ConfigError(
      'DATABASE_URL is not set. Data-backed pages require it (Phase 1 onward).',
    )
  }
  const sql = postgres(env.DATABASE_URL, {
    max: isProd ? 10 : 2,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // required for transaction-mode poolers (pgBouncer / Neon)
  })
  cached = drizzle(sql, { schema })
  return cached
}

export const hasDb = (): boolean => !!env.DATABASE_URL

export { schema }
