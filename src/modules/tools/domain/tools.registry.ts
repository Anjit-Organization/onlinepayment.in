/**
 * The tool registry. One row per tool page, so the hub, the sitemap and the
 * nav are all generated from the same place and a tool cannot ship orphaned.
 *
 * WHY EVERY TOOL PAGE ALSO CARRIES A REFERENCE TABLE
 * A tool page whose only content is a form has nothing for a crawler to read
 * and nothing for someone who arrived wanting an answer rather than a
 * calculator. Each page here server-renders the underlying reference — the
 * documented formulas, the IIN ranges, the working-day rules, the bank codes —
 * and the interactive part sits on top of it. The form is the magnet; the
 * table is the page.
 */

export const TOOL_SLUGS = [
  'webhook-signature-verifier',
  'bin-lookup',
  'settlement-calculator',
  'ifsc',
] as const

export type ToolSlug = (typeof TOOL_SLUGS)[number]

export type Tool = {
  slug: ToolSlug
  /** Nav and hub label. Short. */
  label: string
  h1: string
  /** <title>. Under 60 characters. */
  title: string
  /** Meta description. Under 155 characters. */
  description: string
  /** The hub card's one-liner — what it does, in the user's words. */
  blurb: string
  /** The problem it solves, for the hub. Concrete, not a feature list. */
  solves: string
  /** True when the whole computation happens in the browser. */
  runsLocally: boolean
  lastModified: string
}

const PHASE_3 = '2026-11-20'

export const TOOLS: readonly Tool[] = [
  {
    slug: 'webhook-signature-verifier',
    label: 'Signature verifier',
    h1: 'Payment webhook signature verifier',
    title: 'Webhook signature verifier for Indian gateways',
    description:
      'Check why a Razorpay, Cashfree, PayU or PhonePe signature will not match. Hashing runs in your browser; the secret never leaves the page.',
    blurb: 'Work out why your signature check is failing, for four Indian gateways.',
    solves:
      'The hash does not match and the docs are not telling you why. Shows you the exact string being signed, which is where the bug nearly always is.',
    runsLocally: true,
    lastModified: PHASE_3,
  },
  {
    slug: 'bin-lookup',
    label: 'Card BIN checker',
    h1: 'Card BIN and IIN checker',
    title: 'Card BIN checker: network, RuPay and MDR',
    description:
      'Identify a card network from its BIN, run the Luhn check, and see which MDR applies. 1,138 Indian bank IINs, and honest about what a BIN cannot tell you.',
    blurb: 'Identify the network and card type behind a BIN, and what it costs you.',
    solves:
      'Which MDR applies to this card — the 0% RuPay debit rate, domestic credit, or the international rate that is half again as expensive.',
    runsLocally: true,
    lastModified: PHASE_3,
  },
  {
    slug: 'settlement-calculator',
    label: 'Settlement date',
    h1: 'Payment settlement date calculator',
    title: 'Settlement date calculator for Indian gateways',
    description:
      'T+2 is two bank working days, not two days. Work out the real settlement date for any capture date, including second and fourth Saturdays.',
    blurb: 'Find the date money actually reaches your account, not the T+n promise.',
    solves:
      'A Friday capture on T+2 does not land on Sunday. Counts bank working days properly, and shows you every day it skipped and why.',
    runsLocally: true,
    lastModified: PHASE_3,
  },
  {
    slug: 'ifsc',
    label: 'IFSC checker',
    h1: 'IFSC code checker',
    title: 'IFSC code checker and bank code list',
    description:
      'Validate an IFSC code’s structure and identify the bank from 242 IFSC bank codes. An IFSC has no check digit, so a typo looks perfectly valid.',
    blurb: 'Validate an IFSC and name the bank behind the code.',
    solves:
      'An IFSC has no check digit, so a mistyped branch code is still a well-formed IFSC. Tells you what can and cannot be checked offline.',
    runsLocally: true,
    lastModified: PHASE_3,
  },
]

export const getTool = (slug: string): Tool | undefined =>
  TOOLS.find((t) => t.slug === slug)

export const toolPath = (slug: ToolSlug): string => `/tools/${slug}/`
