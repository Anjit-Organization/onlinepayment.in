# onlinepayment.in — Technical Specification

> Engineering standards, module architecture, database design, performance and ad infrastructure.
> Companion to [BUILD-PLAN.md](./BUILD-PLAN.md). Last updated 2026-11-19.

---

## 1. Architecture principles

1. **Routes are thin.** `app/` contains routing, metadata and composition only. Zero business logic.
2. **Vertical slices, not layer cakes.** Code is grouped by feature (`modules/pricing/`), not by technical role (`services/`, `utils/`). A feature should be deletable in one `rm -rf`.
3. **Modules talk through their public barrel only.** `modules/compare/` may import `modules/pricing` (its `index.ts`), never `modules/pricing/data/fees.repository.ts`.
4. **`common/` knows nothing about features.** Dependencies point one way: `app/` → `modules/` → `common/`. Never backwards, never sideways between modules at the internal level.
5. **The domain layer is pure.** No DB, no `fetch`, no React, no env access in `*/domain/`. This is what makes the pricing math testable, and the pricing math is the product.
6. **Money is never a float.** See §4.1.
7. **Every indexable page is server-rendered.** Enforced in CI, not by convention. See §5.1.

---

## 2. Repository structure

```
onlinepayment-portal/
├── src/
│   ├── app/                          # Next.js App Router — routing + metadata only
│   │   ├── (marketing)/              # route group: home, about, methodology
│   │   ├── charges/
│   │   │   ├── page.tsx
│   │   │   └── [gateway]/page.tsx
│   │   ├── compare/[pair]/page.tsx
│   │   ├── calculator/
│   │   │   ├── page.tsx
│   │   │   └── [scenario]/page.tsx
│   │   ├── upi/mdr-tracker/page.tsx
│   │   ├── tools/
│   │   ├── guides/[slug]/page.tsx
│   │   ├── data/
│   │   ├── api/                      # route handlers (public JSON API, revalidate hooks)
│   │   ├── sitemap.xml/route.ts
│   │   ├── sitemaps/[segment]/route.ts
│   │   ├── robots.txt/route.ts
│   │   └── llms.txt/route.ts
│   │
│   ├── modules/                      # feature modules (vertical slices)
│   │   ├── gateways/
│   │   │   ├── domain/               # types, zod schemas, pure functions
│   │   │   │   ├── gateway.types.ts
│   │   │   │   └── gateway.schema.ts
│   │   │   ├── data/                 # repositories — the ONLY place SQL lives
│   │   │   │   └── gateway.repository.ts
│   │   │   ├── services/             # orchestration, caching decisions
│   │   │   │   └── gateway.service.ts
│   │   │   ├── components/           # feature UI
│   │   │   └── index.ts              # PUBLIC API — the only legal import path
│   │   │
│   │   ├── pricing/                  # fees, plans, promos, effective-dating
│   │   ├── calculator/               # true-cost engine (pure domain + UI)
│   │   ├── compare/                  # computed verdicts
│   │   ├── regulatory/               # MDR tracker, regulatory_events
│   │   ├── changelog/                # change_log reads, "what changed" blocks
│   │   ├── tools/                    # ifsc, bin, vpa, webhook-verifier
│   │   ├── content/                  # MDX loading, frontmatter validation
│   │   ├── seo/                      # metadata builders, JSON-LD, sitemap sources
│   │   ├── ads/                      # slot registry + providers (§6)
│   │   └── analytics/
│   │
│   ├── common/                       # shared, feature-agnostic
│   │   ├── db/
│   │   │   ├── client.ts             # singleton pool
│   │   │   ├── schema/               # Drizzle table definitions
│   │   │   └── migrations/
│   │   ├── money/                    # Paise, BasisPoints, GST, rounding
│   │   ├── datetime/                 # IST-aware formatting, effective-date helpers
│   │   ├── cache/                    # tag conventions, revalidation helpers
│   │   ├── config/                   # validated env (§9.1)
│   │   ├── errors/                   # typed error classes
│   │   ├── logger/
│   │   ├── result/                   # Result<T, E> — no throwing across boundaries
│   │   └── ui/                       # design primitives: Table, Callout, Badge, VerifiedAt
│   │
│   └── styles/
│
├── content/                          # MDX source
│   ├── guides/
│   └── upi/
├── data/
│   └── seed/                         # verified pricing seed JSON, reviewed via PR
├── scripts/
│   ├── verify-pricing.ts             # scrape + diff + flag for human confirm
│   ├── check-ssr.ts                  # CI crawlability assertions (§5.1)
│   ├── check-bundle.mjs              # client-bundle guard (§5.4)
│   └── refresh-views.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── seo/
└── docs/
```

