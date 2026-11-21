'use client'

/**
 * Imported from '@/common/ui/field' rather than the '@/common/ui' barrel on
 * purpose. The barrel re-exports Breadcrumbs, which imports @/common/config,
 * which imports zod — so pulling the barrel into a client component shipped
 * 29 KB gzipped of schema validator to the browser to render a text input.
 * Field itself has no dependencies at all.
 */
import { useEffect, useMemo, useState } from 'react'
import { Field, describedBy, fieldControlClass } from '@/common/ui/field'
import { IFSC_PROBLEM_LABEL, bankTypeLabel, normaliseIfsc, parseIfsc } from '@/modules/tools/client'

/**
 * The bank list crosses the server/client boundary as tuples, not objects.
 *
 * 242 objects serialise their four keys 242 times, which put 25 KB of repeated
 * JSON keys into the flight payload for no information at all. The tuple costs
 * one comment to explain and nothing to parse.
 */
export type BankTuple = [code: string, name: string, type: string | null, upi: 0 | 1 | null]

/**
 * Two layers, deliberately separated on the page.
 *
 * STRUCTURE is checkable offline and we check it here, instantly, with no
 * network call. An IFSC has no check digit, so this can only ever prove the
 * shape is right — and saying that plainly is the single most useful thing on
 * the page, because every other IFSC site implies a green tick means the
 * branch exists.
 *
 * THE BRANCH only exists in the RBI's branch list, which we do not hold. That
 * lookup goes through our own endpoint to a public dataset, and the page names
 * the dataset rather than passing its answers off as ours.
 */

type Branch = {
  ifsc: string
  bank: string
  branch: string
  address: string
  city: string
  district: string
  state: string
  micr: string | null
  swift: string | null
  upi: boolean | null
  neft: boolean | null
  rtgs: boolean | null
  imps: boolean | null
}

