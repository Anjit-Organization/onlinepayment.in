import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { trackerSchema, type Tracker } from '../domain/regulatory.schema'

const SEED_DIR = join(process.cwd(), 'data', 'seed', 'regulatory')

const cache = new Map<string, Tracker>()

export function getTracker(slug: string): Tracker {
  const hit = cache.get(slug)
  if (hit) return hit

  const raw: unknown = JSON.parse(readFileSync(join(SEED_DIR, `${slug}.json`), 'utf8'))
  const result = trackerSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid tracker seed ${slug}:\n${JSON.stringify(result.error.issues, null, 2)}`)
  }
  cache.set(slug, result.data)
  return result.data
}
