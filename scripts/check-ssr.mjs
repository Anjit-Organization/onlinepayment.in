#!/usr/bin/env node
/**
 * Crawlability assertions against raw HTML, with NO JavaScript execution.
 * TECHNICAL.md §5.1.
 *
 * The highest-value test in the repo: it is the difference between a page that
 * ranks and one that is invisible. Blocking in CI.
 *
 * Usage: node scripts/check-ssr.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? process.env.CHECK_SSR_BASE ?? 'http://localhost:3000'

/** @type {{path:string, mustContain:string[], noindex?:boolean}[]} */
const ASSERTIONS = [
  { path: '/', mustContain: ['What Indian payments actually cost', 'How we verify', 'UPI MDR status'] },
  { path: '/methodology/', mustContain: ['Methodology', 'What counts as a source', 'GST'] },
  {
    path: '/about/',
    // YMYL finance needs a named, contactable person behind the figures.
    mustContain: ['About', 'not a payment gateway', 'Anjit Kumar Yadav', 'admin.onlinepayment@gmail.com'],
  },
  { path: '/disclosure/', mustContain: ['Disclosure', 'Ranking is never for sale'] },
  {
    path: '/corrections/',
    mustContain: ['Corrections', 'Reporting an error', 'admin.onlinepayment@gmail.com'],
  },

  // Data-backed pages. Rates must be in the raw HTML, not injected by JS.
  // Hub lists VERIFIED providers only; unverified ones appear in a separate
  // "Not yet verified" section and must not be in the rate table.
  { path: '/charges/', mustContain: ['<table', 'Razorpay', 'CCAvenue', 'Easebuzz'], noindex: false },
  {
    path: '/charges/razorpay/',
    mustContain: [
      'Razorpay charges in India',
      'Verified',
      '<table', '2.36%', 'Fixed costs',
      // Confirmed against razorpay.com/pricing: T+1, not T+2.
      'T+1',
    ],
    noindex: false,
  },
  {
    // CCAvenue publishes no rate card, so every figure is third-party and the
    // page must say so plainly rather than implying the provider published it.
    path: '/charges/ccavenue/',
    mustContain: [
      'Verified',
      'Some figures are not from the provider',
      'no public rate card',
      'CompareCrest',
    ],
    noindex: false,
  },
  {
    path: '/charges/instamojo/',
    // Rate + flat fee must render as a combined expression
    mustContain: ['2.00% + ₹3', 'Verified'],
    noindex: false,
  },
  {
    path: '/calculator/',
    mustContain: [
      'cost calculator', '<table', 'Assumptions', 'Cheapest for this volume',
    ],
    noindex: false,
  },
  {
    path: '/calculator/50-thousand-monthly-upi-heavy/',
    mustContain: ['<table', 'Total first-year cost'],
    noindex: false,
  },
  {
    path: '/compare/',
    mustContain: ['Compare Indian payment gateways', 'Razorpay', 'vs'],
    noindex: false,
  },
  {
    path: '/compare/cashfree-vs-razorpay/',
    mustContain: [
      'Cashfree Payments vs Razorpay',
      // The verdict must be COMPUTED and present in the raw HTML, not produced
      // by client JS. This is the whole value of the page.
      'On published rates',
      'cheaper',
      'Cost at three volumes',
      'Charges side by side',
    ],
    noindex: false,
  },
  {
    path: '/best/',
    mustContain: ['Best payment gateway by business type', 'freelancers'],
    noindex: false,
  },
  {
    path: '/best/small-business/',
    mustContain: [
      'Best payment gateway for a small business',
      'Why this profile ranks differently',
      'Total first-year cost',
    ],
    noindex: false,
  },
  {
    path: '/upi/mdr-tracker/',
    mustContain: [
      'Is UPI charged for merchants', 'deferred', 'Timeline', 'Who this affects',
      // Every claim carries its source.
      'Sourced from reporting', 'PayU',
    ],
    noindex: false,
  },
]

const EXTRA = [
  { path: '/robots.txt', mustContain: ['GPTBot', 'Sitemap:'] },
  { path: '/sitemap.xml', mustContain: ['<urlset', '/methodology/'] },
  { path: '/llms.txt', mustContain: ['Ranking is never sold', 'Corrections:'] },
]

/** Paths that must NOT appear in the sitemap while their data is unverified. */
/** Nothing is withheld from the sitemap now that every figure carries a source. */
const SITEMAP_MUST_EXCLUDE = []