export function IfscChecker({ banks }: { banks: BankTuple[] }) {
  const [raw, setRaw] = useState('')
  const [branch, setBranch] = useState<Branch | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'not-found' | 'error'>('idle')

  const codes = useMemo(() => new Set(banks.map((b) => b[0])), [banks])
  const parsed = parseIfsc(raw, codes)
  const bank = useMemo(
    () => banks.find((b) => b[0] === parsed.bankCode) ?? null,
    [banks, parsed.bankCode],
  )

  const lookupKey = parsed.structurallyValid ? parsed.normalised : ''

  useEffect(() => {
    if (!lookupKey) {
      setBranch(null)
      setState('idle')
      return
    }
    let live = true
    setState('loading')
    // Trailing slash: see the note in card-checker. trailingSlash is on.
    fetch(`/api/ifsc/${lookupKey}/`)
      .then(async (r) => {
        if (r.status === 404) return null
        if (!r.ok) throw new Error(String(r.status))
        return (await r.json()) as Branch
      })
      .then((d) => {
        if (!live) return
        setBranch(d)
        setState(d ? 'idle' : 'not-found')
      })
      .catch(() => {
        if (!live) return
        setBranch(null)
        setState('error')
      })
    return () => {
      live = false
    }
  }, [lookupKey])

  const show = normaliseIfsc(raw)

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
      <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
        <h2 className="text-h3">IFSC code</h2>
        <div className="mt-4">
          <Field
            id="ifsc"
            label="Code"
            hint="Spaces and dashes are ignored, and lowercase is fine."
            aside={show.length > 0 ? `${show.length}/11` : undefined}
          >
            <input
              id="ifsc"
              type="text"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
              placeholder="HDFC0000001"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={show.length > 0 && !parsed.structurallyValid ? true : undefined}
              aria-describedby={describedBy('ifsc', { hint: true })}
              className={`${fieldControlClass} font-mono text-data-lg uppercase`}
            />
          </Field>
        </div>

        {show.length === 11 && parsed.structurallyValid ? (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-body-sm">
            <div className="rounded-md bg-surface-sunk p-2">
              <span className="block text-caption text-fg-subtle">Bank</span>
              {parsed.bankCode}
            </div>
            <div className="rounded-md bg-surface-sunk p-2">
              <span className="block text-caption text-fg-subtle">Reserved</span>0
            </div>
            <div className="rounded-md bg-surface-sunk p-2">
              <span className="block text-caption text-fg-subtle">Branch</span>
              {parsed.branchCode}
            </div>
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="grid gap-6">
        <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">Structure</h2>
          {show.length === 0 ? (
            <p className="mt-2 text-body-sm text-fg-subtle">Enter a code to check it.</p>
          ) : parsed.structurallyValid && parsed.problems.length === 0 ? (
            <>
              <p className="mt-2 rounded-md border border-fresh bg-fresh-weak px-3 py-2 text-body-sm text-fresh">
                Well formed.
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                That means the shape is right and the bank code is one we hold. It does{' '}
                <strong>not</strong> mean the branch exists: an IFSC carries no check digit, so a
                mistyped branch code produces another perfectly well-formed IFSC. Only the branch
                lookup below can tell you whether it is real.
              </p>
            </>
          ) : (
            <ul className="mt-2 grid list-none gap-2 p-0">
              {parsed.problems.map((p) => (
                <li
                  key={p.kind}
                  className={`rounded-md border-s-[3px] px-3 py-2 text-body-sm ${
                    p.kind === 'unknown-bank-code'
                      ? 'border-warn bg-warn-weak'
                      : 'border-danger bg-danger-weak'
                  }`}
                >
                  {IFSC_PROBLEM_LABEL(p)}
                </li>
              ))}
            </ul>
          )}

          {bank ? (
            <div className="mt-4 border-t border-border-default pt-4">
              <p className="text-caption text-fg-subtle">Bank code {bank[0]}</p>
              <p className="mt-1 text-data-lg">{bank[1]}</p>
              <p className="mt-1 text-body-sm text-fg-muted">
                {bankTypeLabel(bank[2]) ?? 'Bank'}
                {bank[3] === 1 ? ' · on UPI' : bank[3] === 0 ? ' · not on UPI' : ''}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">Branch</h2>
          {!parsed.structurallyValid ? (
            <p className="mt-2 text-body-sm text-fg-subtle">
              Needs a well-formed code before there is anything to look up.
            </p>
          ) : state === 'loading' ? (
            <p className="mt-2 text-body-sm text-fg-subtle">Looking up {parsed.normalised}…</p>
          ) : state === 'not-found' ? (
            <p className="mt-2 rounded-md border-s-[3px] border-danger bg-danger-weak px-3 py-2 text-body-sm">
              No branch with this code. The shape is right, so this is almost certainly a typo in
              the branch half — which is exactly the error no amount of format checking can catch.
            </p>
          ) : state === 'error' ? (
            <p className="mt-2 text-body-sm text-danger">
              The branch lookup is unavailable. The structure check above still ran — it happens
              in the page.
            </p>
          ) : branch ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-caption text-fg-subtle">Branch</dt>
                <dd className="m-0 text-data-lg">{branch.branch}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-fg-subtle">Address</dt>
                <dd className="m-0 text-body-sm">{branch.address}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">City</dt>
                <dd className="m-0 text-body">{branch.city}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">State</dt>
                <dd className="m-0 text-body">{branch.state}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">MICR</dt>
                <dd className="m-0 font-mono text-body">{branch.micr ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-caption text-fg-subtle">SWIFT</dt>
                <dd className="m-0 font-mono text-body">{branch.swift ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-caption text-fg-subtle">Supports</dt>
                <dd className="m-0 text-body">
                  {[
                    branch.neft ? 'NEFT' : null,
                    branch.rtgs ? 'RTGS' : null,
                    branch.imps ? 'IMPS' : null,
                    branch.upi ? 'UPI' : null,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Not stated'}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  )
}
