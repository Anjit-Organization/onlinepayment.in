# onlinepayment.in — UI & Design System

> Visual direction, design tokens, responsive system, component library and section plans.
> Companion to [BUILD-PLAN.md](./BUILD-PLAN.md) and [TECHNICAL.md](./TECHNICAL.md). Last updated 2026-11-19.

---

## 1. Design direction

### 1.1 The strategic constraint on the visual design

Our competitors are the gateways themselves. Razorpay, Cashfree and PayU all look the same: violet-to-blue gradients, glassmorphism, floating 3D cards, "Trusted by 10M+ businesses". **If we look like them, we read as one of them** — and our entire positioning is that we are not.

So the visual direction is deliberately the opposite: **Swiss/editorial data authority.** Closer to a regulator's publication or a research terminal than to a fintech landing page. Flat, gridded, high-contrast, typographically led, almost no decoration. The design should communicate *"these numbers are correct"*, not *"this product is exciting"*.

This is also cheap to render, which protects the ≤120 KB JS and LCP ≤2.0s budgets in TECHNICAL §5.4.

### 1.2 How this direction was chosen

- **Design-intelligence database** (192 product palettes, 74 font pairings, 119 UX guidelines) resolved the product type to the **"Trust & Authority"** pattern with the **Minimalism & Swiss Style** visual style, light + dark supported, and its explicit anti-patterns: *playful design, unclear fees, AI purple/pink gradients*.
- **Palette:** the database's top Fintech/Crypto match was amber + purple on navy, which contradicts both its own stated colour strategy ("Navy/Grey corporate. Trust blue. Accent for CTA only.") and its own anti-pattern list. I took the **`B2B Service — Professional navy + blue CTA`** profile instead. Amber is also disqualified as a *primary* here because we need amber free for the staleness and expiry warning states in §7.1.
- **Reference products I am drawing on**, for the record: GOV.UK (data authority, accessibility, zero decoration), Stripe Docs (dense technical clarity), Wise's pricing pages (fee transparency as a design subject), NerdWallet (comparison tables that convert without feeling like ads).

**One honest note on the brief:** I did not scrape Pinterest or do visual trend-boarding. For a data product the failure mode is *looking* designed at the cost of legibility, and curated palette/typography/UX data plus named functional comparables is a better input than mood-boarding. If you want a visual mood pass on top of this, say so and I will do it as a separate step — but I would not change the structural decisions below on the strength of it.

### 1.3 Non-negotiables

| Do | Don't |
|---|---|
| Numbers are the hero of every page | Gradients, glassmorphism, mesh backgrounds |
| Borders and type weight create hierarchy | Drop shadows as the primary structure signal |
| Every figure carries a date and a source | Decorative illustration or 3D |
| Tables are real `<table>` elements | Purple/violet anywhere (that is the competitor palette) |
| Dense by default; whitespace earns its place | Hero images, stock photography, emoji as icons |

---

## 2. Design tokens

All tokens are CSS custom properties on `:root`, redefined for dark mode. **No raw hex in any component** — enforced by a Stylelint rule.

### 2.1 Colour — light (default)

```css
:root {
  /* Surfaces */
  --c-bg:            #F8FAFC;   /* page */
  --c-surface:       #FFFFFF;   /* cards, table bodies */
  --c-surface-sunk:  #F1F5F9;   /* table header, code blocks, zebra */
  --c-surface-raised:#FFFFFF;

  /* Text */
  --c-fg:            #020617;   /* primary text — 19.3:1 on --c-bg */
  --c-fg-muted:      #475569;   /* secondary — 7.2:1 */
  --c-fg-subtle:     #64748B;   /* captions, meta — 4.6:1 (min body) */

  /* Brand */
  --c-primary:       #0F172A;   /* navy — headers, primary buttons */
  --c-primary-fg:    #FFFFFF;
  --c-accent:        #0369A1;   /* trust blue — links, CTA only */
  --c-accent-fg:     #FFFFFF;
  --c-accent-weak:   #E0F2FE;   /* accent tint backgrounds */

  /* Structure */
  --c-border:        #E2E8F0;   /* decorative rules, zebra  — 1.2:1, non-text only */
  --c-border-strong: #CBD5E1;   /* table outer, section dividers — 1.4:1, decorative */
  --c-border-control:#8795AB;   /* input/control edges — 3.0:1 on white, meets 1.4.11 */
  --c-ring:          #0369A1;   /* focus */

  /* Semantic — data state (see §7.1) */
  --c-fresh:         #047857;   /* verified < 30 days */
  --c-fresh-weak:    #ECFDF5;
  --c-warn:          #B45309;   /* stale 30–60d, promo expiring */
  --c-warn-weak:     #FFFBEB;
  --c-danger:        #B91C1C;   /* stale > 60d, fee increase */
  --c-danger-weak:   #FEF2F2;
  --c-info:          #0369A1;
  --c-info-weak:     #E0F2FE;
}
```

