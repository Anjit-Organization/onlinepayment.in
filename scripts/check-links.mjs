#!/usr/bin/env node
/**
 * Internal link resolution, asserted against the running site.
 *
 * WHY THIS EXISTS: three links sat in the site footer — /data/changelog/,
 * /upi/limits/ and /upi/rules/ — and every one of them served a 404 from the
 * day it was written. 274 crawlability assertions did not notice, because they
 * all check what a page CONTAINS, and a broken link is a page that contains
 * exactly what it should: an <a href>. Nothing was looking at the other end.
 *
 * A dead internal link is worse than a missing page. It burns crawl budget,
 * leaks whatever authority the linking page had into nothing, and tells a
 * reader who trusted a navigation element that the site does not know its own
 * shape. On a site whose entire proposition is that the figures are checked,
 * that is not a cosmetic defect.
 *
 * WHAT IT ASSERTS
 *   1. Every URL in sitemap.xml returns 200. A 404 in the sitemap is a page
 *      handed to Google that is not there.
 *   2. Every internal <a href> on every one of those pages returns 200.
 *   3. No internal link REDIRECTS. With trailingSlash: true a link to
 *      /charges answers 308 and only then 200, so a "working" link can still
 *      cost every crawler and reader a wasted round trip. Caught as its own
 *      class of failure, because the fix is different: add the slash.
 *   4. Every #fragment points at an id that exists on the target page.
 *      An anchor into a heading that has been renamed lands the reader at the
 *      top of the page with no sign anything went wrong.
 *   5. No page in the sitemap is an orphan. A page nothing links to is one
 *      Google is being asked to rank on the strength of a sitemap entry alone,
 *      with no internal signal that the site considers it worth reaching.
 *   6. Nothing is linked that the sitemap omits, apart from the download files
 *      in NOT_IN_SITEMAP. This is the direction that actually bites: a new page
 *      gets written and linked, and the sitemap gating is forgotten, so it ships
 *      and is never submitted.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *   - External links are never fetched. They would make the check depend on
 *     other people's uptime and rate limits, which turns a blocking CI step
 *     into a coin flip. Link rot in sources is real, but it is a scheduled
 *     job's problem, not a build's.
 *   - /_next/* is skipped: those URLs are the framework's, not the content's.
 *
 * Usage: node scripts/check-links.mjs [baseUrl]
 */

const BASE = (process.argv[2] ?? process.env.CHECK_SSR_BASE ?? 'http://localhost:3000').replace(/\/$/, '')
const ORIGIN = new URL(BASE).origin
const CONCURRENCY = 8

/**
 * Linked on purpose, absent from the sitemap on purpose. The dataset downloads
 * are files, not pages: they carry no canonical, no title and nothing to rank,
 * and the sitemap is for things that can hold a position in results. /data/ is
 * the indexable surface that describes them, and that IS in the sitemap.
 */
const NOT_IN_SITEMAP = ['/data/pricing.json', '/data/pricing.csv']

let failures = 0
const fail = (p, msg) => {
  console.error(`  FAIL  ${p}  ${msg}`)
  failures++
}
const pass = (p, msg) => console.log(`  ok    ${p}  ${msg}`)

/** Run `fn` over `items`, at most CONCURRENCY in flight. */
async function pool(items, fn) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item)
  })
  await Promise.all(workers)
}

/** path -> { status, html, location } for pages we fetched and followed. */
const pageCache = new Map()

async function getPage(path) {
  const hit = pageCache.get(path)
  if (hit) return hit
  let entry
  try {
    // manual: a redirect is a finding, not something to paper over.
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' })
    entry = {
      status: res.status,
      location: res.headers.get('location'),
      html: res.status === 200 ? await res.text() : '',
    }
  } catch (e) {
    entry = { status: 0, location: null, html: '', error: e.message }
  }
  pageCache.set(path, entry)
  return entry
}

console.log(`\ncheck-links against ${BASE}\n`)

// ------------------------------------------------------------- source pages ---
// The sitemap is the authoritative page list. Crawling outward from / instead
// would silently skip any page nothing links to — and an orphan page with a
// broken link on it is still a broken link.
let sitemap
try {
  const res = await fetch(`${BASE}/sitemap.xml`)
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  sitemap = await res.text()
} catch (e) {
  console.error(`  FAIL  /sitemap.xml  unreachable: ${e.message}\n`)
  console.error('check-links FAILED\n')
  process.exit(1)
}

const SOURCES = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => {
    try {
      const u = new URL(m[1].trim())
      return u.pathname + u.search
    } catch {
      return null
    }
  })
  .filter((p) => p !== null)

if (SOURCES.length === 0) {
  console.error('  FAIL  /sitemap.xml  no <loc> entries\n')
  process.exit(1)
}
console.log(`  ..    /sitemap.xml  ${SOURCES.length} pages to crawl`)

// ------------------------------------------------------------------ extract ---
/** target "path?search" -> Map<fragment|'', Set<sourcePath>> */
const links = new Map()
/** Sitemap pages that did not answer 200; their links cannot be read. */
const deadSources = []

