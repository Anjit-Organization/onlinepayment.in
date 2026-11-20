import { rupees, type Paise } from '@/common/money'
import { type MethodMix } from './calculator'

/**
 * Static scenario pages are the crawlable surface a pure-JS calculator never
 * gets. UI.md §8.4 / BUILD-PLAN §5.1.
 */
export type Scenario = {
  slug: string
  title: string
  /** Short, already correctly cased. Lower-casing `title` turned UPI into "upi". */
  shortTitle: string
  description: string
  monthlyVolumePaise: Paise
  avgTransactionPaise: Paise
  mix: MethodMix
}

const UPI_HEAVY: MethodMix = { upi: 80, credit_card_domestic: 8, debit_card: 7, netbanking: 3, wallet: 2 }
const BALANCED: MethodMix = { upi: 65, credit_card_domestic: 15, debit_card: 10, netbanking: 7, wallet: 3 }
const CARD_HEAVY: MethodMix = { upi: 30, credit_card_domestic: 40, debit_card: 15, netbanking: 10, wallet: 5 }

export const SCENARIOS: Scenario[] = [
  {
    slug: '50-thousand-monthly-upi-heavy',
    title: '₹50,000 a month, mostly UPI',
    shortTitle: '₹50,000/month on UPI',
    description:
      "A small seller or freelancer at about ₹50,000 a month, nearly all of it UPI. Annual fees decide this one.",
    monthlyVolumePaise: rupees(50_000),
    avgTransactionPaise: rupees(800),
    mix: UPI_HEAVY,
  },
  {
    slug: '2-lakh-monthly-balanced',
    title: '₹2 lakh a month, balanced mix',
    shortTitle: '₹2 lakh/month',
    description:
      "A growing D2C store at around ₹2 lakh a month, spread across UPI, cards and net banking.",
    monthlyVolumePaise: rupees(200_000),
    avgTransactionPaise: rupees(1_500),
    mix: BALANCED,
  },
  {
    slug: '5-lakh-monthly-upi-heavy',
    title: '₹5 lakh a month, mostly UPI',
    shortTitle: '₹5 lakh/month on UPI',
    description:
      "An established small business at about ₹5 lakh a month whose customers mostly pay by UPI.",
    monthlyVolumePaise: rupees(500_000),
    avgTransactionPaise: rupees(1_200),
    mix: UPI_HEAVY,
  },
  {
    slug: '5-lakh-monthly-card-heavy',
    title: '₹5 lakh a month, mostly cards',
    shortTitle: '₹5 lakh/month on cards',
    description:
      "Same ₹5 lakh a month, but weighted to credit cards. Higher tickets, and card MDR does most of the damage.",
    monthlyVolumePaise: rupees(500_000),
    avgTransactionPaise: rupees(4_000),
    mix: CARD_HEAVY,
  },
  {
    slug: '20-lakh-monthly-balanced',
    title: '₹20 lakh a month, balanced mix',
    shortTitle: '₹20 lakh/month',
    description:
      "A mid-sized business at ₹20 lakh a month, where the headline rate finally outweighs any annual fee.",
    monthlyVolumePaise: rupees(2_000_000),
    avgTransactionPaise: rupees(2_500),
    mix: BALANCED,
  },
  {
    slug: '50-lakh-monthly-balanced',
    title: '₹50 lakh a month, balanced mix',
    shortTitle: '₹50 lakh/month',
    description:
      "₹50 lakh a month, where 0.05% on the rate is worth more than every fixed fee put together.",
    monthlyVolumePaise: rupees(5_000_000),
    avgTransactionPaise: rupees(3_000),
    mix: BALANCED,
  },
]

export const getScenario = (slug: string): Scenario | undefined =>
  SCENARIOS.find((s) => s.slug === slug)