### Enforcing module boundaries

`eslint.config.js` — this is what stops the architecture rotting in month three:

```js
'no-restricted-imports': ['error', {
  patterns: [
    // modules may only be imported via their barrel
    { group: ['@/modules/*/*'], message: 'Import from the module barrel: @/modules/<name>' },
    // common must never reach into features
    { group: ['@/modules/*'], message: 'common/ cannot depend on modules/' },
    // domain must stay pure
    { group: ['@/common/db*', 'next/*'], message: 'domain/ must stay pure — no DB, no framework' },
  ],
}]
```

Scoped by directory with ESLint `overrides`, plus `dependency-cruiser` in CI for the cycle check.

---

## 3. Coding conventions

| Concern | Rule |
|---|---|
| Language | TypeScript, `strict: true`, `noUncheckedIndexedAccess: true` |
| `any` | Banned (`@typescript-eslint/no-explicit-any`). Use `unknown` + a zod parse. |
| Files | `kebab-case.ts`. Suffixed by role: `.repository.ts`, `.service.ts`, `.schema.ts`, `.types.ts` |
| Components | `PascalCase.tsx`, one component per file |
| Exports | **Named exports only.** No `export default` except where Next.js requires it (pages, layouts, route handlers). |
| Functions | Verb-first: `getCurrentFees`, `computeTrueAnnualCost`, `buildGatewayMetadata` |
| Booleans | `is`/`has`/`should` prefix |
| Async | `async/await` only. No raw `.then()` chains. |
| Errors | Typed errors + `Result<T, E>` across module boundaries. Throw only in route handlers and `generateStaticParams`. |
| Validation | **Zod at every boundary** — env, DB reads, MDX frontmatter, API input, URL params |
| Comments | Explain *why*, never *what*. No commented-out code in `main`. |
| Server/client | Default to Server Components. `'use client'` is opt-in, documented with a one-line reason at the top of the file. |

### The import-order convention

```ts
// 1. node / external
import { notFound } from 'next/navigation'
// 2. common
import { paise, formatINR } from '@/common/money'
// 3. module barrels
import { getGatewayBySlug } from '@/modules/gateways'
// 4. local
import { FeeTable } from './fee-table'
```

Enforced by `eslint-plugin-import` `order` rule — zero manual effort.

---

## 4. The `common/` layer

### 4.1 Money — integer-only arithmetic

The entire site exists to compute fees correctly. Floats are disqualifying: `0.1 + 0.2 !== 0.3`, and a rounding drift of one paise on a comparison page destroys the credibility that is our only moat.

**Two primitive types, both integers:**

| Type | Unit | Example |
|---|---|---|
| `Paise` (`bigint`) | 1/100 of a rupee | `₹1,250.50` → `125050n` |
| `BasisPoints` (`number`, integer) | 1/100 of a percent | `1.95%` → `195`, `0.4%` → `40`, `18% GST` → `1800` |

Basis points eliminate decimal rates from the system entirely. Every published Indian gateway rate expresses exactly in basis points.

```ts
// common/money/types.ts
export type Paise = bigint & { readonly __brand: 'Paise' }
export type BasisPoints = number & { readonly __brand: 'BasisPoints' }

// common/money/compute.ts
export const BP_DIVISOR = 10_000n
export const GST_BP = 1800 as BasisPoints

/** Applies a rate to an amount. Rounds half-up to the nearest paise. */
export function applyRate(amount: Paise, rate: BasisPoints): Paise {
  const numerator = amount * BigInt(rate)
  return roundDiv(numerator, BP_DIVISOR)
}

/** Half-up division for bigints — Postgres and gateway invoices both round this way. */
function roundDiv(numerator: bigint, divisor: bigint): Paise {
  return ((numerator * 2n + divisor) / (divisor * 2n)) as Paise
}

export function addGst(fee: Paise): Paise {
  return (fee + applyRate(fee, GST_BP)) as Paise
}
```

**Rules:**
- A `number` representing currency never crosses a module boundary.
- GST is applied **once, at the display layer**, from a fee computed GST-exclusive. Never store GST-inclusive rates.
- `formatINR()` is the only function that produces a string, and it uses `Intl.NumberFormat('en-IN')` for correct lakh/crore grouping.
- Serialising to JSON: `bigint` is not JSON-safe. Repositories return `Paise`; API responses convert explicitly via `toPaiseString()`. Never `JSON.stringify` a raw `bigint`.

### 4.2 Dates and effective-dating

