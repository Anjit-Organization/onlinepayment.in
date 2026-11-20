import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { gatewayStatus, integrationPlatform } from './enums'

export const gateways = pgTable(
  'gateways',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    slug: text('slug').notNull(),
    legalName: text('legal_name').notNull(),
    displayName: text('display_name').notNull(),
    website: text('website').notNull(),
    logoPath: text('logo_path'),
    rbiPaLicensed: boolean('rbi_pa_licensed').notNull().default(false),
    rbiLicenseRef: text('rbi_license_ref'),
    parentCompany: text('parent_company'),
    foundedYear: integer('founded_year'),
    hqCity: text('hq_city'),
    status: gatewayStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('gateways_slug_uq').on(t.slug),
    // Partial: only active gateways are ever listed.
    index('gateways_status_idx').on(t.status).where(sql`${t.status} = 'active'`),
  ],
)

export const features = pgTable(
  'features',
  {
    gatewayId: bigint('gateway_id', { mode: 'bigint' })
      .notNull()
      .references(() => gateways.id, { onDelete: 'cascade' }),
    featureKey: text('feature_key').notNull(),
    supported: boolean('supported').notNull(),
    notes: text('notes'),
  },
  (t) => [uniqueIndex('features_uq').on(t.gatewayId, t.featureKey)],
)

export const integrations = pgTable(
  'integrations',
  {
    gatewayId: bigint('gateway_id', { mode: 'bigint' })
      .notNull()
      .references(() => gateways.id, { onDelete: 'cascade' }),
    platform: integrationPlatform('platform').notNull(),
    isOfficial: boolean('is_official').notNull().default(false),
    pluginUrl: text('plugin_url'),
    sdkUrl: text('sdk_url'),
    docsUrl: text('docs_url'),
  },
  (t) => [uniqueIndex('integrations_uq').on(t.gatewayId, t.platform)],
)
