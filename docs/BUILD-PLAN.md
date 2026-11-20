# onlinepayment.in — Build Plan

> Status: proposed spec, not yet built. Last updated 2026-11-19.

---

## 1. Positioning

**The independent source of truth for what Indian payments actually cost.**

This is not a blog. It is a **pricing-data utility** with content wrapped around it.

| | |
|---|---|
| **Primary user** | Indian SMB owner, D2C founder, or developer choosing/auditing a payment gateway |
| **Secondary user** | Journalists, agencies, consultants — our link and citation sources |
| **Why we win** | Everyone else publishes a pricing snapshot and abandons it. We maintain dated, versioned, source-cited pricing data and show our work. |
| **Primary revenue** | Gateway partner commissions (recurring % of referred TPV) |
| **Explicitly not** | AdSense. Indian finance RPM is ~₹250–600/1000 views and falling; one referred merchant doing ₹10L/mo at 0.25% is ₹2,500/mo recurring. Ads also cannibalise the high-intent clicks worth 100x more. |

### The three layers

1. **Data layer (the moat)** — a maintained, versioned, dated database of real gateway pricing. Manual verification work is a feature: it is why an AI content farm cannot clone us.
2. **Tool layer (the magnet)** — calculators driven by that data. Interactive tools survive zero-click search because AI Overviews cannot answer "what is cheapest for *my* ₹4L/month at 70% UPI" without the user's inputs.
3. **Content layer (support)** — guides that document our data and tools. Supporting cast, not the product.

### The wedge

**UPI MDR is live and unresolved.** The 0.4% MDR on P2M above ₹2,000 was scheduled for 15 Oct 2026, deferred past Diwali, and still has no announced start date. M2M is reportedly heading for a flat ₹5. Every merchant in India wants to know whether UPI will start charging them.

There is no authoritative, dated, maintained tracker for this. News sites publish once and move on; vendor blogs are stale and contradictory. A maintained live tracker is something AI Overviews cannot replace (the answer keeps changing) and that journalists will cite — which is how authority actually gets built in a YMYL niche.

---

## 2. Information architecture

Flat, keyword-clean, no query params on indexable pages.

```
/                                      Home — calculator above the fold
/calculator/                           Canonical tool page
/calculator/[scenario]/                Static prefilled scenarios (crawlable surface)
                                         e.g. /calculator/5-lakh-monthly-upi-heavy/

/charges/                              Hub — the dataset, rendered
/charges/[gateway]/                    /charges/razorpay/, /charges/cashfree/ ...
/charges/upi/                          Method-wise cuts
/charges/credit-card/
/charges/debit-card/
/charges/netbanking/
/charges/international/

/compare/                              Comparison hub
/compare/[a]-vs-[b]/                   Programmatic, data-driven
/best/[use-case]/                      small-business, saas, d2c, freelancers, ngo, education

/upi/                                  UPI hub
/upi/mdr-tracker/                      *** FLAGSHIP ***
/upi/limits/                           Live transaction limits by bank and app
/upi/rules/                            Rule change log
/upi/guides/[slug]/

/tools/                                Dev tools hub
/tools/ifsc/                           IFSC lookup
/tools/ifsc/[ifsc]/                    Programmatic (see crawl-budget note, §5.3)
/tools/bin-lookup/
/tools/upi-vpa-validator/
/tools/webhook-signature-verifier/
/tools/settlement-calculator/
/tools/gst-on-payment-fees/

/guides/[slug]/                        Integration + how-to (deliberately narrow)
/data/                                 Public dataset, changelog, API docs
/data/changelog/
/methodology/                          How we verify pricing  (trust-critical)
/about/  /authors/[name]/  /disclosure/  /contact/  /corrections/
```

### Hub-and-spoke linking, generated from the DB

Every gateway page links to: its comparison pages, its method pages, and the calculator preselected to it. Every comparison page links back to both gateway pages. Generated from data so it never rots and there are no orphans.

---

## 3. Data model

### Design rules (these matter more than the schema)

1. **Nothing is "current" without a `verified_at`.** A fee with no verification date is not publishable.
2. **Every fact carries a `source_url`** pointing at a primary source (official rate card, NPCI/RBI circular, written quote, merchant dashboard screenshot).
3. **Fees are immutable.** Never `UPDATE` a rate. Close the old row with `effective_to` and insert a new one. This gives us a changelog for free — and the changelog *is* the citable asset.
4. **Store GST separately.** Never bake 18% into a stored rate. Display it as a separate line.
5. **Money in paise, as integers.** No floats anywhere near currency.
6. **Tiered pricing is first-class.** `band_min_amount` / `band_max_amount` exist because UPI MDR above ₹2,000 is exactly this shape.

