# onlinepayment.in

An independent record of what Indian payment gateways charge. Every published
figure carries the date it was last verified and a link to its primary source.

**Status: 3 of 8 providers verified and published.** Razorpay, PayU and Paytm
were checked line by line against their own rate cards and are indexable. The
other five remain `draft` — `noindex`, out of the sitemap, and excluded from
every hub — because their published pricing is ambiguous, incomplete, or does
not exist publicly.

## Docs

| | |
|---|---|
| [docs/BUILD-PLAN.md](docs/BUILD-PLAN.md) | Positioning, information architecture, data model, crawlability spec, phases |
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | Module architecture, money handling, DB indexing, ads, CI gates |
| [docs/UI.md](docs/UI.md) | Design tokens, responsive system, component library, page section plans |

## Getting started

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

`DATABASE_URL` is **not** required in Phase 0 — there are no data-backed pages
yet, and `getDb()` throws a clear error if anything reaches for it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the module-boundary rules |
| `npm test` | Vitest — the fee engine is the priority suite |
| `npm run check:ssr` | **Crawlability assertions against raw HTML.** Needs a running server. |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations |

### Verifying crawlability locally

```bash
npm run build && npm start & sleep 5 && npm run check:ssr -- http://localhost:3000
```

This asserts against the **raw HTML with no JavaScript executed**: content
present, exactly one `<h1>`, a canonical link, valid JSON-LD, a viewport meta,
and that zoom is not blocked. It is blocking in CI — it is the difference
between a page that ranks and one that is invisible.

## Architecture rules

Dependencies point one way: `app/` → `modules/` → `common/`. Never backwards,
never sideways between module internals. This is enforced by ESLint, not by
convention — see `eslint.config.mjs`.

- **Money is never a float.** `Paise` is a branded `bigint`; rates are integer
  basis points (1.95% → `195`). See `src/common/money/`.
- **`process.env` is read in exactly one file**, `src/common/config/`.
- **Pricing is immutable.** Never `UPDATE` a rate — close the old row with
  `effective_to` and insert a new one. The changelog is the asset.
- **Nothing publishes without provenance.** `source_url` and `verified_at` are
  `NOT NULL` on every pricing plan.

## Deviations from the specs

Recorded here rather than silently absorbed:

1. **Next.js 16**, not 15 as written in TECHNICAL.md — 16 is the current major.
   `revalidateTag` now requires a cacheLife profile.
2. **No covering index on `fees`.** Drizzle 0.45's index builder has no
   `.include()`. The hot read path is served by the `current_pricing`
   materialised view anyway, so the covering index was premature.
3. **Single sitemap, not segmented.** Segmentation is pointless with five static
   URLs; it lands in Phase 1 via `generateSitemaps()`.
4. **Mobile nav is a `<details>` disclosure**, not a JS drawer — no JavaScript,
   keyboard accessible for free, and the links stay in the crawled HTML.
5. **Pricing is authored in JSON seed files, not Postgres.** For ~10 gateways a
   DB round-trip at build time buys nothing over a zod-validated file, and git
   already gives immutable history plus PR review — which *is* the verification
   workflow. The Drizzle schema stays for Phase 3, when the public API and
   changelog queries need real indexes.
6. **Subscriber storage uses a direct PostgREST `fetch`, not
   `@supabase/supabase-js`.** We need exactly one INSERT; the SDK is ~30KB for
   that, and TECHNICAL §5.4 requires justification for any dependency over 15KB.
7. **The calculator is not yet interactive.** It server-renders a default result
   set plus 6 static scenario pages, which is the crawlable surface a pure-JS
   calculator never gets. Live inputs are Phase 2.

## The verification gate

Pricing lives in `data/seed/gateways/*.json`, validated by zod at build time —
an invalid seed fails the build. Each record carries a `state`:

| `state` | Page renders | `noindex` | In sitemap | Says |
|---|---|---|---|---|
| `draft` | yes | **yes** | **no** | "Drafted … not verified by a person" |
| `verified` | yes | no | yes | "Verified <date>" |

All records are currently `verified`. The draft machinery stays for adding new
providers — a record lands as `draft`, renders for review, and cannot be
indexed or reach the sitemap until promoted.

Hubs render **verified providers only** and publish once at least two exist, so
an unverified rate can never reach an indexed page. (They used to require *every*
provider verified — a gate that could never open, since CCAvenue publishes no
public rate card at all.) Unverified providers are listed in a separate
"Not yet verified" section with their own `noindex` pages.

### Partial pricing is excluded from rankings

PayU publishes no UPI rate at all. On a UPI-heavy mix its total would charge
only the non-UPI share, making it look cheapest when it is simply unpriced — a
false "cheapest" is the worst output this site can produce. `rankGateways`
returns `{ ranked, incomparable }`, and a provider that cannot price 100% of the
requested mix is listed separately with the share it does cover. There is a test
guarding this.

This is the staging→promote workflow from TECHNICAL §9.3. It is enforced by
tests: `check-ssr` asserts that drafted pages are noindex, that they say
"Drafted" rather than "Verified", and that the sitemap excludes them.

### Sourcing policy

Official rate card where the provider publishes one. Where it does not, a
named third-party source, cited on the page. `sourceKind` records which:

| `sourceKind` | Meaning |
|---|---|
| `official_rate_card` | Taken from the provider's own published pricing |
| `secondary_source` | Provider publishes no usable rate card; figures attributed to named third parties |
| `written_quote` / `merchant_dashboard` / `support_email` | Confirmed directly with the provider |

Any figure not from the provider goes in `secondarySources`, each entry naming
what it covers. Those pages render a **"Some figures are not from the provider"**
callout, and the header reads *"CCAvenue website (no public rate card)"* rather
than implying a rate card exists.

