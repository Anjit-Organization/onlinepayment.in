import { pgEnum } from 'drizzle-orm/pg-core'

export const gatewayStatus = pgEnum('gateway_status', ['active', 'deprecated', 'acquired'])

export const feeMethod = pgEnum('fee_method', [
  'upi',
  'upi_autopay',
  'credit_card_domestic',
  'credit_card_intl',
  'amex',
  'debit_card',
  'rupay_debit',
  'netbanking',
  'wallet',
  'emi',
  'international_card',
  'bnpl',
])

export const cardNetwork = pgEnum('card_network', [
  'visa',
  'mastercard',
  'rupay',
  'amex',
  'diners',
])

export const promoType = pgEnum('promo_type', ['zero_fee', 'reduced_rate', 'volume_cap'])

export const regulatoryCategory = pgEnum('regulatory_category', [
  'upi_mdr',
  'limits',
  'tokenization',
  'kyc',
  'pa_license',
  'other',
])

export const regulatoryStatus = pgEnum('regulatory_status', [
  'proposed',
  'scheduled',
  'deferred',
  'in_effect',
  'withdrawn',
  'superseded',
])

export const authority = pgEnum('authority', ['RBI', 'NPCI', 'MeitY', 'GoI'])

export const verificationMethod = pgEnum('verification_method', [
  'official_rate_card',
  'written_quote',
  'merchant_dashboard',
  'support_email',
])

export const integrationPlatform = pgEnum('integration_platform', [
  'shopify',
  'woocommerce',
  'wix',
  'magento',
  'react',
  'node',
  'php',
  'python',
  'java',
  'flutter',
  'react_native',
])
