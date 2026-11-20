import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { verificationMethod } from './enums'

/**
 * The public proof that we maintain the dataset. Rendered as <ChangeEntry> on
 * gateway pages and /data/changelog/, and it is what makes us citable.
 */
export const changeLog = pgTable(
  'change_log',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    entityType: text('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'bigint' }).notNull(),
    fieldName: text('field_name').notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
    sourceUrl: text('source_url'),
    note: text('note'),
  },
  (t) => [
    // Always "latest N for this entity".
    index('change_log_entity_idx').on(t.entityType, t.entityId, t.changedAt.desc()),
    index('change_log_recent_idx').on(t.changedAt.desc()),
  ],
)

export const verificationLog = pgTable(
  'verification_log',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    entityType: text('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'bigint' }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedBy: text('verified_by').notNull(),
    method: verificationMethod('method').notNull(),
    evidenceUrl: text('evidence_url'),
  },
  (t) => [index('verification_log_entity_idx').on(t.entityType, t.entityId, t.verifiedAt.desc())],
)