### Tables

```
gateways
  id, slug, legal_name, display_name, website, logo_path
  rbi_pa_licensed (bool), rbi_license_ref, parent_company
  founded_year, hq_city, status (active | deprecated | acquired)

pricing_plans
  id, gateway_id -> gateways
  plan_name, slug, is_default (bool)
  effective_from (date), effective_to (date, nullable)
  source_url, verified_at, verified_by, notes

fees                                  -- the core table
  id, plan_id -> pricing_plans
  method        (upi | credit_card_domestic | credit_card_intl | amex
                 | debit_card | rupay_debit | netbanking | wallet | emi
                 | international_card | bnpl | upi_autopay)
  card_network  (nullable: visa | mastercard | rupay | amex | diners)
  percent_rate  (numeric, nullable)
  flat_fee_paise (int, nullable)
  min_fee_paise, max_fee_paise (nullable)
  band_min_paise, band_max_paise (nullable)   -- tiered pricing
  gst_applicable (bool, default true)

recurring_costs
  plan_id -> pricing_plans
  setup_fee_paise, annual_maintenance_paise, monthly_fee_paise
  platform_fee_percent

operational_terms
  plan_id -> pricing_plans
  settlement_cycle_days (int)
  instant_settlement_available (bool), instant_settlement_fee_percent
  chargeback_fee_paise, refund_fee_paise, mdr_refunded_on_refund (bool)
  payout_fee_paise, min_payout_paise

promos                                -- time-boxed offers; expire loudly
  id, gateway_id -> gateways
  description, promo_type (zero_fee | reduced_rate | volume_cap)
  value, cap_amount_paise
  starts_at, ends_at, source_url, verified_at

features
  gateway_id -> gateways, feature_key, supported (bool), notes
  -- payment_links, subscriptions, upi_autopay, tokenization, international,
  -- multi_currency, smart_routing, split_payments, marketplace, no_cost_emi,
  -- payout_api, invoicing, pos, cod_confirmation, dashboard_app

integrations
  gateway_id -> gateways
  platform (shopify | woocommerce | wix | magento | react | node | php
            | python | java | flutter | react_native)
  is_official (bool), plugin_url, sdk_url, docs_url

regulatory_events                     -- powers /upi/mdr-tracker/
  id, title, slug
  category (upi_mdr | limits | tokenization | kyc | pa_license | other)
  status   (proposed | scheduled | deferred | in_effect | withdrawn | superseded)
  authority (RBI | NPCI | MeitY | GoI)
  announced_date, effective_date, deferred_to (nullable)
  summary, impact_on_merchants
  primary_source_url, verified_at, supersedes_id (self-ref)

change_log                            -- what makes us citable
  id, entity_type, entity_id, field_name
  old_value, new_value, changed_at, source_url, note

verification_log
  id, entity_type, entity_id, verified_at, verified_by
  method (official_rate_card | written_quote | merchant_dashboard | support_email)
  evidence_url
```

### Launch scope

**8–10 gateways, not 25.** Razorpay, Cashfree, PayU, Paytm PG, PhonePe PG, Instamojo, CCAvenue, BillDesk, Stripe India, Easebuzz. Depth beats breadth — and the verification workload is the real constraint on this project.

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | SSG + ISR against a DB, API routes, and real interactivity in one codebase |
| Rendering | SSG default, ISR (daily revalidate) on data pages | Every indexable page ships complete HTML |
| Database | **Postgres** — Neon or Supabase | Relational data with real history; cheap at this scale |
| ORM | Drizzle | Typed schema, SQL-first migrations |
| Content | MDX in-repo (`next-mdx-remote`) | Git gives version history and review for free |
| Styling | Tailwind | No runtime CSS cost |
| Hosting | Vercel | Best ISR support; Cloudflare Pages is the fallback |
| Analytics | Plausible or self-hosted Umami | No cookie banner needed, ~1KB, privacy-clean |
| Indexing | Search Console + Bing Webmaster + IndexNow | IndexNow gives near-instant pickup, free |

**Current repo is a Vite SPA — wrong shape for this.** A client-rendered SPA is close to invisible for the pricing pages that are the whole point. Phase 0 replaces it.

