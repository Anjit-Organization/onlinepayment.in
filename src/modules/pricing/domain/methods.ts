import type { FeeMethod } from './pricing.constants'

/**
 * Method pages target the query shape "UPI payment gateway charges", which is
 * distinct from both the provider pages and the comparisons.
 *
 * Each carries at least one unique data point versus its parent hub: a ranking
 * of every provider on that one method, which appears nowhere else.
 * BUILD-PLAN §5.3.
 */
export type MethodPage = {
  slug: string
  method: FeeMethod
  h1: string
  title: string
  description: string
  /** Method-specific context. Not template-able across methods. */
  intro: string
  note?: string
}

export const METHOD_PAGES: MethodPage[] = [
  {
    slug: 'upi',
    method: 'upi',
    h1: 'UPI payment gateway charges',
    title: 'UPI payment gateway charges in India',
    description:
      'What each Indian payment gateway charges on UPI, ranked cheapest first, with the GST-inclusive rate you actually pay.',
    intro:
      'UPI itself carries no MDR for most merchants. That is not the same as being free: several gateways levy their own platform fee on UPI transactions regardless, and Razorpay says so explicitly on its pricing page. So the figure that matters is what your provider charges, not what NPCI mandates.',
    note: 'A 0.4% MDR on merchant payments above ₹2,000 has been proposed and deferred. Nothing has taken effect.',
  },
  {
    slug: 'credit-card',
    method: 'credit_card_domestic',
    h1: 'Credit card processing charges',
    title: 'Credit card processing charges in India',
    description:
      'Domestic credit card rates across Indian payment gateways, ranked, with GST included and annual fees noted.',
    intro:
      'Domestic credit cards are the most expensive common method and the one where providers differ least, clustering around 2%. Corporate and commercial cards usually cost more: Razorpay prices them at 2.15%, Instamojo at 3% plus ₹3. If a meaningful share of your customers pay on company cards, ask what rate applies to those specifically.',
  },
  {
    slug: 'debit-card',
    method: 'debit_card',
    h1: 'Debit card processing charges',
    title: 'Debit card processing charges in India',
    description:
      'What Indian payment gateways charge on debit cards, including RuPay, with the effective GST-inclusive rate.',
    intro:
      'Most gateways quote one rate across debit and credit rather than splitting them, which is worth knowing because debit interchange is lower. RuPay debit carries zero MDR by mandate, though as with UPI a platform fee may still apply on top.',
  },
  {
    slug: 'netbanking',
    method: 'netbanking',
    h1: 'Net banking charges',
    title: 'Net banking charges for Indian payment gateways',
    description:
      'Net banking rates across Indian payment gateways, ranked cheapest first, GST included.',
    intro:
      'Net banking is usually priced at the same rate as cards, and some providers charge a flat per-transaction fee instead of a percentage. It still matters for higher-ticket B2B payments, where customers often prefer it to a card limit.',
  },
  {
    slug: 'international',
    method: 'international_card',
    h1: 'International payment charges',
    title: 'International payment charges for Indian merchants',
    description:
      'What Indian payment gateways charge to accept foreign cards, typically around 3% against 2% domestic.',
    intro:
      'Accepting a card issued outside India costs roughly half as much again as a domestic one, and providers do not line up the same way as they do at home. Cashfree is 2.99% abroad against 1.95% domestically; CCAvenue jumps to 4.99%. A provider that is cheapest for Indian customers can be among the dearest for foreign ones.',
    note: 'Cross-border collections also carry FEMA documentation requirements that domestic payments do not.',
  },
]

export const getMethodPage = (slug: string): MethodPage | undefined =>
  METHOD_PAGES.find((m) => m.slug === slug)
