/**
 * Indian bank reference data: IFSC prefixes and bank-allocated card IINs.
 *
 * WHAT THE IIN LIST IS, PRECISELY
 * These are IINs allocated to the banks themselves — the NPCI/NFS identifiers
 * that appear on RuPay and ATM cards a bank issues in its own right. They are
 * NOT the issuer's Visa or Mastercard BINs, which those networks allocate from
 * their own ranges and do not publish. So this list answers "which bank owns
 * this IIN" for exactly the cards where the answer matters most in India — the
 * RuPay ones, which carry zero MDR — and answers nothing for a Visa card.
 *
 * Claiming more than that is what makes the commercial BIN-lookup sites
 * unreliable, so the tool states the limit on the page rather than in a
 * comment nobody reads.
 */

export type BankType =
  | 'PSB' | 'Private' | 'Foreign' | 'SFB' | 'PB' | 'LAB'
  | 'RRB' | 'SCB' | 'DCCB' | 'S-UCB' | 'O-UCB'

/** RBI's own bank categories. Spelled out because the acronyms are opaque. */
export const BANK_TYPE_LABEL: Record<BankType, string> = {
  PSB: 'Public sector bank',
  Private: 'Private sector bank',
  Foreign: 'Foreign bank',
  SFB: 'Small finance bank',
  PB: 'Payments bank',
  LAB: 'Local area bank',
  RRB: 'Regional rural bank',
  SCB: 'State co-operative bank',
  DCCB: 'District central co-operative bank',
  'S-UCB': 'Scheduled urban co-operative bank',
  'O-UCB': 'Urban co-operative bank',
}

export const bankTypeLabel = (t: string | null): string | null =>
  t && t in BANK_TYPE_LABEL ? BANK_TYPE_LABEL[t as BankType] : t

export type IfscBank = { code: string; name: string; type: string | null; upi: boolean | null }
export type BankIin = { iin: string; code: string; name: string; type: string | null }

export type BankDataset = {
  source: { dataset: string; release: string; releasedAt: string; license: string; url: string }
  retrievedAt: string
  counts: { ifscBanks: number; iins: number; subletBranches: number; namesUnavailable: number }
  ifscBanks: IfscBank[]
  iins: BankIin[]
}

/**
 * Longest-prefix IIN lookup. The dataset holds 6-digit IINs, but NPCI has
 * mandated 8-digit IINs for new allocations, so a caller may hand us 8 digits
 * whose first 6 still identify the owning bank.
 */
export function findBankByIin(iins: readonly BankIin[], digits: string): BankIin | null {
  if (digits.length < 6) return null
  const six = digits.slice(0, 6)
  return iins.find((r) => r.iin === six) ?? null
}

export const findIfscBank = (banks: readonly IfscBank[], code: string): IfscBank | null =>
  banks.find((b) => b.code === code.toUpperCase()) ?? null