*Alternative considered:* Astro is lighter and excellent for content, but we need DB-backed ISR and a genuinely interactive calculator. Next.js is the safer single choice.

**Calculator state lives in the URL path**, not in React state alone — so every scenario is shareable *and* crawlable.

---

## 5. Technical SEO and crawlability spec

### 5.1 Rendering — the one non-negotiable rule

> **If disabling JavaScript hides the content, the content does not exist to Google.**

- Every indexable page returns complete HTML on the first response.
- Acceptance test, run in CI against every template:
  ```
  curl -s https://onlinepayment.in/charges/razorpay/ | grep -q "Last verified"
  ```
- No client-side data fetching for primary content. `use client` is only for widgets that **enhance** already-server-rendered content.
- **The calculator server-renders a default result set.** Interactivity improves it; it does not create it. This is the single most common reason calculator pages get no traffic — the numbers only exist after JS runs, so Google indexes an empty shell.

### 5.2 URL rules

- Lowercase, hyphen-separated, no IDs, no dates in paths.
- **Trailing slash enforced**, with a 308 from the non-slash form. Pick one and never waver.
- **No query parameters on indexable pages.** Calculator scenarios become path segments.
- Self-referencing canonical on every page.
- A URL never changes without a 301.

### 5.3 Crawl budget control