### 2.2 Colour — dark

Dark mode is not an inversion. Two deliberate shifts: **shadows are removed entirely** (they do not read on dark surfaces), and **border contrast is raised**, because borders become the only structural signal.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* tokens below */ }
}
:root[data-theme="dark"] {
  --c-bg:            #0B1220;   /* navy-black, not pure black — less halation in long reads */
  --c-surface:       #111A2B;
  --c-surface-sunk:  #0A101C;
  --c-surface-raised:#1A2437;

  --c-fg:            #F1F5F9;   /* 17.1:1 on --c-bg */
  --c-fg-muted:      #94A3B8;   /* 7.3:1 */
  --c-fg-subtle:     #7D8DA3;   /* 5.5:1 */

  --c-primary:       #E2E8F0;   /* inverts: light chrome on dark */
  --c-primary-fg:    #0B1220;
  --c-accent:        #38BDF8;   /* lightened — #0369A1 fails contrast on dark */
  --c-accent-fg:     #04121F;
  --c-accent-weak:   #0C2A3E;

  --c-border:        #243048;   /* raised vs light-mode equivalent */
  --c-border-strong: #35445F;
  --c-border-control:#5B6B85;   /* 3.2:1 on --c-surface */
  --c-ring:          #38BDF8;

  --c-fresh:         #34D399;  --c-fresh-weak:  #052E22;
  --c-warn:          #FBBF24;  --c-warn-weak:   #2A1F05;
  --c-danger:        #F87171;  --c-danger-weak: #2C0B0B;
  --c-info:          #38BDF8;  --c-info-weak:   #0C2A3E;

  --shadow-sm: none; --shadow-md: none; --shadow-lg: none;
}
```

**Theme switching:** `data-theme` on `<html>`, defaulting to `prefers-color-scheme`, with a three-way toggle (system / light / dark). The choice is written to `localStorage` and applied by a tiny blocking inline script in `<head>` to prevent a flash — one of the few places a blocking script is correct.

### 2.3 Spacing — 4px base, dense scale

Density dial is set high (8/10) because this is a data product.

```css
--sp-1: 0.25rem;  /*  4px */   --sp-5: 1.5rem;   /* 24px */
--sp-2: 0.5rem;   /*  8px */   --sp-6: 2rem;     /* 32px */
--sp-3: 0.75rem;  /* 12px */   --sp-7: 3rem;     /* 48px */
--sp-4: 1rem;     /* 16px */   --sp-8: 4rem;     /* 64px */
```

Vertical rhythm between page sections: `--sp-7` mobile, `--sp-8` desktop. Inside a table: `--sp-2`/`--sp-3`.

### 2.4 Radius, borders, elevation

```css
--radius-sm: 3px;   /* inputs, badges */
--radius-md: 6px;   /* cards, buttons */
--radius-lg: 8px;   /* modals, panels */
/* Nothing is fully rounded. Pills read consumer-app; we are a reference work. */

--border-w: 1px;

--shadow-sm: 0 1px 2px rgb(2 6 23 / 0.05);
--shadow-md: 0 2px 8px rgb(2 6 23 / 0.07);
--shadow-lg: 0 8px 24px rgb(2 6 23 / 0.10);
/* Shadows are a last resort. Prefer --c-border for separation. */
```

### 2.5 Motion

Motion dial is deliberately low (2/10). Nothing moves unless it communicates a state change.

```css
--dur-fast: 120ms;  /* hover, focus */
--dur-base: 200ms;  /* disclosure, tab change */
--dur-slow: 300ms;  /* panel, drawer */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

