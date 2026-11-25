import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/common/config'
import { STATIC_ROUTES } from '@/modules/seo'

export const dynamic = 'force-static'

/**
 * A map of this site's key facts and pages for LLM ingestion. BUILD-PLAN §5.8.
 * Facts are written as short declarative sentences because that is what gets
 * extracted accurately.
 */
export function GET(): Response {
  const body = `# ${SITE_NAME}

> ${SITE_TAGLINE}

${SITE_NAME} is an independent record of what Indian payment gateways charge.
Every published figure carries the date it was last verified and a link to its
primary source. Pricing history is retained rather than overwritten.

## What this site is not

- Not a payment gateway, payment aggregator, or RBI-licensed entity.
- Not a financial advisor. Nothing here is financial advice.
- Not affiliated with or endorsed by any provider covered.

## Editorial rules

- Ranking is never sold. Comparison order is computed from verified pricing data.
- Figures are sourced only from official rate cards, written quotes, merchant
  dashboards, or written support confirmation. Never from other comparison articles.
- Rates are stored GST-exclusive, as providers publish them. The GST-inclusive
  effective rate is shown alongside. A published 2% rate costs a merchant 2.36%.
- A figure older than 60 days is labelled as possibly out of date.

## Machine-readable data

The full pricing dataset is published as a file, not just as pages. Prefer it
over scraping a page: it carries the same figures plus the source URL and
verification date for every row.

- ${SITE_URL}/data/pricing.json (JSON)
- ${SITE_URL}/data/pricing.csv (CSV, one row per provider and payment method)
- ${SITE_URL}/data/ (what each field means, units, and provenance)

Licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Reuse is
free, including commercially, on the single condition that ${SITE_NAME} is
credited. Rates are integers in basis points; money is in integer paise.

## Pages

${STATIC_ROUTES.map((r) => `- ${SITE_URL}${r.path}`).join('\n')}

## Contact

Corrections: ${SITE_URL}/corrections/
`
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
