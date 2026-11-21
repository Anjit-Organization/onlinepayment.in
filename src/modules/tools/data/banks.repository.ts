import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import type { BankDataset } from '../domain/banks'

const SEED = join(process.cwd(), 'data', 'seed', 'banks.json')

/**
 * Validated once per build. Regenerate with scripts/build-bank-seed.mjs.
 *
 * The schema is strict about the source block because the page cites it: if
 * the release tag or date went missing we would be attributing 1,380 rows of
 * someone else's data to nobody, so that is a build failure rather than a
 * blank line in the footer.
 */
const datasetSchema = z.object({
  source: z.object({
    dataset: z.string().min(1),
    release: z.string().min(1),
    releasedAt: z.string().date(),
    license: z.string().min(1),
    url: z.string().url(),
  }),
  retrievedAt: z.string().date(),
  counts: z.object({
    ifscBanks: z.number().int().nonnegative(),
    iins: z.number().int().nonnegative(),
    subletBranches: z.number().int().nonnegative(),
    namesUnavailable: z.number().int().nonnegative(),
  }),
  ifscBanks: z
    .array(
      z.object({
        code: z.string().regex(/^[A-Z]{4}$/),
        name: z.string().min(1),
        type: z.string().nullable(),
        upi: z.boolean().nullable(),
      }),
    )
    .min(1),
  iins: z
    .array(
      z.object({
        iin: z.string().regex(/^\d{6}$/),
        code: z.string().min(1),
        name: z.string().min(1),
        type: z.string().nullable(),
      }),
    )
    .min(1),
})

let cache: BankDataset | undefined

export function getBankDataset(): BankDataset {
  if (cache) return cache
  const raw: unknown = JSON.parse(readFileSync(SEED, 'utf8'))
  const parsed = datasetSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(
      `Invalid data/seed/banks.json:\n${JSON.stringify(parsed.error.issues.slice(0, 5), null, 2)}`,
    )
  }
  cache = parsed.data
  return cache
}

export const getIfscBankCodes = (): Set<string> =>
  new Set(getBankDataset().ifscBanks.map((b) => b.code))