- Only `transform`, `opacity` and `background-color` are animated. Never `width`, `height` or `top`.
- No scroll-triggered reveals on content. Crawlers and `prefers-reduced-motion` users must see the final state, and our data is the content.
- `@media (prefers-reduced-motion: reduce)` sets all durations to `1ms`. Global, not per-component.

---

## 3. Typography

### 3.1 The family decision: IBM Plex superfamily

One superfamily covers all three needs, which no font pairing in the database does as cleanly:

| Face | Use | Why |
|---|---|---|
| **IBM Plex Sans** | All UI and body text | Resolved by the database as the finance/banking/trustworthy match. Neutral, slightly technical, not a startup geometric sans. |
| **IBM Plex Mono** | All figures in tables, rates, code | Family-cohesive. Avoids the visual clash of pairing Fira/JetBrains mono against an unrelated sans. |
| **IBM Plex Sans Devanagari** | Hindi, if Phase 4 happens | **This is why the superfamily wins.** Metrically harmonious with the Latin, so a Hindi version needs no redesign. Choosing this now costs nothing and prevents rework later. |

Self-hosted, variable, subset to the glyphs used, `font-display: swap`, preloaded. No Google Fonts CDN request — it is a third-party connection on the critical path.

### 3.2 Scale

Fluid between 375px and 1440px via `clamp()`, so there are no type jumps at breakpoints.

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--t-display` | `clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)` | 1.15 | 600 | Page `h1` |
| `--t-h2` | `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)` | 1.25 | 600 | Section |
| `--t-h3` | `1.125rem` | 1.35 | 600 | Sub-section |
| `--t-body` | `1rem` (16px floor) | 1.6 | 400 | Prose |
| `--t-body-sm` | `0.9375rem` (15px) | 1.5 | 400 | Table cells |
| `--t-caption` | `0.8125rem` (13px) | 1.45 | 400 | Meta, footnotes |
| `--t-data-lg` | `clamp(1.5rem, 1.3rem + 1vw, 2rem)` | 1.1 | 500 mono | Headline figures |
| `--t-data` | `0.9375rem` | 1.4 | 450 mono | Table figures |

**Body text never goes below 16px, captions never below 13px.** 12px is too small for a site where misreading a number has a cost.

### 3.3 Numeric rendering — the detail that makes tables readable

```css
.data, table td, table th { font-variant-numeric: tabular-nums; }
```

Proportional digits make a column of rates visually ragged and genuinely harder to compare. `tabular-nums` on every figure is mandatory, and `IBM Plex Mono` is already tabular.

Indian number formatting (lakh/crore grouping) via `Intl.NumberFormat('en-IN')` — `₹12,50,000`, never `₹1,250,000`.

### 3.4 Prose measure

```css
--measure-prose: 68ch;   /* body copy caps here, always */
```

Line length is capped independently of the layout container (§4.2). A 1920px screen must not produce 180-character lines.

---

## 4. Responsive system

### 4.1 Breakpoints

Mobile-first. Every style is written for the smallest screen and enhanced upward — `min-width` queries only, never `max-width`.

| Token | Min width | Target device | What changes here |
|---|---|---|---|
| *(base)* | 320px | Small phone | Single column. Cards, not tables. Drawer nav. |
| `sm` | 640px | Large phone, small tablet portrait | Two-up stat tiles |
| `md` | **768px** | Tablet portrait | **Tables become tables** (§5.1). Inline nav appears. |
| `lg` | 1024px | Tablet landscape, small laptop | Sidebar column appears; 2-col content grid |
| `xl` | 1280px | Desktop | Persistent TOC rail on long data pages |
| `2xl` | 1536px | Large desktop | Table lane reaches max; gutters grow |

**Mandatory test widths:** 320, 375, 390, 768, 1024, 1440, 1920. 320px is included because it is still the floor — a horizontal scrollbar at 320px is a bug, not an edge case.

### 4.2 Content lanes — the large-screen answer

A single `max-width` container is the usual mistake: it either wastes a 1920px screen or produces unreadable 180-character lines. **Content type determines width, independently of the page container.**

```css
.lane-prose  { max-width: var(--measure-prose); }  /* 68ch  — body copy, guides */
.lane-default{ max-width: 1120px; }                /* standard page content */
.lane-wide   { max-width: 1440px; }                /* tables, calculator results */
.lane-full   { max-width: none; }                  /* status strips, section bands */

