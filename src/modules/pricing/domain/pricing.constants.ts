/**
 * Pricing vocabulary: the closed sets of method, source and verification
 * values, and their display labels. Zero dependencies, on purpose.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM pricing.schema.ts:
 * the schema imports zod, and zod's schema objects are constructed at module
 * scope, so a bundler cannot tree-shake them away. Any client component that
 * reached for `METHOD_LABEL` therefore pulled the whole validator into the
 * browser — 30 KB gzipped to render the word "UPI". The schema now builds its
 * enums from these arrays, so there is still exactly one source of truth for
 * every allowed value; it just lives on the side of the boundary that both
 * halves can afford.
 *
 * Keep this file free of imports. That constraint is the whole point.
 */

export const FEE_METHODS = [
  'upi',
  'credit_card_domestic',
  'credit_card_intl',
  'amex',
  'debit_card',
  'rupay_debit',
  'netbanking',
  'wallet',
  'emi',
  'international_card',
] as const

export type FeeMethod = (typeof FEE_METHODS)[number]

export const METHOD_LABEL: Record<FeeMethod, string> = {
  upi: 'UPI',
  credit_card_domestic: 'Credit card (domestic)',
  credit_card_intl: 'Credit card (international)',
  amex: 'American Express / Diners',
  debit_card: 'Debit card',
  rupay_debit: 'RuPay debit',
  netbanking: 'Net banking',
  wallet: 'Wallets',
  emi: 'EMI',
  international_card: 'International cards',
}

/**
 * Verification state. TECHNICAL §9.3: scraped or drafted data never publishes
 * directly — a human promotes it. A `draft` record renders (so it can be
 * reviewed in situ) but is noindex and excluded from the sitemap.
 */
export const VERIFICATION_STATES = ['draft', 'verified'] as const
export type VerificationState = (typeof VERIFICATION_STATES)[number]

export const SOURCE_KINDS = [
  'official_rate_card',
  'written_quote',
  'merchant_dashboard',
  'support_email',
  /**
   * Used where a provider publishes no rate card, or publishes one too
   * ambiguous to read. The figure still carries a named, linked source — it is
   * simply not the provider's own document, and the page says so.
   */
  'secondary_source',
] as const

export type SourceKind = (typeof SOURCE_KINDS)[number]

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  official_rate_card: 'Official rate card',
  written_quote: 'Written quote',
  merchant_dashboard: 'Merchant dashboard',
  support_email: 'Written confirmation from support',
  secondary_source: 'Third-party source',
}
