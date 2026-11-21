#!/usr/bin/env node
/**
 * Client-bundle guard. Asserts that nothing server-only reached the browser and
 * that no route is over its JavaScript budget.
 *
 * WHY THIS EXISTS: zod has leaked into the client bundle twice, both times
 * through a barrel re-export, and both times it was found by measuring by hand
 * rather than by anything that could fail a build. The mechanism is quiet by
 * nature — `export { METHOD_LABEL } from './pricing.schema'` looks like it
 * costs nothing, the types erase, the constant is a plain object, and the page
 * still works. Only the byte count tells you that a schema validator is now
 * being downloaded to render the word "UPI".
 *
 * WHY IT READS THE BUILD RATHER THAN A SERVER, unlike check-ssr: dev chunks are
 * unminified, carry the whole module graph under readable names, and are never
 * what ships. Measuring them would be both noisy and beside the point. This
 * reads `next build` output, so it measures the artifact a browser gets.
 *
 * WHAT IT MEASURES: every <script src> in each prerendered page's HTML, gzipped
 * — the actual wire cost, not the build table's own accounting.
 *
 * Usage: npm run build && node scripts/check-bundle.mjs
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, relative } from 'node:path'

const APP_DIR = '.next/server/app'
const STATIC_ROOT = '.next'

/**
 * Per-route ceiling for everything a browser downloads to render the page,
 * gzipped. Set at the documented 200 KB budget. The React + Next floor is
 * ~177 KB, so this leaves ~23 KB for our own code — which is tight on purpose:
 * the leak this guard exists to catch was 30 KB.
 */
const MAX_ROUTE_GZIP_KB = 200

/**
 * Markers for modules that must never cross the server/client boundary. Each is
 * a string that survives minification, because identifiers inside error
 * messages and class names do; a bare module name often does not.
 */
const FORBIDDEN = [
  {
    name: 'zod',
    // $ZodError / $ZodType are zod 4 internals; ZodError is the thrown class.
    pattern: /\$ZodError|\$ZodType|ZodError|_zod\.def/,
    why: 'a schema validator is build-time only. Import values from a module that does not import zod (see src/modules/pricing/domain/pricing.constants.ts).',
  },
  {
    name: 'node:fs',
    pattern: /node:fs|readFileSync/,
    why: 'the seed repositories read files. A client component must import the module\'s /client entry, never its barrel.',
  },
  {
    name: 'drizzle',
    pattern: /drizzle-orm|PgDialect/,
    why: 'the database layer is server-only.',
  },
  {
    name: 'seed data',
    // A gateway slug plus a verification field together mean a whole seed
    // record was serialised into a chunk rather than passed as props.
    pattern: /"verifiedBy":/,
    why: 'a seed record was bundled. Pass the fields a component needs as props.',
  },
]

let failures = 0
const fail = (scope, msg) => {
  console.error(`  FAIL  ${scope}  ${msg}`)
  failures++
}
const pass = (scope, msg) => console.log(`  ok    ${scope}  ${msg}`)

if (!existsSync(APP_DIR)) {
  console.error(`\ncheck-bundle: ${APP_DIR} not found. Run \`npm run build\` first.\n`)
  process.exit(1)
}

/** Every prerendered page in the build output. */
function htmlFiles(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...htmlFiles(p))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const pages = htmlFiles(APP_DIR).sort()
if (pages.length === 0) {
  console.error('\ncheck-bundle: the build output contains no prerendered HTML.\n')
  process.exit(1)
}

console.log(`\ncheck-bundle against ${APP_DIR} (${pages.length} prerendered routes)\n`)

/** chunk path -> { gzip, raw, hits } — each chunk is read and scanned once. */
const chunks = new Map()

function loadChunk(src) {
  const cached = chunks.get(src)
  if (cached) return cached
  const buf = readFileSync(join(STATIC_ROOT, src.replace(/^\/_next/, '')))
  const text = buf.toString('utf8')
  const entry = {
    raw: buf.length,
    gzip: gzipSync(buf).length,
    hits: FORBIDDEN.filter((f) => f.pattern.test(text)),
  }
  chunks.set(src, entry)
  return entry
}

const routeOf = (file) => {
  const r = relative(APP_DIR, file).replace(/\.html$/, '')
  return r === 'index' ? '/' : `/${r}`
}

let worst = { route: '', gzip: 0 }

for (const file of pages) {
  const route = routeOf(file)
  const html = readFileSync(file, 'utf8')
  const srcs = [
    ...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1])),
  ]

  let gzip = 0
  const leaks = []
  for (const src of srcs) {
    const c = loadChunk(src)
    gzip += c.gzip
    for (const h of c.hits) leaks.push({ src, ...h })
  }

  const kb = gzip / 1024
  if (kb > worst.gzip) worst = { route, gzip: kb }

  if (leaks.length === 0) {
    pass(route, `${srcs.length} chunks, no server-only code`)
  } else {
    for (const l of leaks) {
      fail(route, `${l.name} is in the client bundle (${l.src.split('/').pop()}) — ${l.why}`)
    }
  }

  if (kb <= MAX_ROUTE_GZIP_KB) {
    pass(route, `${kb.toFixed(1)} KB gzipped`)
  } else {
    fail(route, `${kb.toFixed(1)} KB gzipped exceeds the ${MAX_ROUTE_GZIP_KB} KB budget`)
  }
}

console.log('')
console.log(`  ${chunks.size} unique client chunks; heaviest route ${worst.route} at ${worst.gzip.toFixed(1)} KB gzipped`)
console.log('')

if (failures > 0) {
  console.error(`check-bundle FAILED with ${failures} failure(s)\n`)
  process.exit(1)
}
console.log('check-bundle passed\n')
