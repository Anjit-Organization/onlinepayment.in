import { rupees, type Paise } from '@/common/money'
import type { MethodMix } from './calculator'

/**
 * Use-case pages are programmatic, so each one must carry at least one unique
 * data point versus its parent hub — here, a distinct cost ranking produced by a
 * distinct volume and payment mix. BUILD-PLAN §5.3.
 */
export type UseCase = {
  slug: string
  title: string
  h1: string
  description: string
  /** Why this profile differs — the part that is not template-able. */
  rationale: string
  monthlyVolumePaise: Paise
  avgTransactionPaise: Paise
  mix: MethodMix
}

export const USE_CASES: UseCase[] = [
  {
    slug: 'small-business',
    title: 'Best payment gateway for small business in India',
    h1: 'Best payment gateway for a small business',
    description:
      "What a small business doing about ₹1 lakh a month really pays, once you stop comparing headline rates and count the annual fees and GST.",
    rationale:
      "Annual fees decide this one. Spread a ₹4,999 charge over ₹1 lakh a month and it works out at 0.42%, which is wider than the gap between most providers' advertised rates. So the cheapest percentage is often not the cheapest gateway, and any list that ranks on rate alone has it backwards.",
    monthlyVolumePaise: rupees(100_000),
    avgTransactionPaise: rupees(1_200),
    mix: { upi: 70, credit_card_domestic: 12, debit_card: 10, netbanking: 5, wallet: 3 },
  },
  {
    slug: 'freelancers',
    title: 'Best payment gateway for freelancers in India',
    h1: 'Best payment gateway for freelancers',
    description:
      "Few invoices, large ones, maybe a dozen a month. What that actually costs you across the Indian gateways.",
    rationale:
      "Per-transaction fees of ₹3 or so barely register when you're only raising a handful of invoices. An annual charge, though, gets spread across very little volume and hurts. Anyone with zero fixed costs wins this comfortably.",
    monthlyVolumePaise: rupees(50_000),
    avgTransactionPaise: rupees(15_000),
    mix: { upi: 55, netbanking: 20, credit_card_domestic: 20, debit_card: 5 },
  },
  {
    slug: 'd2c-ecommerce',
    title: 'Best payment gateway for D2C and ecommerce in India',
    h1: 'Best payment gateway for a D2C store',
    description:
      "A D2C store at ₹5 lakh a month where customers reach for cards more than the Indian average. Full annual cost, GST included.",
    rationale:
      "Cards are 30% of this mix rather than the usual 15%, so domestic card MDR is most of the bill. Providers who make their name on cheap UPI lose that edge here, because the UPI share is doing less work.",
    monthlyVolumePaise: rupees(500_000),
    avgTransactionPaise: rupees(2_200),
    mix: { upi: 45, credit_card_domestic: 30, debit_card: 15, netbanking: 6, wallet: 4 },
  },
  {
    slug: 'saas',
    title: 'Best payment gateway for SaaS in India',
    h1: 'Best payment gateway for a SaaS business',
    description:
      "Recurring billing, mostly cards, bigger tickets. What SaaS at ₹10 lakh a month pays.",
    rationale:
      "Subscriptions run on saved cards and UPI AutoPay, not one-off QR scans, so the card rate is what matters. At ₹10 lakh a month a 0.05% difference in rate is worth more than every annual fee on this site put together.",
    monthlyVolumePaise: rupees(1_000_000),
    avgTransactionPaise: rupees(3_500),
    mix: { upi: 35, credit_card_domestic: 45, debit_card: 12, netbanking: 8 },
  },
  {
    slug: 'high-volume',
    title: 'Cheapest payment gateway for high volume in India',
    h1: 'Cheapest payment gateway at high volume',
    description:
      "At ₹50 lakh a month the rate is the only thing left that matters. Here's who's cheapest.",
    rationale:
      "Fixed fees stop mattering here. ₹4,999 a year against ₹6 crore of volume is 0.008%, which is noise. The ranking collapses to blended rate. Honestly, this is also the point where you should stop reading comparison sites and start negotiating, because at this volume everyone will move.",
    monthlyVolumePaise: rupees(5_000_000),
    avgTransactionPaise: rupees(2_500),
    mix: { upi: 60, credit_card_domestic: 20, debit_card: 12, netbanking: 5, wallet: 3 },
  },
  {
    slug: 'international-payments',
    title: 'Best payment gateway for international payments from India',
    h1: 'Best payment gateway for international payments',
    description:
      "Foreign cards cost roughly half as much again as domestic ones. Here's what that works out to.",
    rationale:
      "International sits near 3% where domestic sits near 2%, and the providers don't line up the same way. Cashfree charges 2.99% abroad against 1.95% at home; CCAvenue jumps to 4.99%. A provider's domestic rate tells you very little about what it does with a foreign card.",
    monthlyVolumePaise: rupees(1_000_000),
    avgTransactionPaise: rupees(6_000),
    mix: { international_card: 55, credit_card_intl: 25, upi: 12, credit_card_domestic: 8 },
  },
]

export const getUseCase = (slug: string): UseCase | undefined =>
  USE_CASES.find((u) => u.slug === slug)
