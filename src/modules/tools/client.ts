/**
 * Client-safe surface of the tools module: pure logic and types only.
 *
 * Everything here is reachable from a 'use client' component without dragging
 * node:fs into the browser bundle. The crypto in domain/signature uses
 * crypto.subtle, which is a web standard global rather than a node import, so
 * it belongs on this side of the line.
 */
export {
  SIG_SCHEMES,
  buildSigningString,
  computeSignature,
  getScheme,
  signaturesMatch,
  PAYU_DELIMITER_NOTE,
  type HashEncoding,
  type SchemeId,
  type SigField,
  type SigScheme,
} from './domain/signature'

export {
  DOMESTIC_ONLY,
  IIN_RANGES,
  NETWORK_LABEL,
  inspectCard,
  luhnCheckDigit,
  luhnValid,
  matchNetwork,
  normaliseCardNumber,
  type CardInspection,
  type CardNetwork,
  type IinRange,
} from './domain/card'

export {
  FIXED_NATIONAL_HOLIDAYS,
  REASON_LABEL,
  addCalendarDays,
  computeSettlement,
  isWorkingDay,
  nonWorkingReason,
  saturdayOrdinal,
  toCal,
  toISO,
  type CalDate,
  type DayStep,
  type SettlementResult,
} from './domain/settlement'

export {
  IFSC_PATTERN,
  IFSC_PROBLEM_LABEL,
  IFSC_SEGMENTS,
  normaliseIfsc,
  parseIfsc,
  type IfscParse,
} from './domain/ifsc'

export { bankTypeLabel, type BankIin, type IfscBank } from './domain/banks'

export { TOOLS, getTool, toolPath, type Tool, type ToolSlug } from './domain/tools.registry'