Two providers rest entirely on third-party figures: **CCAvenue** (pricing URL
redirects to a registration form) and **Easebuzz** (pricing page 404s; prices
per merchant). Both carry the callout.

### What the official pages actually corrected

Reading the rate cards caught four claims that were wrong, not merely unsourced:

| Provider | Was | Official page says |
|---|---|---|
| Razorpay | "0% platform fee for the first 90 days" | **No promotion at all** — the offer did not exist |
| Paytm | UPI 0%, RuPay 0% | **1.99% applicable on all transactions** |
| Razorpay | Settlement T+2 | **T+1** |
| Cashfree | Settlement T+2, intl 3% | Next-day; intl **2.99% / 2.95%** |

Those four stay corrected regardless of secondary sources — the provider's own
page contradicts the old values, so no third party can override them.

### Verifying a record

1. Open the provider's rate card, a written quote, or a live merchant dashboard.
2. Correct the figures in `data/seed/gateways/<slug>.json`. Rates are **integer
   basis points** (1.95% → `195`); money is **integer paise** (₹4,999 → `499900`).
3. Set `sourceKind`, `sourceUrl`, `verifiedAt` and `verifiedBy` to what you
   actually did.
4. Change `state` to `verified` and delete `draftReason`.
5. `npm run build && npm run check:ssr` — the page becomes indexable and appears
   in the sitemap.

Record any figure that changed in that gateway's `changes` array. Never
overwrite silently: the changelog is the asset.

## Supabase

The project is connected but **the `subscribers` table does not exist yet**, so
the notify-me form on `/upi/mdr-tracker/` currently fails gracefully.

### Why this is blocked

The `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public by design — it is safe in
client-side code, and access is controlled by Row Level Security rather than by
secrecy. It can read and write rows, but **it cannot run DDL**, so it cannot
create a table. Direct Postgres on `db.<ref>.supabase.co:5432` is also closed
(Supabase serves direct connections over IPv6 only); the pooler is the route in.

### Unblocking it — either one

**A. Paste the SQL** (no credentials leave your machine): open the Supabase
dashboard → SQL Editor, and run `drizzle/0002_subscribers.sql`.

**B. Run the migrations.** `DATABASE_URL` is already in `.env.local`:

```bash
npm run db:migrate
```

### Connection-string gotcha

Supabase's **direct** host, `db.<ref>.supabase.co`, is **IPv6-only** — it has no
A record at all:

```
db.rdcijuqykxfyvwxswknw.supabase.co has IPv6 address 2406:da14:...
```

Any environment without IPv6 routing (many CI runners, containers, and sandboxed
shells) gets `ENOTFOUND` from it. If that happens, swap `DATABASE_URL` for the
**Session pooler** string, which is dual-stack:

```
postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres
```

Dashboard → Project Settings → Database → Connection string → Session pooler.

### Runtime does not need Postgres

Only migrations use `DATABASE_URL`. The running app talks to PostgREST with the
publishable key, so deployments need no database credentials at all.

### The RLS rule that matters

`subscribers` is written using the **public** key, so the policy is INSERT-only
and there is deliberately **no SELECT policy**. If you add one, anyone holding
the publishable key can download the entire subscriber list. Reading the list
requires the secret `service_role` key or a direct Postgres connection.

### Still to do on the subscribe flow

Double opt-in is modelled (`confirmed_at`) but not wired — there is no email
provider configured, so nothing is sent and rows are stored unconfirmed. Hook up
a transactional sender before treating the list as opt-in.

## Phase 2 — built

- **`/compare/[a]-vs-[b]/`** — 28 head-to-head pages, one per pair.
- **`/best/[use-case]/`** — 6 profiles (small business, freelancers, D2C, SaaS,
  high volume, international).
- Gateway pages now link to every comparison they appear in, generated from the
  data so the link graph cannot rot.

### The computed verdict

Each comparison page states the **crossover volume** — the monthly figure at
which the cheaper provider changes:

> *"X is cheaper below ₹3,20,000 a month. Above that, Y is cheaper."*

Annual cost is linear in volume (rate × volume + fixed costs), so two providers'
cost lines intersect at most once. `findCrossover` bisects to the nearest rupee.
Nothing on these pages is hand-written prose that could appear on another
comparison page — which is the point, given Google's 2026 spam updates named
template comparison pages specifically.

Three outcomes are possible, and all three are rendered honestly:

| Result | Rendered as |
|---|---|
| `crosses` | "X cheaper below ₹N/month, Y above it" |
| `always` | "X is cheaper at every volume" |
| `tie` | "X and Y publish identical pricing, so neither is cheaper" |

**The `tie` case matters.** Paytm and PhonePe publish identical rates, as do
CCAvenue and PayU. An alphabetical tie-break would have printed *"Paytm is
cheaper than PhonePe"* on a live page — a fabricated difference. There is a test
guarding this.

### No crossovers appear in the current data

Every drafted gateway has `annualMaintenancePaise: 0`, so cost is purely
proportional to rate and the lines never cross. The logic is correct and tested;
it stays dormant until a real fixed fee is verified in. Cashfree is reported to
carry a ~₹4,999/year maintenance charge — if that verifies, crossovers appear
immediately and these pages get considerably more interesting.

## Phase 3

Method pages (`/charges/upi/` etc. — note these collide with the
`/charges/[gateway]/` dynamic segment and need a routing decision), interactive
calculator inputs, the dev tools, and the public dataset API.

**Still blocking publication:** a named author with verifiable payments
credentials. This is YMYL financial content and should not publish without
identifiable authorship. See the flagged callouts on `/about/` and
`/corrections/`.
