import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { cardNetwork, feeMethod, promoType } from './enums'
import { gateways } from './gateways'

/**
 * Fees are immutable. Never UPDATE a rate: close the old row with effective_to
 * and insert a new one. This gives the changelog for free, and the changelog is
 * the citable asset. TECHNICAL.md §3.
 */
export const pricingPlans = pgTable(
  'pricing_plans',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    gatewayId: bigint('gateway_id', { mode: 'bigint' })
      .notNull()
      .references(() => gateways.id, { onDelete: 'cascade' }),
    planName: text('plan_name').notNull(),
    slug: text('slug').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
    sourceUrl: text('source_url').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    verifiedBy: text('verified_by').notNull(),
    notes: text('notes'),
  },
  (t) => [
    // THE hot-path index. The partial predicate is the win: it holds only live
    // rows, so it stays small no matter how much history accumulates.
    index('pricing_plans_current_idx')
      .on(t.gatewayId, t.isDefault)
      .where(sql`${t.effectiveTo} IS NULL`),
    index('pricing_plans_temporal_idx').on(t.gatewayId, t.effectiveFrom.desc(), t.effectiveTo),
    // Nightly staleness sweep stays near-instant.
    index('pricing_plans_stale_idx')
      .on(t.verifiedAt)
      .where(sql`${t.effectiveTo} IS NULL`),
    // Exactly one current default plan per gateway.
    uniqueIndex('plans_one_current_default')
      .on(t.gatewayId)
      .where(sql`${t.effectiveTo} IS NULL AND ${t.isDefault}`),
    check('plans_period_order', sql`${t.effectiveTo} IS NULL OR ${t.effectiveTo} > ${t.effectiveFrom}`),
  ],
)

export const fees = pgTable(
  'fees',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    planId: bigint('plan_id', { mode: 'bigint' })
      .notNull()
      .references(() => pricingPlans.id, { onDelete: 'cascade' }),
    method: feeMethod('method').notNull(),
    network: cardNetwork('card_network'),
    /** Basis points. 1.95% -> 195. Never a float. */
    rateBp: integer('rate_bp'),
    flatFeePaise: bigint('flat_fee_paise', { mode: 'bigint' }),
    minFeePaise: bigint('min_fee_paise', { mode: 'bigint' }),
    maxFeePaise: bigint('max_fee_paise', { mode: 'bigint' }),
    /** Tiered pricing. UPI MDR above Rs 2,000 is exactly this shape. */
    bandMinPaise: bigint('band_min_paise', { mode: 'bigint' }),
    bandMaxPaise: bigint('band_max_paise', { mode: 'bigint' }),
    gstApplicable: boolean('gst_applicable').notNull().default(true),
  },
  (t) => [
    // NOTE: TECHNICAL.md §7.2 specifies a covering index with INCLUDE here.
    // Drizzle 0.45's index builder has no .include(), and the hot read path is
    // served by the current_pricing materialised view (§7.3) rather than by this
    // table directly, so a covering index on `fees` is premature. Plain
    // composite index instead; revisit if EXPLAIN shows heap fetches mattering.
    index('fees_plan_method_idx').on(t.planId, t.method),
    // Method-wise pages (/charges/upi/) scan across all gateways by method.
    index('fees_method_idx').on(t.method, t.planId),
    check('fees_rate_sane', sql`${t.rateBp} IS NULL OR (${t.rateBp} >= 0 AND ${t.rateBp} <= 10000)`),
    check('fees_has_value', sql`${t.rateBp} IS NOT NULL OR ${t.flatFeePaise} IS NOT NULL`),
    check(
      'fees_band_order',
      sql`${t.bandMaxPaise} IS NULL OR ${t.bandMinPaise} IS NULL OR ${t.bandMaxPaise} > ${t.bandMinPaise}`,
    ),
  ],
)

export const recurringCosts = pgTable('recurring_costs', {
  planId: bigint('plan_id', { mode: 'bigint' })
    .primaryKey()
    .references(() => pricingPlans.id, { onDelete: 'cascade' }),
  // sql`0` rather than 0n: drizzle-kit cannot serialize a BigInt literal into
  // its migration snapshot.
  setupFeePaise: bigint('setup_fee_paise', { mode: 'bigint' }).notNull().default(sql`0`),
  annualMaintenancePaise: bigint('annual_maintenance_paise', { mode: 'bigint' })
    .notNull()
    .default(sql`0`),
  monthlyFeePaise: bigint('monthly_fee_paise', { mode: 'bigint' }).notNull().default(sql`0`),
  platformFeeBp: integer('platform_fee_bp').notNull().default(0),
})

export const operationalTerms = pgTable('operational_terms', {
  planId: bigint('plan_id', { mode: 'bigint' })
    .primaryKey()
    .references(() => pricingPlans.id, { onDelete: 'cascade' }),
  settlementCycleDays: integer('settlement_cycle_days'),
  instantSettlementAvailable: boolean('instant_settlement_available').notNull().default(false),
  instantSettlementFeeBp: integer('instant_settlement_fee_bp'),
  chargebackFeePaise: bigint('chargeback_fee_paise', { mode: 'bigint' }),
  refundFeePaise: bigint('refund_fee_paise', { mode: 'bigint' }),
  mdrRefundedOnRefund: boolean('mdr_refunded_on_refund'),
  payoutFeePaise: bigint('payout_fee_paise', { mode: 'bigint' }),
  minPayoutPaise: bigint('min_payout_paise', { mode: 'bigint' }),
})

export const promos = pgTable(
  'promos',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
    gatewayId: bigint('gateway_id', { mode: 'bigint' })
      .notNull()
      .references(() => gateways.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    promoType: promoType('promo_type').notNull(),
    valueBp: integer('value_bp'),
    capAmountPaise: bigint('cap_amount_paise', { mode: 'bigint' }),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    sourceUrl: text('source_url').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    // Only unexpired promos are ever queried.
    index('promos_active_idx')
      .on(t.gatewayId, t.endsAt)
      .where(sql`${t.endsAt} IS NULL OR ${t.endsAt} > now()`),
  ],
)
