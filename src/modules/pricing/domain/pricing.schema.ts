import { z } from 'zod'
import { FEE_METHODS, SOURCE_KINDS, VERIFICATION_STATES } from './pricing.constants'

/**
 * The seed file is the authoring format and the source of truth for pricing.
 *
 * WHY FILES RATHER THAN THE DATABASE (deviation from TECHNICAL §7, recorded):
 * for ~10 gateways, a Postgres round-trip at build time buys nothing over a
 * zod-validated JSON file, and git already gives us immutable history plus PR
 * review — which IS the verification workflow we want. The Drizzle schema stays
 * for Phase 3, when the public API and changelog queries need real indexes.
 *
 * Every record is validated at build time. An invalid seed fails the build.
 *
 * The allowed VALUES live in ./pricing.constants, which imports nothing, so the
 * browser can read a label without downloading a validator. The enums below are
 * built from those arrays: adding a method there is still the only way to make
 * one valid here.
 */

export const verificationState = z.enum(VERIFICATION_STATES)

export const sourceKind = z.enum(SOURCE_KINDS)

/** A named, linked source and what it is being relied on for. */
const secondarySource = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  covers: z.string().min(1),
})

const feeSchema = z
  .object({
    method: z.enum(FEE_METHODS),
    /** Basis points. 1.95% -> 195. Integer only, never a float. */
    rateBp: z.number().int().min(0).max(10_000).nullable().default(null),
    flatFeePaise: z.number().int().min(0).nullable().default(null),
    minFeePaise: z.number().int().min(0).nullable().default(null),
    maxFeePaise: z.number().int().min(0).nullable().default(null),
    /** Tiered pricing. UPI MDR above Rs 2,000 is exactly this shape. */
    bandMinPaise: z.number().int().min(0).nullable().default(null),
    bandMaxPaise: z.number().int().min(0).nullable().default(null),
    note: z.string().optional(),
  })
  .refine((f) => f.rateBp !== null || f.flatFeePaise !== null, {
    message: 'a fee must carry at least one of rateBp or flatFeePaise',
  })
  .refine((f) => f.bandMaxPaise === null || f.bandMinPaise === null || f.bandMaxPaise > f.bandMinPaise, {
    message: 'bandMaxPaise must exceed bandMinPaise',
  })

const promoSchema = z.object({
  description: z.string().min(1),
  endsAt: z.string().date().nullable(),
  sourceUrl: z.string().url(),
})

const changeSchema = z.object({
  changedAt: z.string().date(),
  field: z.string().min(1),
  oldValue: z.string(),
  newValue: z.string(),
  sourceUrl: z.string().url().optional(),
})

export const gatewaySeedSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  legalName: z.string().min(1),
  website: z.string().url(),
  hqCity: z.string().optional(),
  parentCompany: z.string().optional(),

  /** Nothing publishes without provenance. */
  state: verificationState,
  verifiedAt: z.string().date(),
  verifiedBy: z.string().min(1),
  sourceKind,
  sourceUrl: z.string().url(),
  /** Why this record is still a draft. Required when state is draft. */
  draftReason: z.string().optional(),

  /**
   * Figures the provider does not publish, each attributed. Rendered on the
   * page so a reader can see exactly which numbers are not from the provider.
   */
  secondarySources: z.array(secondarySource).default([]),

  planName: z.string().default('Standard'),
  fees: z.array(feeSchema).min(1),

  setupFeePaise: z.number().int().min(0).default(0),
  annualMaintenancePaise: z.number().int().min(0).default(0),
  monthlyFeePaise: z.number().int().min(0).default(0),

  settlementCycleDays: z.number().int().min(0).nullable().default(null),
  chargebackFeePaise: z.number().int().min(0).nullable().default(null),
  mdrRefundedOnRefund: z.boolean().nullable().default(null),

  notCharged: z.array(z.string()).default([]),
  promos: z.array(promoSchema).default([]),
  changes: z.array(changeSchema).default([]),
}).refine((g) => g.state !== 'draft' || !!g.draftReason, {
  message: 'a draft record must say why it is still a draft',
  path: ['draftReason'],
})

export type GatewaySeed = z.infer<typeof gatewaySeedSchema>
export type SecondarySource = z.infer<typeof secondarySource>
export type Fee = z.infer<typeof feeSchema>
export type Promo = z.infer<typeof promoSchema>
export type PricingChange = z.infer<typeof changeSchema>