/* Gutters scale, content does not grow past its lane */
.lane-prose, .lane-default, .lane-wide {
  margin-inline: auto;
  padding-inline: clamp(1rem, 4vw, 2.5rem);   /* 16px floor — never less */
}
```

So on a 1920px screen: a guide's prose stays at a comfortable 68ch while its comparison table uses the full 1440px lane. Beyond 1536px **nothing scales further — the gutters absorb the extra space.** Stretching a data table to 1900px hurts scanning; the eye loses the row.

### 4.3 Using large screens properly

Rather than centring a narrow column in an ocean of empty space:

- **≥1280px:** long data pages (`/charges/[gateway]/`, guides) gain a **persistent left TOC rail**, sticky, showing section links with the active one marked. On smaller screens the same TOC is a collapsed `<details>` block at the top of the content. Same markup, different presentation.
- **≥1024px:** `/compare/` shows a third "difference" column computed between the two gateways — extra space buys *more information*, not bigger type.
- **≥1280px:** the calculator moves from stacked (inputs above results) to a two-pane layout, inputs in a sticky left panel, results live-updating on the right. Changing a slider and seeing the ranking reorder without scrolling is the whole appeal of the tool.
- **Never:** scale font sizes up past `2xl`, add decorative side imagery, or widen tables past 1440px.

### 4.4 Mobile specifics

- `<meta name="viewport" content="width=device-width, initial-scale=1">`. **User zoom is never disabled** — `maximum-scale` and `user-scalable=no` are banned.
- `min-h-dvh`, never `100vh` (mobile browser chrome makes `vh` wrong).
- Safe-area insets respected on the sticky header and any bottom-anchored element: `padding-bottom: env(safe-area-inset-bottom)`.
- **Touch targets ≥44×44px** with ≥8px separation. In dense tables this sets a `min-height: 44px` on any row containing an interactive element, even where the visual design is tighter.
- No hover-only affordances. Every hover reveal has a tap or focus equivalent.
- Navigation: drawer below `md`. Bottom nav is **not** used — this is a reference site people arrive at from search and leave, not an app they live in.

---

## 5. The data-table problem

This is the hardest UX problem on the site and the one most worth getting right: comparing many gateways across many fee dimensions on a 375px screen.

### 5.1 One table in the DOM, two presentations

TECHNICAL §5.6 requires pricing to be a real semantic `<table>` — Google and the AI crawlers parse tables well and parse div-grids and canvas badly. But a 6-column table is unusable at 375px.

**Resolved with CSS alone: one `<table>` in the HTML, restyled into stacked cards below `md`.** No duplicated DOM, no JS, no viewport detection, SSR-safe, zero CLS.

```html
<table class="data-table">
  <caption class="sr-only">Razorpay charges by payment method, verified 19 Nov 2026</caption>
  <thead>
    <tr><th scope="col">Method</th><th scope="col">Rate</th><th scope="col">Effective with GST</th></tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">UPI</th>
      <td data-label="Rate">2.00%</td>
      <td data-label="Effective with GST">2.36%</td>
    </tr>
  </tbody>