- **Everything stored in UTC, displayed in IST.** One `formatIST()` helper; no ad-hoc `toLocaleString` calls.
- A single source of truth for "what is current":
  ```ts
  export const isCurrentlyEffective = (row: { effectiveFrom: Date; effectiveTo: Date | null }, at = new Date()) =>
    row.effectiveFrom <= at && (row.effectiveTo === null || row.effectiveTo > at)
  ```
- `verified_at` staleness thresholds live in `common/config`, not scattered as magic numbers:
  `STALE_WARN_DAYS = 60`, `STALE_BLOCK_DAYS = 90`.

### 4.3 `Result<T, E>` and errors

Repositories and services return `Result`, so a missing gateway is a value, not an exception. Only route handlers and `generateStaticParams` throw (into `notFound()` or the error boundary).

```ts
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

Typed errors: `NotFoundError`, `StaleDataError`, `ValidationError`, `UpstreamError` — each with a `code` for structured logging.

---

## 5. Rendering, caching and performance

### 5.1 SSR enforcement in CI

The rule from BUILD-PLAN §5.1 is enforced mechanically by `scripts/check-ssr.ts`, which runs against a production build in CI:

```ts
const ASSERTIONS = [
  { path: '/charges/razorpay/',  mustContain: ['Last verified', '<table', 'UPI'] },
  { path: '/calculator/',        mustContain: ['<table', 'Total annual cost'] },
  { path: '/compare/razorpay-vs-cashfree/', mustContain: ['<table', 'cheaper'] },
  { path: '/upi/mdr-tracker/',   mustContain: ['As of', 'deferred'] },
]
```

Each page is fetched and its **raw HTML** asserted — no JS execution. Plus every page must emit exactly one `<h1>`, a self-referencing canonical, and valid JSON-LD. **A failure here fails the build.** This is the single highest-value test in the repo: it is the difference between a calculator that ranks and one that is invisible.

### 5.2 Rendering strategy per route

| Route | Strategy | Revalidate |
|---|---|---|
| `/`, `/charges/*`, `/compare/*`, `/best/*` | SSG + ISR | 86400s, plus on-demand |
| `/calculator/`, `/calculator/[scenario]/` | SSG (default results server-rendered) | 86400s |
| `/upi/mdr-tracker/` | ISR | 3600s, plus on-demand |
| `/guides/*`, `/methodology/`, static pages | SSG | On deploy |
| `/tools/ifsc/[ifsc]/` | SSG for pilot set, ISR fallback (`dynamicParams: true`) | 30 days |
| `/api/*` | Dynamic, edge where stateless | — |

**On-demand revalidation** is the important half. When pricing data changes, a webhook hits `/api/revalidate` which:
1. `revalidateTag()` the affected tags,
2. writes to `change_log`,
3. pings **IndexNow**.

A verified rate change should be live and submitted to Bing within seconds, and in Google's crawl queue the same day. For a site whose entire value is freshness, this pipeline *is* the product.

### 5.3 Cache tag conventions

Granular tags so one gateway's change doesn't invalidate the world:

```
gateway:<slug>              // that gateway's pages
pricing:<gateway-slug>      // fees, plans, promos
pricing:all                 // calculator + every comparison
compare:<a>-vs-<b>
regulatory:upi-mdr
changelog:global
```

A Razorpay fee change invalidates `pricing:razorpay`, `pricing:all`, every `compare:razorpay-vs-*`, and `changelog:global` — computed from the DB, not hand-maintained.

### 5.4 Performance budgets, enforced

`lighthouserc.json` in CI, failing the build on regression:

| Metric | Content pages | Calculator |
|---|---|---|
| JS transferred (gzip) | ≤ 120 KB | ≤ 200 KB |
| LCP | ≤ 2.0s | ≤ 2.5s |
| INP | ≤ 200ms | ≤ 200ms |
| CLS | ≤ 0.05 | ≤ 0.05 |
| Lighthouse SEO | 100 | 100 |

Techniques:
- **Server Components by default** — the fee tables ship as HTML with zero JS.
- The calculator is the only meaningful client bundle; its math module is shared isomorphically with the server render, so there is one implementation, not two.
- `next/dynamic` for below-fold interactive widgets.
- Self-hosted variable font, subset, `font-display: swap`, preloaded.
- `next/image` with explicit `width`/`height` on every image — never an unsized image.
- No icon library. Inline SVG for the ~20 icons used.
- `@next/bundle-analyzer` wired to `npm run analyze`; any new dependency over 15 KB needs justification in the PR description.

---

## 6. Ad infrastructure

Ads are built as a **provider-agnostic, CLS-safe, config-driven slot system**. Three reasons this abstraction is worth the extra day of work:

1. AdSense approval is not guaranteed and takes weeks — the site must ship and earn partner revenue without it.
2. You will very likely move to Ezoic / Mediavine / AdThrive once traffic qualifies. Swapping a provider should be one adapter file, not a sweep through 40 templates.
3. Ad scripts are the single biggest threat to the CWV budget in §5.4. Containing them in one module is the only way to keep that budget honest.

### 6.1 Slot architecture

```
modules/ads/
├── domain/
│   ├── slot.types.ts          # SlotId, SlotSize, SlotPlacement
│   └── policy.ts              # pure: (pageType, slotId) => boolean
├── providers/
│   ├── provider.interface.ts  # AdProvider contract
│   ├── adsense.provider.ts
│   ├── ezoic.provider.ts
│   └── noop.provider.ts       # dev + when ads are disabled
├── components/
│   ├── ad-slot.tsx            # the ONLY ad entry point in the codebase
│   └── ad-script.tsx          # single <Script>, loaded once in root layout
├── ads.config.ts              # inventory + per-page-type policy
└── index.ts
```

Templates only ever write:

```tsx
<AdSlot id="in-content-1" pageType="guide" />
```

No provider code, no `<ins>` tags, no script tags anywhere else. `AdSlot` resolves the policy, reserves the space, and renders nothing at all when the slot is disabled.

### 6.2 Zero-CLS guarantee

Every slot **reserves its exact box before the ad loads**. This is non-negotiable — ad-driven layout shift is the most common cause of a failed CLS score, and our CLS budget is 0.05.

```tsx
export function AdSlot({ id, pageType }: AdSlotProps) {
  const slot = AD_INVENTORY[id]
  if (!isSlotEnabled(pageType, id)) return null

  return (
    <div
      className="ad-slot"
      // space reserved at render time, before any script runs
      style={{ minHeight: slot.reservedHeight, containIntrinsicSize: slot.reservedSize }}
      data-slot={id}
      aria-label="Advertisement"
      role="complementary"
    >
      <AdProviderMount slot={slot} />
    </div>
  )
}
```

Rules:
- `minHeight` is always the **tallest** creative the slot can serve. Responsive slots get a per-breakpoint `minHeight` via CSS, never JS measurement.
- `content-visibility: auto` + `contain-intrinsic-size` on below-fold slots.
- Provider script: one `next/script` with `strategy="lazyOnload"`, mounted in the root layout, never per-slot.
- Below-fold slots mount their ad unit via `IntersectionObserver` at `rootMargin: 200px`.
- A slot that fails to fill **collapses to zero after paint is complete**, never during.

### 6.3 Slot inventory

| Slot ID | Desktop | Mobile | Position |
|---|---|---|---|
| `in-content-1` | 336×280 / fluid | 320×100 | After ~400 words |
| `in-content-2` | fluid responsive | 300×250 | After ~900 words |
| `sidebar-sticky` | 300×600 | *not served* | Sidebar, ≥1280px only |
| `footer` | 728×90 | 320×100 | Above footer |
| `anchor` | *not served* | 320×50 | Sticky bottom — **off by default**, see §6.5 |

**No slot renders above the fold on any page.** This protects LCP, and Google's own page-layout guidance treats ad-heavy above-fold layouts as a quality signal.

### 6.4 Placement policy — where ads earn and where they cost you

This is config, so it is your call per page type. The default below is set by what each page type is worth:

```ts
// ads.config.ts
export const AD_POLICY: Record<PageType, SlotId[]> = {
  // HIGH commercial intent — partner CTAs earn far more than a display click here.
  // A gateway signup is worth a recurring % of TPV; a display click is worth paise.
  charges:     [],
  compare:     [],
  calculator:  [],
  best:        [],

  // INFORMATIONAL — low partner intent, so display ads are the right monetisation.
  guide:       ['in-content-1', 'in-content-2', 'sidebar-sticky', 'footer'],
  upiGuide:    ['in-content-1', 'in-content-2', 'sidebar-sticky', 'footer'],
  tool:        ['in-content-1', 'footer'],
  ifscLeaf:    ['in-content-1', 'footer'],

  // TRUST pages — ads here undermine the thing they exist to establish.
  methodology: [],
  about:       [],
  disclosure:  [],
  mdrTracker:  [],
}
```

The reasoning, so you can override it knowingly: a visitor on `/charges/razorpay/` or the calculator is a merchant about to choose a gateway. If they click a partner link and activate, that is recurring revenue on their transaction volume for as long as they stay. The same click on a display ad is worth a fraction of a rupee. Putting ads on those pages trades a compounding asset for a one-off. Meanwhile a visitor reading "what is UPI AutoPay" or looking up an IFSC code will probably never sign up for anything — **that traffic is only monetisable by ads**, so those pages should carry them.

Hard constraints regardless of policy:
- An ad slot is **never adjacent to a partner CTA.** It confuses attribution, hurts conversion, and several affiliate T&Cs prohibit it.
- `/methodology/` and `/disclosure/` stay ad-free. Those pages exist to establish independence.
- Ads never sit between a heading and the data table it introduces.

### 6.5 Known trade-offs

- **Mobile anchor ads** have the highest RPM of any format and the worst effect on INP and UX. Shipped disabled; flip `anchor` on in config if you want to test it, but measure INP before and after.
- **AdSense Auto Ads are explicitly not used.** They inject units at arbitrary positions, which breaks both the CLS guarantee and the placement policy above. Manual slots only.
- Ads require a cookie-consent layer for EEA traffic. Our analytics choice (Plausible/Umami) needs none, so **consent is loaded only when an ad slot is actually enabled on the page** — most of the high-value pages stay consent-free and fast.


### 6.6 As built

Two deliberate departures from the spec above, both verified in a browser
against a production build:

**The provider script is rendered from `AdSlot`, not the root layout.** §6.2
says "mounted in the root layout, never per-slot". The root layout cannot know
the page type, so mounting it there loads ad JS on `/charges/*`, `/compare/*`
and the calculator — the zero-slot, highest-intent pages whose CWV budget this
module exists to protect, and the pages §6.5 wants consent-free. At
`lazyOnload` Next emits no script tag during SSR and dedupes by src on
injection, so the single-script guarantee holds: a page with three enabled
slots renders one `<script id="adsbygoogle-js">`.

**The reserved height sits on the inner mount box (`[data-ad-host]`), not on
`.ad-slot`.** The slot renders an "Advertisement" label, which AdSense policy
wants and which this site's independence claim wants more. A `min-height` on
the outer box would be shared between label and creative, so a 100px creative
in a 100px box pushes the box taller on fill — the shift again. The host
reserves the creative; the label adds its own height once, before anything
loads.

Sizes live in two places that nothing in the type system connects:
`AD_INVENTORY` and `src/styles/ads.css`. `tests/unit/ads.test.ts` parses the
stylesheet and fails if they drift.

**The consent layer deliberately renders no banner.** Google requires a
Google-certified CMP integrated with the IAB TCF to serve personalized ads to
the EEA, the UK and Switzerland; a dialog we write ourselves is not certified,
and traffic behind one is eligible for non-personalized or limited ads at best.
So `modules/ads/consent/` has three providers and none of them draws UI:

| `CONSENT_PROVIDER` | What loads |
|---|---|
| `google` (recommended) | Nothing. Privacy & messaging is configured in the AdSense UI and delivered through the AdSense tag. |
| `custom` | A certified third-party CMP from `CONSENT_CMP_SRC`, plus Consent Mode v2 defaults. |
| `none` (default) | Nothing — and `ADS_ENABLED=true` with this set **fails the boot**. |

`CONSENT_PROVIDER=google` is a declaration that the message exists in AdSense.
Nothing in this codebase can verify it.

Consent Mode v2 defaults grant storage globally and deny all four signals for
the 32 in-scope regions (EU 27 + IS/LI/NO + GB + CH), region-scoped so the
denial wins regardless of call order. India is deliberately not in that list;
DPDP is a separate mechanism and this is not it.

Both consent scripts are `afterInteractive` against the ad tag's `lazyOnload`.
`beforeInteractive` is earlier but, in the App Router, only works from the root
layout — which would load consent on the zero-slot pages. Measured on
`/tools/ifsc/`: consent defaults, then CMP at 10ms, then the ad tag at 1014ms,
one tag of each kind across two slots. On `/charges/razorpay/` with ads fully
enabled: no slots, no ad tag, no third-party scripts at all.

---

## 7. Database design and optimisation

### 7.1 Conventions

| Concern | Rule |
|---|---|
| Naming | `snake_case` tables and columns, plural table names |
| Primary keys | `bigint generated always as identity`, or `uuid v7` for externally-exposed rows |
| Timestamps | `timestamptz` always, never `timestamp` |
| Money | `bigint` paise. Column suffix `_paise`, no exceptions. |
| Rates | `integer` basis points. Column suffix `_bp`. |
| Enums | Native Postgres enums for stable sets (`fee_method`, `event_status`), `text` + `CHECK` for sets likely to grow |
| Soft delete | Not used. Rows are effective-dated; history is the asset. |
| Migrations | Drizzle Kit, forward-only, committed, reviewed. No destructive migration without an explicit backfill step. |
| Access | **SQL lives only in `modules/*/data/*.repository.ts`.** Nothing else imports the DB client. |

### 7.2 Indexing strategy

Indexes are derived from the actual read paths, not added speculatively.

**The hot path** is "current pricing for gateway X", a three-table join with temporal filtering. It is served by a **partial index on the open-ended row**, which is the single most effective index in this schema:

```sql
-- Gateway lookup by URL slug (every page does this first)
CREATE UNIQUE INDEX gateways_slug_uq ON gateways (slug);
CREATE INDEX gateways_status_idx ON gateways (status) WHERE status = 'active';

-- Current plan for a gateway. The partial predicate is the win: the index holds
-- only live rows, so it stays tiny no matter how much history accumulates.
CREATE INDEX pricing_plans_current_idx
  ON pricing_plans (gateway_id, is_default)
  WHERE effective_to IS NULL;

CREATE INDEX pricing_plans_temporal_idx
  ON pricing_plans (gateway_id, effective_from DESC, effective_to);

-- Fees by plan, covering the display columns so the heap is never touched
CREATE INDEX fees_plan_method_idx
  ON fees (plan_id, method)
  INCLUDE (rate_bp, flat_fee_paise, band_min_paise, band_max_paise);

-- Method-wise pages (/charges/upi/) scan across all gateways by method
CREATE INDEX fees_method_idx ON fees (method, plan_id);

-- Promos: only unexpired ones are ever queried
CREATE INDEX promos_active_idx
  ON promos (gateway_id, ends_at)
  WHERE ends_at IS NULL OR ends_at > now();

-- Changelog: always "latest N for this entity"
CREATE INDEX change_log_entity_idx
  ON change_log (entity_type, entity_id, changed_at DESC);
CREATE INDEX change_log_recent_idx ON change_log (changed_at DESC);

-- MDR tracker: filtered by category + status, ordered by date
CREATE INDEX regulatory_events_lookup_idx
  ON regulatory_events (category, status, effective_date DESC);
CREATE UNIQUE INDEX regulatory_events_slug_uq ON regulatory_events (slug);

-- Staleness sweep (§7.5) — partial index keeps the nightly check near-instant
CREATE INDEX pricing_plans_stale_idx
  ON pricing_plans (verified_at)
  WHERE effective_to IS NULL;

-- Features and integrations: small tables, composite PK is enough
CREATE UNIQUE INDEX features_uq ON features (gateway_id, feature_key);
CREATE UNIQUE INDEX integrations_uq ON integrations (gateway_id, platform);

-- IFSC: PK lookup plus the hub pages
CREATE INDEX ifsc_bank_city_idx ON ifsc_codes (bank_code, city);
CREATE INDEX ifsc_bank_idx ON ifsc_codes (bank_code);
```

**Deliberately not indexed:** `features.notes`, `fees.card_network` (too low cardinality to help), anything on tables under ~1,000 rows where a sequential scan is faster than an index read.

### 7.3 The `current_pricing` materialised view

The calculator and every comparison page need *all* current pricing for *all* gateways at once. Running the temporal join per gateway is wasteful. One flattened, pre-joined view solves it:

```sql
CREATE MATERIALIZED VIEW current_pricing AS
SELECT
  g.id AS gateway_id, g.slug, g.display_name,
  p.id AS plan_id, p.plan_name,
  f.method, f.rate_bp, f.flat_fee_paise,
  f.band_min_paise, f.band_max_paise,
  rc.setup_fee_paise, rc.annual_maintenance_paise, rc.platform_fee_bp,
  ot.settlement_cycle_days, ot.chargeback_fee_paise, ot.mdr_refunded_on_refund,
  p.verified_at, p.source_url
FROM gateways g
JOIN pricing_plans p   ON p.gateway_id = g.id AND p.effective_to IS NULL AND p.is_default
JOIN fees f            ON f.plan_id = p.id
LEFT JOIN recurring_costs rc    ON rc.plan_id = p.id
LEFT JOIN operational_terms ot  ON ot.plan_id = p.id
WHERE g.status = 'active';

CREATE UNIQUE INDEX current_pricing_uq ON current_pricing (gateway_id, method, band_min_paise);
CREATE INDEX current_pricing_method_idx ON current_pricing (method);
```

- Refreshed with `REFRESH MATERIALIZED VIEW CONCURRENTLY` (the unique index makes `CONCURRENTLY` possible — without it, reads block during refresh).
- Refresh is triggered by the same webhook that revalidates ISR, so the view and the cache never disagree.
- At our scale the whole view is a few thousand rows: **the calculator loads it in one query, once per revalidation window**, and computes every scenario in memory.

### 7.4 Query rules

- **No ORM lazy-loading, no N+1.** A page issues a bounded, known number of queries. `/charges/[gateway]/` is exactly four: gateway, current pricing, active promos, changelog.
- Every list query has an explicit `LIMIT`.
- Every `ORDER BY` is backed by an index matching its direction.
- `EXPLAIN (ANALYZE, BUFFERS)` output is pasted into the PR for any new query on a table over 10k rows.
- `pg_stat_statements` enabled; anything with a mean over 50ms gets looked at.
- Connection pooling via the serverless-safe pooler (Neon's pooled endpoint / Supabase pgBouncer) — ISR builds can open many short-lived connections.

### 7.5 Data integrity — enforced in the database

These constraints exist because a wrong number is worse than a missing one:

```sql
-- No rate is ever negative, and 100%+ is a data-entry error
ALTER TABLE fees ADD CONSTRAINT fees_rate_sane
  CHECK (rate_bp IS NULL OR (rate_bp >= 0 AND rate_bp <= 10000));

-- A fee row must carry at least one of a rate or a flat fee
ALTER TABLE fees ADD CONSTRAINT fees_has_value
  CHECK (rate_bp IS NOT NULL OR flat_fee_paise IS NOT NULL);

-- Bands must be coherent
ALTER TABLE fees ADD CONSTRAINT fees_band_order
  CHECK (band_max_paise IS NULL OR band_min_paise IS NULL OR band_max_paise > band_min_paise);

-- Effective periods cannot invert
ALTER TABLE pricing_plans ADD CONSTRAINT plans_period_order
  CHECK (effective_to IS NULL OR effective_to > effective_from);

-- Exactly one current default plan per gateway
CREATE UNIQUE INDEX plans_one_current_default
  ON pricing_plans (gateway_id)
  WHERE effective_to IS NULL AND is_default;

-- Nothing is publishable without provenance
ALTER TABLE pricing_plans ADD CONSTRAINT plans_need_provenance
  CHECK (source_url IS NOT NULL AND verified_at IS NOT NULL);
```

A **nightly job** flags plans whose `verified_at` exceeds 60 days and drops any over 90 days from the sitemap. Stale pricing is the one failure mode that destroys the moat, so it is wired to the DB rather than left to discipline.

---

## 8. Testing strategy

Weighted by what actually breaks the business, not by coverage percentage.

| Layer | Tool | Scope |
|---|---|---|
| **Money + calculator math** | Vitest | **The priority.** Pure domain functions, exhaustively. Rounding, GST, tiered bands, fixed-fee amortisation, the ₹0 and ₹100-crore edges. |
| Domain logic | Vitest | Effective-dating, verdict computation, slot policy |
| Repositories | Vitest + Testcontainers Postgres | Real SQL against a real schema. No mocked DB. |
| SEO contracts | Vitest + `scripts/check-ssr.ts` | Raw-HTML assertions, one `<h1>`, canonical, JSON-LD validity (§5.1) |
| Client bundle | `scripts/check-bundle.mjs` | Per-route gzipped budget, and no server-only module (zod, `node:fs`, drizzle, seed records) in any shipped chunk |
| Components | React Testing Library | Fee tables, AdSlot reservation, VerifiedAt rendering |
| E2E | Playwright | Calculator flow, scenario URL round-trip, mobile layout |
| Visual | Playwright screenshots | The four key templates, light + dark |

**Golden-file tests for the calculator.** `tests/fixtures/scenarios/*.json` holds input/expected-output pairs reviewed by a human once. Any change to the fee engine that moves a published number fails the test and must be acknowledged in the PR. This is what stops a refactor silently changing every price on the site.

```ts
// Representative test — the fixed-fee insight from BUILD-PLAN T1 must hold
it('ranks a 2% no-annual-fee gateway above 1.95% + ₹4,999/yr at low volume', () => {
  const monthly = paise(50_000_00n)              // ₹50,000/month
  const a = computeTrueAnnualCost(GATEWAY_A, monthly, UPI_HEAVY_MIX)
  const b = computeTrueAnnualCost(GATEWAY_B, monthly, UPI_HEAVY_MIX)
  expect(a.totalPaise).toBeLessThan(b.totalPaise)
})
```

Coverage targets: **100% on `common/money` and `modules/calculator/domain`**, 80% on other domain code, untargeted elsewhere.

---

## 9. Configuration, observability and security

### 9.1 Validated environment

Env is parsed once, at startup, through zod. A missing variable fails the boot, never a request.

```ts
// common/config/env.ts
const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  REVALIDATE_SECRET: z.string().min(32),
  INDEXNOW_KEY: z.string().min(8),
  ADS_ENABLED: z.enum(['true', 'false']).default('false'),
  ADS_PROVIDER: z.enum(['adsense', 'ezoic', 'noop']).default('noop'),
  ADSENSE_CLIENT_ID: z.string().optional(),
  PLAUSIBLE_HOST: z.string().url().optional(),
}).refine(v => v.ADS_PROVIDER !== 'adsense' || !!v.ADSENSE_CLIENT_ID, {
  message: 'ADSENSE_CLIENT_ID is required when ADS_PROVIDER=adsense',
})

export const env = schema.parse(process.env)
```

No `process.env` access anywhere except this file. Enforced by the ESLint rule in §2.

### 9.2 Logging and monitoring

- Structured JSON logs (pino), with a `requestId` on every line.
- `error`: unexpected failures only. `warn`: stale data, unfilled ad slots, upstream timeouts. `info`: data changes and revalidations — the audit trail for pricing edits.
- **Never log** a full `source_url` query string or anything from a scraped page verbatim.
- Sentry for exceptions, with releases tied to git SHA.
- A `/api/health` endpoint checking DB reachability and the age of the newest `verified_at`.
- **Content-health alerts** (the ones that actually matter): any live plan over 60 days unverified, any promo past `ends_at` still displayed, any indexable page missing JSON-LD.

### 9.3 Security

- **Scraped pages and uploaded evidence are untrusted input.** The `verify-pricing` script writes to a staging table and never to `fees` directly; a human promotes a diff. No scraped string is ever rendered as HTML.
- Zod-validate every route handler input, including URL params from `generateStaticParams` fallbacks.
- Parameterised queries only. Drizzle's query builder throughout — no string-interpolated SQL, ever.
- `/api/revalidate` authenticated by `REVALIDATE_SECRET` in a header, compared with `timingSafeEqual`, and rate-limited.
- Security headers via `next.config.ts`: HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP. **Note:** ad scripts require CSP relaxation — keep the ad-specific `script-src` entries in one documented block so the cost of enabling ads on a page type is visible.
- Dependabot plus `npm audit` in CI. A new dependency needs a one-line justification in the PR.
- No PII collected beyond the email address on the MDR-tracker subscribe form. That form is the only write path from the public internet; it is rate-limited and double-opt-in.

### 9.4 CI/CD pipeline

```
on: pull_request
  1. typecheck            (tsc --noEmit)
  2. lint                 (eslint, incl. module-boundary rules)
  3. deps                 (dependency-cruiser — no cycles, no boundary violations)
  4. unit + integration   (vitest, Testcontainers Postgres)
  5. build                (next build)
  6. check-ssr            (raw-HTML assertions — §5.1)      ← blocking
  7. check-bundle         (client-bundle guard — §5.4)      ← blocking
  8. lighthouse-ci        (budgets from §5.4)               ← blocking
  9. e2e                  (playwright)

on: push to main
  10. migrate             (drizzle-kit, forward-only)
  11. deploy              (Vercel)
  12. refresh-views       (REFRESH MATERIALIZED VIEW CONCURRENTLY)
  13. ping IndexNow       (changed URLs from change_log since last deploy)
```

Steps 6 and 7 being blocking is the whole point: it is structurally impossible to ship a page that Google cannot read, or one that breaks the performance budget.

---

## 10. Definition of done

A PR adding or changing an indexable page is not done until:

- [ ] Renders completely with JavaScript disabled
- [ ] Exactly one `<h1>`; heading hierarchy unbroken
- [ ] Self-referencing canonical present
- [ ] JSON-LD present and passing the Rich Results Test
- [ ] Title and meta description generated from data, no hardcoded year
- [ ] `Last verified` date visible, sourced from `verified_at`
- [ ] Every pricing figure links to its primary source
- [ ] Pricing in a real `<table>`
- [ ] Registered in the correct sitemap segment with a true `lastmod`
- [ ] Internal links in and out — no orphan
- [ ] Carries ≥1 unique data point vs its parent hub (BUILD-PLAN §5.3)
- [ ] Ad policy entry set for its page type (even if that entry is `[]`)
- [ ] Added to `check-ssr.ts` assertions if it is a new template
- [ ] Within the §5.4 performance budget
