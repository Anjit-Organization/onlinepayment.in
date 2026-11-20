import { sql } from 'drizzle-orm'
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/**
 * The MDR tracker's "notify me" list — the one asset an algorithm cannot take
 * away. BUILD-PLAN §T4.
 *
 * SECURITY: this table is written through the PUBLISHABLE key, which is public
 * by design. Its RLS policy must allow INSERT only. There must be NO select
 * policy, or anyone holding the public key could dump the subscriber list.
 * See drizzle/0002_subscribers.sql.
 */
export const subscribers = pgTable(
  'subscribers',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    email: text('email').notNull(),
    /** Which list: 'upi-mdr' for now. */
    topic: text('topic').notNull(),
    /** Where they signed up, for attribution. */
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** Double opt-in. Null until the confirmation link is followed. */
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('subscribers_email_topic_uq').on(t.email, t.topic),
    index('subscribers_topic_idx')
      .on(t.topic, t.createdAt.desc())
      .where(sql`${t.unsubscribedAt} IS NULL`),
  ],
)