</table>
```

```css
/* Mobile: each row becomes a card, each cell labelled by its header */
@media (max-width: 767px) {
  .data-table thead { position: absolute; width: 1px; height: 1px;
                      overflow: hidden; clip-path: inset(50%); }  /* sr-only, not display:none */
  .data-table tr { display: block; border: 1px solid var(--c-border);
                   border-radius: var(--radius-md); margin-block-end: var(--sp-3);
                   padding: var(--sp-3); background: var(--c-surface); }
  .data-table td { display: flex; justify-content: space-between; gap: var(--sp-4);
                   min-height: 44px; align-items: center; border: 0; }
  .data-table td::before { content: attr(data-label); font: var(--t-caption);
                           color: var(--c-fg-subtle); }
  .data-table th[scope="row"] { display: block; font-weight: 600;
                                margin-block-end: var(--sp-2); }
}
```

`thead` is hidden with the screen-reader-safe clip technique, **not `display: none`**, so the header text stays in the accessibility tree and in the crawled HTML.

### 5.2 Horizontal scroll, where it is unavoidable

Some tables (`/compare/` with 4+ gateways) genuinely need horizontal scroll at `md`–`lg`. Three rules:

1. **The row label column is sticky.** Scrolling right without the row label is useless.
   ```css
   .data-table th[scope="row"] { position: sticky; inset-inline-start: 0;
                                 background: var(--c-surface); z-index: 1; }
   ```
2. **The scroll must be visible.** A right-edge gradient mask signals more content and disappears at scroll end. Without it users do not know data exists off-screen.
3. **The most important column is never off-screen at rest.** Total cost sits immediately after the sticky label, not at the far right.

The scroll container gets `tabindex="0"`, `role="region"` and an `aria-label`, so it is keyboard-scrollable — a scroll container that only responds to touch and trackpad is an accessibility failure.

### 5.3 Ranked results: cards, not a table

For the calculator's output, the mobile view is **not** a restyled table. The user's question there is not "compare 10 gateways cell by cell", it is "which is cheapest for me" — so mobile gets a ranked list, which is genuinely better than a table rather than a concession to width:

```
┌─────────────────────────────────┐
│ 1  Cashfree          ₹1,24,800  │   ← rank, name, annual cost (--t-data-lg)
│    cheapest for your volume     │
│    ▸ See breakdown              │   ← <details>, no JS needed
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 2  Razorpay          ₹1,31,400  │
│    +₹6,600/yr vs cheapest       │   ← delta is the useful number
│    ▸ See breakdown              │
└─────────────────────────────────┘
```

Expansion uses native `<details>`/`<summary>` — progressive disclosure that works with zero JavaScript, is keyboard-accessible for free, and keeps the breakdown in the crawled HTML.

At `md`+ the same data renders as a sortable table. Both come from one data structure; the component picks the presentation.

### 5.4 Table accessibility baseline

Every data table ships with: a `<caption>` (visually hidden where the heading already says it), `<th scope="col">` on every column header, `<th scope="row">` on the row label, `tabular-nums`, zebra striping via `--c-surface-sunk` at ≥10 rows, and a visible focus ring on every interactive cell.

**Colour is never the only signal.** A fee increase shows an arrow glyph and a sign, not just red text.

---

## 6. Common component library

Lives in `common/ui/` per TECHNICAL §2 — these know nothing about pricing or gateways. Feature-aware components live in their module's `components/` folder.

### 6.1 Primitives (`common/ui/`)

| Component | Notes |
|---|---|
| `Button` | Variants: `primary` (navy), `accent` (blue, CTA only), `ghost`, `danger`. Sizes `sm`/`md`/`lg`, all ≥44px tall on touch. Loading state replaces label with spinner, width locked to prevent shift. |
| `Link` | Internal (`next/link`) vs external (adds an icon + `rel`). External sources get `data-source="true"` for analytics. |
| `Table` | The §5.1 engine. Props: `columns`, `rows`, `caption`, `stickyRowHeader`, `mobileMode: 'cards' \| 'scroll'`. |
| `Badge` | `neutral` / `fresh` / `warn` / `danger` / `info`. Text + optional dot. Never colour-only. |
| `Callout` | `info` / `warn` / `danger` / `note`. Icon + heading + body. Used for caveats and disclaimers. |
| `Disclosure` | Native `<details>` wrapper with consistent chevron and focus styling. |
| `Tabs` | Keyboard-navigable (arrow keys, `role="tablist"`). **URL-synced** via a path segment, never `useState` alone — a tab must be linkable and crawlable. |
| `StatTile` | Large figure + label + optional delta. `--t-data-lg` mono. |
| `Breadcrumbs` | Rendered HTML + emits `BreadcrumbList` JSON-LD from the same data (TECHNICAL §5.5). |
| `TOCRail` | §4.3. Sticky list ≥1280px, `<details>` below. Generated from page headings. |
| `Field` | Label (always visible, never placeholder-only), input, helper text, inline error below the field. |
| `Slider` | Calculator method-mix input. Keyboard + visible numeric value; paired with a number input for precision. |
| `Skeleton` | Matches final content dimensions exactly. Used only on client-fetched tool results. |
| `Icon` | Inline SVG from a local 20-icon set (Lucide subset). No icon library dependency, no emoji. |
| `VisuallyHidden` | The clip-path technique, not `display:none`. |

### 6.2 Layout (`common/ui/layout/`)

`Lane` (§4.2 wrapper, prop `size`), `Stack` / `Row` (gap-based flex), `Grid` (responsive columns), `Section` (vertical rhythm + optional heading), `Divider`, `StickyHeader` (safe-area aware).

---

## 7. Signature components

These five carry the brand. They are the visible difference between us and a vendor blog, and they should be built first.

### 7.1 `<VerifiedAt>` — the most important component on the site

Our entire differentiator is that our numbers are dated and sourced. **This appears on every data surface**, and its consistency is what makes the claim credible.

```
●  Verified 19 Nov 2026  ·  Source: Razorpay rate card ↗
```

- A filled dot coloured by age: `--c-fresh` under 30 days, `--c-warn` 30–60, `--c-danger` over 60.
- Age thresholds come from `common/config` (TECHNICAL §4.2) — the UI never hardcodes them.
- Variants: `inline` (next to a figure), `block` (under an `h1`), `compact` (table footer).
- Over 60 days it adds visible text — *"this figure may be out of date"*. **Admitting staleness builds more trust than hiding it**, and it is honest.
- The dot is accompanied by text in every variant. Never colour alone.

### 7.2 `<FeeRate>` — showing what a fee actually costs

Every competitor prints "2%". The number a merchant actually pays is 2.36%. Showing both, always, is a small product insight encoded as a component:

```
2.00%
+18% GST → 2.36% effective
```

- Primary figure in `--t-data` mono; the GST line in `--t-caption`.
- Handles the shapes real pricing takes: `percent`, `percent + flat`, `flat only`, `tiered by band`, `zero`.
- A tiered rate (UPI above ₹2,000) renders its bands as a nested definition list, never flattened to a single misleading number.
- `title`/`aria-label` carries the full expression for screen readers.

### 7.3 `<StatusBanner>` — the MDR tracker's answer-first block

One unambiguous current-state block at the top of `/upi/mdr-tracker/`. The taxonomy maps directly to `regulatory_events.status`:

| Status | Token | Reads as |
|---|---|---|
| `in_effect` | `--c-danger` | "This is live and you are being charged" |
| `scheduled` | `--c-warn` | "This is coming on a known date" |
| `deferred` | `--c-info` | "Proposed, postponed, no date" ← the current UPI MDR state |
| `proposed` | `--c-fg-muted` | "Under discussion" |
| `withdrawn` | `--c-fg-subtle` | "Dead" |

Structure: status pill, then a one-sentence plain-language answer, then the as-of date, then a source link. **The answer is readable without scrolling, on a 320px screen.** This block is what gets screenshotted and quoted, so it must stand alone.

### 7.4 `<RankedResult>` — the calculator's output

§5.3. Rank number, gateway name, annual cost as the dominant figure, delta versus cheapest, `<details>` breakdown, then the partner CTA **after** the data.

The delta is the designed insight: "+₹6,600/yr vs cheapest" is far more actionable than two absolute numbers the reader has to subtract themselves.

### 7.5 `<ChangeEntry>` — the changelog row

```
12 Nov 2026   Cashfree  ·  UPI rate   1.95% → 2.00%   ↑
```

Old value struck through, new value emphasised, direction glyph (not colour alone), date, source link. Renders on gateway pages, `/data/changelog/`, and the MDR timeline. **This component is the public proof that we maintain the dataset** — it should be prominent, not buried.

---

## 8. Page section plans

The governing principle, applied to every template: **answer first, evidence second, action third.** A visitor arriving from search has one question. Answer it above the fold, prove it below, then offer the next step. Never make them scroll past a marketing block to reach the number they came for.

### 8.1 Home — the calculator *is* the hero

A conventional marketing hero would be wrong here. The visitor's question is "what will payments cost me?", so the tool answers it immediately. This also makes the LCP element server-rendered text rather than an image.

| # | Section | Rationale |
|---|---|---|
| 1 | One-line positioning + `VerifiedAt` summary ("pricing for 10 gateways, all verified this month") | Establishes what this is in one line. No hero image, no gradient. |
| 2 | **Calculator: inputs + default ranked results** | Above the fold. Server-rendered with defaults so it works instantly and crawls (TECHNICAL §5.1). |
| 3 | **UPI MDR status strip** | Live, topical, high-anxiety question. Links to the tracker. |
| 4 | Gateway grid — name, headline rate, `VerifiedAt` | Entry point to `/charges/*`. Scannable, dense. |
| 5 | "How we verify" — 3 steps + methodology link | Trust, placed after the visitor has seen we have real data. |
| 6 | Recent changes (`ChangeEntry` × 5) | Proof of maintenance. The thing no competitor can fake. |

### 8.2 `/charges/[gateway]/`

| # | Section |
|---|---|
| 1 | `h1` + `VerifiedAt` (block variant) + "jump to" TOC |
| 2 | **The fee table** — every method, `FeeRate` showing GST-effective rates |
| 3 | Fixed costs — setup, annual maintenance, monthly. Called out because this is what the "cheapest rate" framing hides. |
| 4 | Active promos with explicit expiry dates |
| 5 | **"What you are not charged"** — often the real answer, and nobody publishes it |
| 6 | Settlement + chargeback terms |
| 7 | This gateway's changelog |
| 8 | Comparisons: "Razorpay vs …" links |
| 9 | Calculator CTA, preselected to this gateway |
| 10 | Sources — every figure's primary link |

### 8.3 `/compare/[a]-vs-[b]/`

| # | Section |
|---|---|
| 1 | `h1` + both `VerifiedAt` badges |
| 2 | **Computed verdict** — "Cashfree is cheaper above ₹3.2L/month, Razorpay below it." The crossover point is the answer; it leads. |
| 3 | Cost at three volumes (₹50k / ₹5L / ₹50L) — tabbed on mobile, three columns at `lg` |
| 4 | Full side-by-side fee table (sticky row labels, §5.2) |
| 5 | Feature differences — **differences only**, no matching rows. Identical rows are noise. |
| 6 | Both changelogs, interleaved by date |
| 7 | Calculator CTA with both preselected |

### 8.4 `/calculator/`

Mobile: inputs → results, stacked, results scroll into view on change. Desktop ≥1280px: sticky input panel left, live results right (§4.3).

| # | Section |
|---|---|
| 1 | Three inputs: monthly volume, method mix, business type. Sensible defaults pre-filled — **never an empty state.** |
| 2 | `RankedResult` list, cheapest first |
| 3 | Assumptions used, stated plainly (GST, settlement, promos included or not) |
| 4 | "Why fixed fees matter" — explains the non-obvious result |
| 5 | Methodology link + `VerifiedAt` for the underlying dataset |

### 8.5 `/upi/mdr-tracker/`

| # | Section |
|---|---|
| 1 | **`StatusBanner`** — the current answer, readable at 320px without scrolling |
| 2 | "What this means for you" — volume input → exposure if it lands |
| 3 | Affected / unaffected table by transaction type and value band |
| 4 | **Timeline** — every announcement and deferral, each dated and sourced, newest first |
| 5 | Email capture: "get notified when this changes" |
| 6 | Related: UPI limits, UPI charges |

### 8.6 Guides and tools

**Guide:** `h1` → `VerifiedAt` → TL;DR answer in ≤3 sentences → TOC → body (`lane-prose`, 68ch) → related → sources. The TL;DR is mandatory; it serves the reader, AI Overview extraction (BUILD-PLAN §5.8), and the first-100-words rule.

**Tool:** the tool itself first, zero preamble. Explanation, API note and related tools below it. Someone searching "IFSC lookup" wants the input field, not an essay.

---

## 9. Accessibility baseline

WCAG 2.2 AA, treated as a build requirement rather than an audit item. This is a YMYL finance site; some users are reading it with screen readers and some are reading it on a cracked phone in sunlight.

- **Contrast:** 4.5:1 body text, 3:1 large text and UI boundaries. Every token pair in §2.1–2.2 was computed, not estimated, and the measured ratios are in the comments. All text pairs pass; the lowest is `--c-fg-subtle` at 4.6:1 light / 5.5:1 dark.
- **Border tokens are not interchangeable.** `--c-border` (1.2:1) and `--c-border-strong` (1.4:1) are *decorative* separators and are legal only where the border is not the sole indicator of a control. Any input, select, checkbox or button outline whose boundary is conveyed by its border must use **`--c-border-control`** (3.0:1 light / 3.2:1 dark), which is the only border token that satisfies WCAG 1.4.11. A lint rule flags `--c-border` inside `Field`, `Slider` and `Button`.
- **Focus:** a 2px `--c-ring` outline with 2px offset on every interactive element. `outline: none` without a replacement is banned by lint.
- **Keyboard:** full operability. Scroll containers are focusable (§5.2); the theme toggle, tabs, sliders and disclosures are all keyboard-driven.
- **Headings:** one `h1`, no skipped levels — asserted in CI alongside the SSR checks (TECHNICAL §5.1).
- **Forms:** visible labels always, errors inline next to the field *and* summarised at the top of the form, `aria-describedby` wiring helper and error text.
- **Motion:** `prefers-reduced-motion` honoured globally (§2.5).
- **Zoom:** usable at 200% zoom and at 320px width with no horizontal scroll or clipped content.
- **Never colour alone:** every status uses a glyph or text as well.
- **Live regions:** calculator results use `aria-live="polite"` so a screen-reader user hears the ranking update.

---

## 10. Ad slot layout integration

Implementing TECHNICAL §6 visually. Ads exist on informational pages only and must never compromise the data presentation.

- Reserved boxes carry a `1px dashed var(--c-border)` placeholder in development so unsold space is visible during layout work, and nothing in production.
- Slot spacing: `--sp-6` above and below, so an ad never looks like part of the content.
- A `--t-caption` "Advertisement" label sits above every slot. Required for disclosure and it stops ads reading as editorial.
- **`sidebar-sticky` only renders at ≥1280px** and only on page types whose policy allows it. Below that the sidebar does not exist, so the slot is not emitted at all.
- Layout rules restated as design constraints: never between a heading and its table; never adjacent to a partner CTA; never above the fold.
- Dark mode: ad creatives are mostly light and will glare on a dark page. Slots get a `--c-surface` backing panel with `--radius-md` so they read as a contained block rather than a bright hole.

---

## 11. Implementation notes

- **Tailwind** with the §2 tokens mapped into `theme.extend`, so utilities resolve to CSS variables and dark mode needs no `dark:` variant duplication for colour.
- Token source of truth: `src/styles/tokens.css`. Tailwind consumes it; it does not redefine it.
- **Stylelint rule banning raw hex** in components (`declaration-property-value-disallowed-list`).
- Components are Server Components unless interactive. `Tabs`, `Slider`, theme toggle and the calculator are the only expected `'use client'` boundaries.
- Visual regression via Playwright screenshots on the four key templates × light/dark × 375/1440 (TECHNICAL §8).

---

## 12. Open decisions

1. **Wordmark.** Default is type-only: `onlinepayment.in` set in IBM Plex Sans 600 with `.in` in `--c-accent`. Cheap, honest, needs no designer. Replace if you commission a mark.
2. **Accent colour.** Navy + `#0369A1` trust blue is safe and tests well, but it is the most common palette in fintech. A more distinctive accent (deep teal, or a signal green) would differentiate at the cost of some conventional-trust signalling. Easily changed — it is two tokens.
3. **Hindi.** Font choice already supports it at no cost (§3.1). Whether to ship it stays a Phase 4 decision.
4. **Sortable calculator table on desktop** — client-side sort means a `'use client'` boundary on the results. Worth it, but it is the one place the JS budget gets spent.
