/**
 * IFSC structure validation.
 *
 * An IFSC is 11 characters: four letters of bank code, a reserved '0', then
 * six characters of branch code. There is NO check digit, which is the single
 * most useful thing to know about it and the thing no other page says. It
 * means a typo in the branch code produces another syntactically perfect IFSC,
 * so structural validation can only ever tell you the shape is right — never
 * that the branch exists.
 *
 * That is why this module reports a graded verdict instead of a boolean.
 */

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/

export const normaliseIfsc = (input: string): string =>
  input.replace(/[\s-]+/g, '').toUpperCase()

export type IfscProblem =
  | { kind: 'empty' }
  | { kind: 'length'; actual: number }
  | { kind: 'bank-code-not-letters'; got: string }
  | { kind: 'fifth-char-not-zero'; got: string }
  | { kind: 'branch-code-charset'; got: string }
  | { kind: 'unknown-bank-code'; got: string }

export type IfscParse = {
  input: string
  normalised: string
  bankCode: string
  branchCode: string
  /** Shape is valid per IFSC_PATTERN. Says nothing about existence. */
  structurallyValid: boolean
  problems: IfscProblem[]
}

/**
 * `knownBankCodes` is optional: structure is checkable offline and always
 * reported, while an unrecognised bank code is a softer signal and only
 * raised when we have the list to compare against.
 */
export function parseIfsc(input: string, knownBankCodes?: ReadonlySet<string>): IfscParse {
  const normalised = normaliseIfsc(input)
  const problems: IfscProblem[] = []

  if (normalised.length === 0) {
    return { input, normalised, bankCode: '', branchCode: '', structurallyValid: false, problems: [{ kind: 'empty' }] }
  }

  if (normalised.length !== 11) problems.push({ kind: 'length', actual: normalised.length })

  const bankCode = normalised.slice(0, 4)
  const fifth = normalised.slice(4, 5)
  const branchCode = normalised.slice(5, 11)

  if (!/^[A-Z]{4}$/.test(bankCode)) problems.push({ kind: 'bank-code-not-letters', got: bankCode })
  if (fifth !== '0') problems.push({ kind: 'fifth-char-not-zero', got: fifth })
  if (normalised.length === 11 && !/^[A-Z0-9]{6}$/.test(branchCode)) {
    problems.push({ kind: 'branch-code-charset', got: branchCode })
  }

  const structurallyValid = IFSC_PATTERN.test(normalised)

  if (structurallyValid && knownBankCodes && !knownBankCodes.has(bankCode)) {
    problems.push({ kind: 'unknown-bank-code', got: bankCode })
  }

  return { input, normalised, bankCode, branchCode, structurallyValid, problems }
}

export const IFSC_PROBLEM_LABEL = (p: IfscProblem): string => {
  switch (p.kind) {
    case 'empty':
      return 'Nothing entered yet.'
    case 'length':
      return `An IFSC is exactly 11 characters. This one has ${p.actual}.`
    case 'bank-code-not-letters':
      return `The first four characters are the bank code and must be letters. Got "${p.got}".`
    case 'fifth-char-not-zero':
      return `The fifth character is always the digit 0. Got "${p.got || '(nothing)'}" — a capital O is the usual culprit.`
    case 'branch-code-charset':
      return `The last six characters are the branch code and must be letters or digits. Got "${p.got}".`
    case 'unknown-bank-code':
      return `"${p.got}" is not a bank code we hold. It may be a newer allocation than our dataset, or a typo.`
  }
}

/** The positional breakdown, for the explainer table on the page. */
export const IFSC_SEGMENTS = [
  {
    positions: '1–4',
    name: 'Bank code',
    rule: 'Four letters identifying the bank',
    example: 'HDFC',
  },
  {
    positions: '5',
    name: 'Reserved',
    rule: "Always the digit zero. Reserved by the Reserve Bank for future use",
    example: '0',
  },
  {
    positions: '6–11',
    name: 'Branch code',
    rule: 'Six letters or digits identifying the branch. No check digit',
    example: '000001',
  },
] as const
