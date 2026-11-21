/**
 * Server-side public surface of the tools module.
 *
 * Client components import from '@/modules/tools/client' instead — the
 * repository below reads the seed with node:fs, and pulling that into a
 * browser bundle panics the build. See the client-boundary note in
 * docs/PROGRESS.md.
 */
export { TOOLS, TOOL_SLUGS, getTool, toolPath, type Tool, type ToolSlug } from './domain/tools.registry'

export { getBankDataset, getIfscBankCodes } from './data/banks.repository'

export {
  BANK_TYPE_LABEL,
  bankTypeLabel,
  findBankByIin,
  findIfscBank,
  type BankDataset,
  type BankIin,
  type BankType,
  type IfscBank,
} from './domain/banks'

export {
  CYCLE_CONFLICTS,
  FIXED_NATIONAL_HOLIDAYS,
  REASON_LABEL,
  computeSettlement,
  conflictFor,
  isWorkingDay,
  nonWorkingReason,
  toCal,
  toISO,
  type CalDate,
  type CycleConflict,
  type SettlementResult,
} from './domain/settlement'

export {
  IIN_RANGES,
  NETWORK_LABEL,
  inspectCard,
  luhnValid,
  type CardNetwork,
  type IinRange,
} from './domain/card'

export {
  IFSC_SEGMENTS,
  IFSC_PATTERN,
  IFSC_PROBLEM_LABEL,
  normaliseIfsc,
  parseIfsc,
  type IfscParse,
} from './domain/ifsc'

export {
  PAYU_DELIMITER_NOTE,
  SIG_SCHEMES,
  buildSigningString,
  getScheme,
  type SigScheme,
} from './domain/signature'

export { ToolShell } from './components/tool-shell'
export { WebhookVerifier } from './components/webhook-verifier'
export { CardChecker } from './components/card-checker'
export { SettlementForm } from './components/settlement-form'
export { IfscChecker, type BankTuple } from './components/ifsc-checker'