const record = (target, frag, source) => {
  let byFrag = links.get(target)
  if (!byFrag) links.set(target, (byFrag = new Map()))
  let sources = byFrag.get(frag)
  if (!sources) byFrag.set(frag, (sources = new Set()))
  sources.add(source)
}

await pool(SOURCES, async (source) => {
  const page = await getPage(source)
  if (page.status !== 200) {
    deadSources.push([source, page.error ? `unreachable: ${page.error}` : `status ${page.status}`])
    return
  }

  let count = 0
  for (const m of page.html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)) {
    const raw = m[1].replaceAll('&amp;', '&').trim()
    if (raw === '') continue

    let u
    try {
      u = new URL(raw, `${BASE}${source}`)
    } catch {
      fail(source, `unparseable href "${raw}"`)
      continue
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue // mailto:, tel:
    if (u.origin !== ORIGIN) continue // external: not our uptime to assert
    if (u.pathname.startsWith('/_next/')) continue

    count++
    record(u.pathname + u.search, decodeURIComponent(u.hash.slice(1)), source)
  }
  if (count === 0) fail(source, 'no internal links at all — orphaned from the site')
  else pass(source, `${count} internal link(s)`)
})

for (const [source, why] of deadSources) {
  fail(source, `in sitemap but ${why}`)
}

// ------------------------------------------------------------------- verify ---
const targets = [...links.keys()]
console.log(`\n  ..    links      ${targets.length} distinct internal targets\n`)

/**
 * Collected so the report groups by DEFECT rather than by occurrence. A broken
 * link in a shared layout appears on every page; printing it 69 times buries
 * the one-off that is sitting underneath it. Each entry here is one thing to fix.
 */
const brokenPaths = []
/** fragment -> pages where it points at nothing. Grouped for the same reason. */
const brokenFrags = new Map()

await pool(targets, async (target) => {
  const page = await getPage(target)
  const byFrag = links.get(target)
  const sources = [...new Set([...byFrag.values()].flatMap((s) => [...s]))]

  if (page.status === 0) {
    brokenPaths.push({ target, why: `unreachable: ${page.error}`, sources })
    return
  }
  if (page.status >= 300 && page.status < 400) {
    // Not a 404, and a browser would survive it. Still a defect: every reader
    // and every crawler pays an extra round trip because a link is written in
    // a form this site does not serve.
    brokenPaths.push({
      target,
      why: `${page.status} redirect to ${page.location ?? '?'} — link to the canonical URL instead`,
      sources,
    })
    return
  }
  if (page.status !== 200) {
    brokenPaths.push({ target, why: `status ${page.status}`, sources })
    return
  }

  // Fragments: the id has to exist on the page the link lands on.
  for (const [frag, fragSources] of byFrag) {
    if (frag === '') continue
    const idRe = new RegExp(`\\s(?:id|name)="${frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`)
    if (!idRe.test(page.html)) {
      let pages = brokenFrags.get(frag)
      if (!pages) brokenFrags.set(frag, (pages = new Set()))
      for (const s of fragSources) pages.add(`${target} (from ${s})`)
    }
  }
})

const where = (list) => {
  const sorted = [...list].sort()
  const shown = sorted.slice(0, 4).join(', ')
  return sorted.length > 4 ? `${shown} +${sorted.length - 4} more` : shown
}

for (const b of brokenPaths.sort((a, b) => a.target.localeCompare(b.target))) {
  fail(b.target, `${b.why}  [linked from ${where(b.sources)}]`)
}
for (const [frag, pages] of [...brokenFrags].sort((a, b) => a[0].localeCompare(b[0]))) {
  fail(`#${frag}`, `no element with that id on ${pages.size} target page(s)  [${where(pages)}]`)
}

console.log('')
pass('links', `${targets.length - brokenPaths.length} of ${targets.length} targets resolve with no redirect`)
const fragCount = [...links.values()].reduce((n, m) => n + [...m.keys()].filter((f) => f !== '').length, 0)
if (fragCount > 0) {
  pass('links', `${fragCount - [...brokenFrags.values()].reduce((n, s) => n + s.size, 0)} of ${fragCount} #fragment(s) point at a real id`)
}

// ------------------------------------------------- sitemap <-> links parity ---
const linkedPaths = new Set(targets.map((t) => t.split('?')[0]))
const sitemapPaths = new Set(SOURCES.map((p) => p.split('?')[0]))

const orphans = [...sitemapPaths].filter((p) => p !== '/' && !linkedPaths.has(p)).sort()
if (orphans.length === 0) pass('links', `no orphans: all ${sitemapPaths.size} sitemap pages are linked`)
else for (const p of orphans) fail(p, 'in the sitemap but nothing links to it — orphan page')

const unlisted = [...linkedPaths].filter((p) => !sitemapPaths.has(p) && !NOT_IN_SITEMAP.includes(p)).sort()
if (unlisted.length === 0) pass('links', 'every linked page is in the sitemap')
else
  for (const p of unlisted)
    fail(p, 'linked internally but missing from the sitemap — it will never be submitted')

console.log('')
if (failures > 0) {
  console.error(`check-links FAILED with ${failures} failure(s)\n`)
  process.exit(1)
}
console.log('check-links passed\n')
