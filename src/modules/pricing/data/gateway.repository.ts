import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { gatewaySeedSchema, type GatewaySeed } from '../domain/pricing.schema'

const SEED_DIR = join(process.cwd(), 'data', 'seed', 'gateways')

/**
 * Loaded and validated once per build. An invalid seed fails the build rather
 * than rendering a wrong price — which is the only failure mode that actually
 * matters here.
 */
let cache: GatewaySeed[] | undefined

function loadAll(): GatewaySeed[] {
  if (cache) return cache

  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'))
  const parsed: GatewaySeed[] = []

  for (const file of files) {
    const raw: unknown = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8'))
    const result = gatewaySeedSchema.safeParse(raw)
    if (!result.success) {
      throw new Error(`Invalid gateway seed ${file}:\n${JSON.stringify(result.error.issues, null, 2)}`)
    }
    parsed.push(result.data)
  }

  parsed.sort((a, b) => a.displayName.localeCompare(b.displayName))
  cache = parsed
  return parsed
}

export const getAllGateways = (): GatewaySeed[] => loadAll()

export const getGatewayBySlug = (slug: string): GatewaySeed | undefined =>
  loadAll().find((g) => g.slug === slug)

/** Only verified records may be indexed or listed in the sitemap. */
export const getVerifiedGateways = (): GatewaySeed[] =>
  loadAll().filter((g) => g.state === 'verified')

export const getGatewaySlugs = (): string[] => loadAll().map((g) => g.slug)

/** Every pricing change across all gateways, newest first. */
export function getRecentChanges(limit = 20) {
  return loadAll()
    .flatMap((g) => g.changes.map((c) => ({ ...c, gatewaySlug: g.slug, gatewayName: g.displayName })))
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    .slice(0, limit)
}

/** Promos that have not expired as of `at`. */
export const activePromos = (g: GatewaySeed, at = new Date()) =>
  g.promos.filter((p) => p.endsAt === null || new Date(p.endsAt) > at)