`robots.txt`:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/data/
Disallow: /search
Disallow: /*?
Sitemap: https://onlinepayment.in/sitemap.xml
```

- **Faceted filters must not generate crawlable links.** Use buttons with JS state, or `rel="nofollow"` plus `noindex`. Filter-combination URLs are the classic crawl trap.
- **Pagination:** self-canonical each page — never canonical back to page 1. Keep `rel="prev"/"next"` in the HTML; Google dropped it but Bing still uses it.

**The rule that keeps us out of March-2026 trouble:**

> Do not publish a programmatic page unless it carries **at least one unique data point** not available on its parent hub.

Google's 2026 spam updates explicitly named "product comparison pages built from templates without original testing." Our comparison pages pass because the verdict is *computed from our own verified dataset*, not written to a template.

**IFSC pages (~170k) are a crawl-budget risk.** Pilot at 5,000 pages with bank and city hub pages above them. Only scale if Search Console shows them indexing *and* earning impressions. If they bloat the index without traffic, `noindex` the leaves and keep the hubs.

### 5.4 Sitemaps

Segmented, so Search Console coverage is diagnosable per page type:

```
/sitemap.xml                      (index)
  /sitemaps/static.xml
  /sitemaps/charges.xml
  /sitemaps/compare.xml
  /sitemaps/calculator-scenarios.xml
  /sitemaps/upi.xml
  /sitemaps/tools.xml
  /sitemaps/guides.xml
  /sitemaps/ifsc-[n].xml          (50,000 URL cap each)
```

- **`lastmod` must be the real data-change date**, pulled from `change_log`. Fabricated `lastmod` values get the whole sitemap ignored.
- **Ping IndexNow on every data change.** Free, and gets pricing updates picked up in hours instead of weeks. This is a genuine edge for a site whose value is freshness.

### 5.5 Structured data (JSON-LD)

| Page type | Schema |
|---|---|
| Home | `Organization`, `WebSite` + `SearchAction` |
| All pages | `BreadcrumbList` (also rendered as visible HTML breadcrumbs) |
| `/data/` | **`Dataset`** — underused, gets us into Google Dataset Search and is a strong AEO signal |
| `/charges/[gateway]/` | `Product` + `Offer` + `priceSpecification` (must be exactly accurate) |
| Guides | `Article` + `author` (`Person` with `sameAs`) + `datePublished` + `dateModified` |
| Tools | `WebApplication` |
| Integration tutorials | `HowTo` |
| Comparison hubs | `ItemList` |
| Anywhere with a real visible FAQ | `FAQPage` |

Validate every template in the Rich Results Test and the Schema.org validator before shipping. Never mark up something that is not visible on the page.

### 5.6 On-page

- One `<h1>`; logical `h2`/`h3` nesting.
- **Titles generated from data, never hardcoded**, so they never go stale:
  `Razorpay Charges in India (November 2026)` — the month comes from `verified_at`.
- Meta description ≤155 chars, templated with real figures interpolated.
- **"Last verified: 19 Nov 2026" visible near the top of every pricing page**, plus `dateModified` in JSON-LD. Trust signal and freshness signal in one.
- Every pricing figure footnoted to its primary source with a real outbound link. Genuine citations help; do not `nofollow` them.
- Pricing in real `<table>` elements. Not divs, not canvas, not images — both Google and AI crawlers parse tables well and images not at all.
- **Answer the page's question in the first 100 words**, then elaborate. Rewards both AI Overviews and humans.

### 5.7 Core Web Vitals budget

| Metric | Target | Pass line |
|---|---|---|
| LCP | < 2.0s | 2.5s |
| INP | < 200ms | 200ms |
| CLS | < 0.05 | 0.1 |

- JS budget: **< 120KB gzipped** on content pages, < 200KB on the calculator.
- Self-hosted fonts, `font-display: swap`, subset to the glyphs actually used.
- `next/image` everywhere, AVIF/WebP.
- One third-party script total (analytics). **No ad scripts — so zero ad-driven layout shift.** This is a real competitive advantage over every vendor blog in the niche.

### 5.8 AEO — AI crawlers matter as much as Google now

With ~68% of searches ending without a click, being *cited* is worth nearly as much as being clicked. Citation builds brand, and branded queries are the one segment AI search does not erode.

`robots.txt` **explicitly allows** `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`.

- Publish `/llms.txt` and `/llms-full.txt` — a map of key facts and pages for LLM ingestion.
- Write facts in extractable form: short declarative sentences, real tables, definition lists.
- **Public documented JSON endpoints at `/data/`** — being the dataset other people cite is the strongest AEO position available.

### 5.9 Monitoring and content health

- Search Console API → weekly export into a dashboard.
- Automated weekly crawl (Screaming Frog CLI or a script) checking: broken links, missing canonicals, duplicate titles, orphan pages, missing JSON-LD.
- **Alert when any indexable page's `verified_at` exceeds 60 days; block it from the sitemap past 90 days.** Stale pricing is both a trust risk and a ranking risk, and this is the metric that keeps the moat real.

### 5.10 E-E-A-T — mandatory, this is YMYL finance

- A real named author with genuine payments credentials, a real bio, and `sameAs` to LinkedIn.
- **`/methodology/`** — exactly how pricing is gathered, how often, and what we do when sources conflict. (During research for this plan, published rates for the same gateway disagreed across nearly every source. Documenting how we resolve that *is* the differentiator.)
- **`/disclosure/`** — affiliate relationships stated plainly, plus an explicit statement that **ranking is never sold**.
- **`/corrections/`** — a corrections policy, with visible correction notes on amended pages.
- Real business entity details and contact info.

---

## 6. Page templates

### T1 — `/calculator/` (the hero product)

**Above the fold:** three inputs — monthly volume, method mix (sliders: UPI / cards / netbanking / wallets), business type — producing a **ranked table of true annual cost, cheapest first**.

Server-rendered with sensible defaults, so there is real content and a real table before any JS runs.

**Below:** assumptions used, GST shown as a separate line, a fixed-fee explainer, link to `/methodology/`, then partner CTAs for the top 3 results.

The non-obvious insight this tool exists to surface: *a 1.75% gateway with a ₹4,999 annual fee costs more than a 2% gateway with no annual fee at low volume.* Every listicle in this niche gets that wrong because it only compares headline rates.

**Scenario pages** (`/calculator/5-lakh-monthly-upi-heavy/`) are statically generated for ~15 common volume/mix combinations — these are the crawlable surface that a pure JS calculator never gets.

### T2 — `/charges/[gateway]/`

- **H1:** `{Gateway} Charges in India ({Month Year})`
- Immediately below: **`Last verified: {date}`**
- One clear table of every fee by method, GST as its own line
- Fixed costs (setup, annual maintenance, monthly)
- Settlement terms, chargeback and refund fees, whether MDR is refunded on refund
- **Active promos with explicit expiry dates** — these are what every stale competitor gets wrong
- What is *not* charged (often the real answer)
- **This gateway's changelog** — pulled from `change_log`
- Links to its comparisons, its method pages, calculator preselected
- Primary source links for every figure

### T3 — `/compare/[a]-vs-[b]/`

- Side-by-side data table generated from the DB
- **A computed verdict, not a written one:** "Cashfree is cheaper above ₹3.2L/month; Razorpay is cheaper below that, because of the ₹4,999 annual fee." Derived from our data, recalculated whenever the data changes.
- Cost table at three volume levels (₹50k, ₹5L, ₹50L per month)
- Both changelogs
- No generic prose. If a sentence could appear on any comparison page, it does not ship.

### T4 — `/upi/mdr-tracker/` (the flagship)

**Above the fold — one unambiguous status banner:**

> **As of 19 Nov 2026:** UPI MDR is **not** in effect for P2M payments of ₹2,000 or less. A proposed 0.4% MDR on P2M above ₹2,000 is **deferred with no announced start date**. P2P transfers remain free at all values.

Then:
- **Timeline** of every announcement, deferral and reversal, each with its primary source and date
- **"What it means for you"** — enter your UPI volume, see your exposure if it lands
- Affected / unaffected table by transaction type and value band
- **Email capture: "get notified when this changes"** — the one asset Google cannot take away

---

## 7. Monetization

In priority order. Note that **data placement is never compromised for revenue** — ranking integrity is the product.

1. **Gateway partner commissions** — primary. Links placed *after* the data on every gateway, comparison and calculator page. Never instead of it.
2. **Email list** — from the MDR tracker and calculator. The durable, algorithm-proof channel.
3. **Lead generation** — "get quotes from 3 gateways for your volume." SMB payment CAC benchmarks at $400–$1,500/merchant, so qualified leads have real value.
4. **Dataset API, paid tier** — fintechs, agencies, consultants. Phase 3+.
5. **Sponsored visibility slots** — clearly disclosed. We sell placement, never ranking position.
6. **No AdSense.**

Read every partner programme's T&Cs before launch — some restrict comparative claims about competitors, which would directly affect T3.

---

## 8. Phased build

| Phase | Weeks | Deliverable |
|---|---|---|
| **0 — Foundation** | 1 | Repo reset to Next.js. DB schema + migrations. SEO primitives: sitemap generation, JSON-LD components, canonical/robots infra, IndexNow hook. `/methodology/`, `/about/`, `/disclosure/`, `/corrections/`. |
| **1 — Ship the core** | 2–4 | Seed 8–10 gateways with verified pricing. `/charges/*`. Calculator + 15 scenario pages. **`/upi/mdr-tracker/`**. Email capture. **Submit to Search Console and go live.** |
| **2 — Programmatic** | 5–7 | `/compare/` (~45 pairs from 10 gateways). `/best/[use-case]` (~8). Method pages. Automated internal linking. |
| **3 — Tools and data** | 8–11 | IFSC lookup (piloted at 5k pages). BIN lookup. Webhook signature verifier. Settlement calculator. `/data/` + public API + `Dataset` schema. |
| **4 — Ongoing** | 12+ | Guides. Integration tutorials (narrow and deep only). Monthly re-verification cycle. Possibly Hindi versions of the top 20 pages. |

**Ship at the end of Phase 1.** A calculator, 10 verified gateway pages and the MDR tracker is already a product worth linking to. Do not wait for 100 articles.

---

## 9. Metrics

Pageviews are a vanity metric here. Track:

| Metric | Why |
|---|---|
| **Referred merchants activated** | The actual revenue number |
| **Email subscribers** | The channel nobody can take away |
| Calculator completions | Intent, and the input to lead gen |
| Citations earned (links + AI mentions) | Authority in a YMYL niche |
| **% of pricing data verified within 30 days** | The health of the moat |

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| **Verification workload is the real constraint** | Launch with 8 gateways, not 25. Monthly cycle. Automate scraping, human-confirm every change. |
| Programmatic pages read as thin content | The ≥1-unique-data-point rule (§5.3), enforced in code, not by judgement |
| Partner T&Cs restrict comparative claims | Read them in Phase 0, before T3 is designed |
| Accuracy liability on financial figures | `verified_at` dating, source links, visible corrections policy, clear disclaimers |
| IFSC pages become an index-bloat sink | Pilot 5k before scaling; `noindex` leaves if they do not earn impressions |
| Gateways outrank us on their own brand terms | Expected and fine. We win on `vs`, `cheapest`, `true cost`, `calculator`, and MDR queries — where they have a conflict of interest and we do not. |

---

## 11. Open decisions

1. **Author identity** — who is the named expert? YMYL finance requires a real person with real credentials. This is a genuine blocker on E-E-A-T and needs answering before Phase 1 ships.
2. **Business entity** — needed for partner programme signups and for trust pages.
3. **Hindi** — doubles content ops. Defer the decision to Phase 4, after English traffic patterns are visible.
4. **Partner programme selection** — Razorpay (₹500 + up to 0.1% TPV) vs Cashfree (0.25% TPV) vs both. Both, probably, but read the T&Cs first.
