import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { authority, regulatoryCategory, regulatoryStatus } from './enums'

/**
 * Powers /upi/mdr-tracker/. The flagship page: a maintained live tracker of a
 * question that keeps changing, which AI Overviews cannot replace.
 */
export const regulatoryEvents = pgTable(
  'regulatory_events',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    category: regulatoryCategory('category').notNull(),
    status: regulatoryStatus('status').notNull(),
    authority: authority('authority').notNull(),
    announcedDate: timestamp('announced_date', { withTimezone: true }).notNull(),
    effectiveDate: timestamp('effective_date', { withTimezone: true }),
    deferredTo: timestamp('deferred_to', { withTimezone: true }),
    summary: text('summary').notNull(),
    impactOnMerchants: text('impact_on_merchants'),
    primarySourceUrl: text('primary_source_url').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    supersedesId: bigint('supersedes_id', { mode: 'bigint' }),
  },
  (t) => [
    uniqueIndex('regulatory_events_slug_uq').on(t.slug),
    index('regulatory_events_lookup_idx').on(t.category, t.status, t.effectiveDate.desc()),
  ],
)