/** Verified pages that MUST now be in the sitemap. */
const SITEMAP_MUST_INCLUDE = [
  '/charges/razorpay/',
  '/charges/payu/',
  '/charges/paytm/',
  '/charges/cashfree/',
  '/charges/ccavenue/',
  '/charges/easebuzz/',
  '/charges/instamojo/',
  '/charges/phonepe/',
  '/compare/cashfree-vs-razorpay/',
  '/best/small-business/',
  '/calculator/',
  '/upi/mdr-tracker/',
]

let failures = 0
const fail = (p, msg) => {
  console.error(`  FAIL  ${p}  ${msg}`)
  failures++
}
const pass = (p, msg) => console.log(`  ok    ${p}  ${msg}`)

const countOccurrences = (hay, needle) => hay.split(needle).length - 1

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' })
  return { status: res.status, html: await res.text() }
}

console.log(`\ncheck-ssr against ${BASE}\n`)

for (const a of ASSERTIONS) {
  let r
  try {
    r = await fetchText(a.path)
  } catch (e) {
    fail(a.path, `unreachable: ${e.message}`)
    continue
  }
  if (r.status !== 200) {
    fail(a.path, `status ${r.status}`)
    continue
  }

  for (const needle of a.mustContain) {
    if (r.html.includes(needle)) pass(a.path, `contains "${needle}"`)
    else fail(a.path, `missing "${needle}" in server-rendered HTML`)
  }

  // Exactly one <h1>
  const h1s = countOccurrences(r.html, '<h1')
  if (h1s === 1) pass(a.path, 'exactly one <h1>')
  else fail(a.path, `expected 1 <h1>, found ${h1s}`)

  // Self-referencing canonical
  if (/<link[^>]+rel="canonical"/.test(r.html)) pass(a.path, 'canonical present')
  else fail(a.path, 'no canonical link')

  // The verification gate: drafted data must never be indexable. TECHNICAL §9.3.
  if (a.noindex === true) {
    if (/<meta name="robots"[^>]*noindex/.test(r.html)) pass(a.path, 'noindex (draft data)')
    else fail(a.path, 'draft data is INDEXABLE — the verification gate is broken')
  }

  // Valid JSON-LD in every block
  const blocks = [...r.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (blocks.length === 0) {
    fail(a.path, 'no JSON-LD found')
  } else {
    let bad = 0
    for (const b of blocks) {
      try {
        JSON.parse(b[1])
      } catch {
        bad++
      }
    }
    if (bad === 0) pass(a.path, `${blocks.length} valid JSON-LD block(s)`)
    else fail(a.path, `${bad} of ${blocks.length} JSON-LD blocks are invalid`)
  }

  // No horizontal-scroll trap from a missing viewport meta
  if (r.html.includes('width=device-width')) pass(a.path, 'viewport meta present')
  else fail(a.path, 'missing viewport meta')

  // Zoom must never be blocked
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/.test(r.html)) {
    fail(a.path, 'zoom is blocked (user-scalable/maximum-scale)')
  } else {
    pass(a.path, 'zoom not blocked')
  }
}

for (const e of EXTRA) {
  let r
  try {
    r = await fetchText(e.path)
  } catch (err) {
    fail(e.path, `unreachable: ${err.message}`)
    continue
  }
  if (r.status !== 200) {
    fail(e.path, `status ${r.status}`)
    continue
  }
  for (const needle of e.mustContain) {
    if (r.html.includes(needle)) pass(e.path, `contains "${needle}"`)
    else fail(e.path, `missing "${needle}"`)
  }
}

// The sitemap is the submission surface: drafted pages must be absent from it,
// so they can never be handed to Google by accident.
try {
  const sm = await fetchText('/sitemap.xml')
  for (const p of SITEMAP_MUST_EXCLUDE) {
    if (sm.html.includes(p)) fail('/sitemap.xml', `lists unverified page ${p}`)
    else pass('/sitemap.xml', `excludes unverified ${p}`)
  }
  for (const p of SITEMAP_MUST_INCLUDE) {
    if (sm.html.includes(p)) pass('/sitemap.xml', `includes verified ${p}`)
    else fail('/sitemap.xml', `MISSING verified page ${p}`)
  }
} catch (e) {
  fail('/sitemap.xml', `unreachable: ${e.message}`)
}

console.log('')
if (failures > 0) {
  console.error(`check-ssr FAILED with ${failures} failure(s)\n`)
  process.exit(1)
}
console.log('check-ssr passed\n')
