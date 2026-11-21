/**
 * Client-safe public surface of the pricing module.
 *
 * The main barrel re-exports the repository, which reads seed files with
 * node:fs. Importing anything from it inside a 'use client' component drags fs
 * into the browser bundle and the build panics. Everything here is pure data
 * and types, safe on either side of the boundary.
 *
 * TWO IMPORT LINES, DELIBERATELY. Values come from pricing.constants, which
 * imports nothing. Types come from pricing.schema with `export type`, which the
 * compiler erases entirely — no `import 'zod'` survives in the output. Reaching
 * for a VALUE from the schema here would put zod back in the browser and cost
 * ~30 KB gzipped on the calculator, which is how that regression happened the
 * first time.
 *
 * Server code should keep using '@/modules/pricing'.
 */
export {
  FEE_METHODS,
  METHOD_LABEL,
  SOURCE_KIND_LABEL,
  type FeeMethod,
  type SourceKind,
  type VerificationState,
} from './domain/pricing.constants'

export type {
  Fee,
  GatewaySeed,
  Promo,
  PricingChange,
  SecondarySource,
} from './domain/pricing.schema'
