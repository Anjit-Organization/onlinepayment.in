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
import {
  SIG_SCHEMES,
  buildSigningString,
  computeSignature,
  signaturesMatch,
  type SigScheme,
} from '@/modules/tools/client'

/**
 * THE SECRET NEVER LEAVES THE PAGE.
 *
 * Every field here is local state, the hashing is crypto.subtle in the
 * browser, and there is no form action, no fetch and no analytics event
 * carrying any of it. That is a deliberate product decision: a merchant's
 * webhook secret is a live credential, and a site that offers to hash it
 * server-side is asking to become a breach. It is also the only honest way to
 * ship this tool, because we cannot ask people to trust a promise they cannot
 * check — so there is nothing to trust: open the network tab and it stays empty.
 *
 * The highest-value output is not the verdict, it is THE ASSEMBLED STRING.
 * Nearly every signature mismatch is a wrong string rather than wrong crypto,
 * and no provider's documentation shows you the string.
 */

const MONO = 'font-mono text-body-sm'

/** Make the invisible visible: delimiters, newlines and trailing whitespace. */
function AnnotatedString({ value }: { value: string }) {
  if (value.length === 0) {
    return <p className="text-body-sm text-fg-subtle">Fill in the fields to see the string.</p>
  }
  return (
    <pre
      className={`${MONO} overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border-default bg-surface-sunk p-3`}
    >
      {value.split('').map((ch, i) =>
        ch === '|' ? (
          <span key={i} className="rounded-sm bg-warn-weak px-px font-bold text-warn">
            |
          </span>
        ) : ch === '\n' ? (
          <span key={i}>
            <span className="text-fg-subtle">\n</span>
            {'\n'}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </pre>
  )
}

export function WebhookVerifier() {
  const [schemeId, setSchemeId] = useState<string>(SIG_SCHEMES[0]!.id)
  /** Values are keyed per scheme, so switching provider does not lose work. */
  const [values, setValues] = useState<Record<string, Record<string, string>>>({})
  const [received, setReceived] = useState('')
  const [computed, setComputed] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)

  const scheme: SigScheme = useMemo(
    () => SIG_SCHEMES.find((s) => s.id === schemeId) ?? SIG_SCHEMES[0]!,
    [schemeId],
  )
  const current = values[schemeId] ?? {}
  const signingString = useMemo(() => buildSigningString(scheme, current), [scheme, current])

  const set = (field: string, v: string) =>
    setValues((prev) => ({ ...prev, [schemeId]: { ...(prev[schemeId] ?? {}), [field]: v } }))

  /** Required fields are the ones not marked optional. */
  const ready = scheme.fields.every((f) => f.optional || (current[f.id] ?? '').length > 0)

  useEffect(() => {
    if (!ready) {
      setComputed('')
      setError(null)
      return
    }
    let live = true
    computeSignature(scheme, current)
      .then((sig) => {
        if (live) {
          setComputed(sig)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!live) return
        setComputed('')
        // crypto.subtle is unavailable outside a secure context. Worth naming,
        // because the symptom is otherwise a silently empty result.
        setError(
          e instanceof Error && /subtle|crypto/i.test(e.message)
            ? 'Web Crypto is unavailable here. It needs a secure context (https or localhost).'
            : 'Could not compute the hash.',
        )
      })
    return () => {
      live = false
    }
  }, [scheme, current, ready])

  const verdict =
    computed.length === 0 || received.trim().length === 0
      ? null
      : signaturesMatch(computed, received, scheme.encoding)

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
      <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
        <h2 className="text-h3">Inputs</h2>

        <div className="mt-4">
          <Field id="scheme" label="What are you verifying?">
            <select
              id="scheme"
              value={schemeId}
              onChange={(e) => setSchemeId(e.target.value)}
              className={fieldControlClass}
            >
              {SIG_SCHEMES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.provider} — {s.verifies}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption">
          <dt className="text-fg-subtle">Algorithm</dt>
          <dd className="m-0 font-mono">
            {scheme.algorithm} → {scheme.encoding}
          </dd>
          <dt className="text-fg-subtle">Header</dt>
          <dd className="m-0 font-mono break-all">{scheme.header}</dd>
        </dl>

        {scheme.fields.some((f) => f.kind === 'secret') ? (
          <label className="mt-4 flex min-h-11 items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={showSecrets}
              onChange={(e) => setShowSecrets(e.target.checked)}
              className="size-4"
            />
            Show secret values
          </label>
        ) : null}

        <div className="mt-2 grid gap-4">
          {scheme.fields.map((f) => {
            const id = `${schemeId}-${f.id}`
            const hint = f.hint
            return (
              <Field
                key={f.id}
                id={id}
                label={f.label}
                hint={hint}
                aside={f.optional ? 'optional' : undefined}
              >
                {f.kind === 'textarea' ? (
                  <textarea
                    id={id}
                    rows={6}
                    spellCheck={false}
                    value={current[f.id] ?? ''}
                    onChange={(e) => set(f.id, e.target.value)}
                    aria-describedby={describedBy(id, { hint })}
                    className={`${fieldControlClass} ${MONO} py-2`}
                  />
                ) : (
                  <input
                    id={id}
                    type={f.kind === 'secret' && !showSecrets ? 'password' : 'text'}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={f.placeholder}
                    value={current[f.id] ?? ''}
                    onChange={(e) => set(f.id, e.target.value)}
                    aria-describedby={describedBy(id, { hint })}
                    className={`${fieldControlClass} ${f.kind === 'secret' ? MONO : ''}`}
                  />
                )}
              </Field>
            )
          })}
        </div>
      </div>

      <div aria-live="polite">
        <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">The string being signed</h2>
          <p className="mt-1 text-body-sm text-fg-muted">
            This is where the bug almost always is. Pipes are highlighted so you can count them.
          </p>
          <div className="mt-3">
            <AnnotatedString value={signingString} />
          </div>
          {signingString.length > 0 ? (
            <p className="mt-2 text-caption text-fg-subtle">
              {signingString.length} characters
              {signingString !== signingString.trim()
                ? ' — note the leading or trailing whitespace, which is included in the hash'
                : ''}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">Signature</h2>

          {error ? (
            <p className="mt-2 text-body-sm text-danger">{error}</p>
          ) : (
            <>
              <p className="mt-2 text-caption text-fg-subtle">What these inputs should produce</p>
              <pre
                className={`${MONO} mt-1 overflow-x-auto break-all rounded-md border border-border-default bg-surface-sunk p-3`}
              >
                {computed || '—'}
              </pre>

              <div className="mt-4">
                <Field
                  id="received"
                  label={`Signature you received (${scheme.header})`}
                  hint="Paste it to compare. Case is ignored for hex."
                >
                  <input
                    id="received"
                    type="text"
                    spellCheck={false}
                    autoComplete="off"
                    value={received}
                    onChange={(e) => setReceived(e.target.value)}
                    aria-describedby={describedBy('received', { hint: true })}
                    className={`${fieldControlClass} ${MONO}`}
                  />
                </Field>
              </div>

              {verdict === true ? (
                <p className="mt-3 rounded-md border border-fresh bg-fresh-weak px-3 py-2 text-body-sm text-fresh">
                  Match. This payload was signed with this secret.
                </p>
              ) : verdict === false ? (
                <div className="mt-3 rounded-md border border-danger bg-danger-weak px-3 py-2 text-body-sm text-danger">
                  <p className="font-medium">No match.</p>
                  <p className="mt-1">
                    {computed.length !== received.trim().length
                      ? `Lengths differ: ${received.trim().length} received against ${computed.length} expected. A length mismatch usually means the wrong encoding or the wrong algorithm, not the wrong secret.`
                      : 'Same length, different value. Check the string above before you check the secret.'}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
