'use client'

/**
 * Imported from '@/common/ui/field' rather than the '@/common/ui' barrel on
 * purpose. The barrel re-exports Breadcrumbs, which imports @/common/config,
 * which imports zod — so pulling the barrel into a client component shipped
 * 29 KB gzipped of schema validator to the browser to render a text input.
 * Field itself has no dependencies at all.
 */
import { useEffect, useState } from 'react'
import { Field, describedBy, fieldControlClass } from '@/common/ui/field'
import {
  NETWORK_LABEL,
  bankTypeLabel,
  inspectCard,
  luhnCheckDigit,
  type BankIin,
} from '@/modules/tools/client'

/**
 * Network, card type and MDR from a BIN.
 *
 * The number is inspected entirely in the browser. The ONLY thing that leaves
 * the page is the six-digit IIN, sent to our own endpoint to look up the
 * owning bank — and the page says so, because "we don't send anything
 * anywhere" would be a lie by omission and six digits of a card number is
 * still part of a card number. Six digits identify a bank, not a person or an
 * account, which is why the lookup is defensible at all.
 */

const SAMPLES: { label: string; digits: string; note: string }[] = [
  { label: 'Visa test', digits: '4111111111111111', note: 'The industry-standard test number' },
  { label: 'Mastercard test', digits: '5555555555554444', note: 'Standard test number' },
  { label: 'Amex test', digits: '378282246310005', note: '15 digits, not 16' },
  // Constructed, not a real test card: a documented RuPay prefix plus a valid
  // Luhn check digit. Labelled as constructed on the page.
  {
    label: 'RuPay prefix',
    digits: '6072270000000' + '000',
    note: 'A RuPay-range prefix, padded. Shows the zero-MDR path',
  },
]

const LUHN_HINT =
  'Luhn catches typos, nothing more. A number can pass Luhn and never have been issued.'

export function CardChecker() {
  const [raw, setRaw] = useState('')
  const [bank, setBank] = useState<BankIin | null>(null)
  const [bankState, setBankState] = useState<'idle' | 'loading' | 'none' | 'error'>('idle')

  const card = inspectCard(raw)
  const iin6 = card.digits.slice(0, 6)

  useEffect(() => {
    if (iin6.length < 6) {
      setBank(null)
      setBankState('idle')
      return
    }
    let live = true
    setBankState('loading')
    // Trailing slash matters: next.config sets trailingSlash, so the
    // slashless path 308s and every lookup would cost two round trips.
    fetch(`/api/bin/${iin6}/`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { bank: BankIin | null }) => {
        if (!live) return
        setBank(d.bank)
        setBankState(d.bank ? 'idle' : 'none')
      })
      .catch(() => {
        if (!live) return
        setBank(null)
        setBankState('error')
      })
    return () => {
      live = false
    }
  }, [iin6])

  const net = card.network?.range.network ?? null
  const fixed =
    card.luhn === 'fail' && card.digits.length > 1
      ? card.digits.slice(0, -1) + String(luhnCheckDigit(card.digits.slice(0, -1)))
      : null

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start">
      <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
        <h2 className="text-h3">Card number or BIN</h2>
        <div className="mt-4">
          <Field
            id="card"
            label="Number"
            hint="Six digits is enough to identify the network and the bank. Paste the full number only if it is a test card."
            aside={card.digits.length > 0 ? `${card.digits.length} digits` : undefined}
          >
            <input
              id="card"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="4111 11"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              aria-describedby={describedBy('card', { hint: true })}
              className={`${fieldControlClass} font-mono text-data-lg`}
            />
          </Field>
        </div>

        <fieldset className="mt-5 border-0 p-0">
          <legend className="text-body-sm font-medium">Try one</legend>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {SAMPLES.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => setRaw(s.digits)}
                  title={s.note}
                  className="min-h-11 cursor-pointer rounded-md border border-border-control bg-surface px-3 text-body-sm hover:bg-surface-sunk"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-fg-subtle">
            The RuPay sample is constructed from a published prefix, not a real test card.
          </p>
        </fieldset>
      </div>

      <div aria-live="polite" className="grid gap-6">
        <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">What the number says</h2>

          {card.digits.length < 6 ? (
            <p className="mt-2 text-body-sm text-fg-subtle">
              Enter at least six digits. Fewer than that cannot identify a network.
            </p>
          ) : (
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-caption text-fg-subtle">Network</dt>
                <dd className="m-0 text-data-lg">
                  {net ? NETWORK_LABEL[net] : 'Not recognised'}
                </dd>
                {card.network ? (
                  <p className="mt-1 text-caption text-fg-subtle">
                    Matched prefix {card.network.range.from}
                    {card.network.range.from !== card.network.range.to
                      ? `–${card.network.range.to}`
                      : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-caption text-fg-subtle">
                    No published range covers this prefix. Networks do not publish every
                    allocation, so this is not proof the card is invalid.
                  </p>
                )}
              </div>

              <div>
                <dt className="text-caption text-fg-subtle">Luhn check</dt>
                <dd className="m-0 text-data-lg">
                  {card.luhn === 'pass' ? 'Passes' : card.luhn === 'fail' ? 'Fails' : 'Too short'}
                </dd>
                {fixed ? (
                  <p className="mt-1 text-caption text-fg-subtle">
                    Last digit should be{' '}
                    <span className="font-mono">{fixed.slice(-1)}</span> for the rest to check out.
                  </p>
                ) : (
                  <p className="mt-1 text-caption text-fg-subtle">{LUHN_HINT}</p>
                )}
              </div>

              <div>
                <dt className="text-caption text-fg-subtle">Length</dt>
                <dd className="m-0 text-data-lg">
                  {card.lengthOk === null
                    ? '—'
                    : card.lengthOk
                      ? 'Valid for this network'
                      : `Unexpected (${card.expectedLengths.join(' or ')} expected)`}
                </dd>
              </div>

              <div>
                <dt className="text-caption text-fg-subtle">Issued in India only</dt>
                <dd className="m-0 text-data-lg">
                  {card.domesticOnly === null ? '—' : card.domesticOnly ? 'Yes' : 'Not necessarily'}
                </dd>
                {card.domesticOnly === false ? (
                  <p className="mt-1 text-caption text-fg-subtle">
                    This network issues worldwide. Whether this card is domestic decides whether
                    you pay around 2% or around 3%, and the number alone cannot tell you.
                  </p>
                ) : null}
              </div>
            </dl>
          )}

          {card.ambiguous && card.network ? (
            <p className="mt-4 rounded-md border-s-[3px] border-warn bg-warn-weak px-3 py-2 text-body-sm">
              This prefix also falls inside{' '}
              {card.network.alsoMatched.map((r) => NETWORK_LABEL[r.network]).join(', ')}. We took the
              longest matching prefix, which is the standard rule, but overlapping ranges are real
              and a payment processor may resolve it differently.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
          <h2 className="text-h3">Issuing bank</h2>
          {iin6.length < 6 ? (
            <p className="mt-2 text-body-sm text-fg-subtle">Needs six digits.</p>
          ) : bank ? (
            <>
              <p className="mt-2 text-data-lg">{bank.name}</p>
              <p className="mt-1 text-body-sm text-fg-muted">
                {bankTypeLabel(bank.type) ?? 'Bank'} · IIN {bank.iin}
              </p>
            </>
          ) : bankState === 'loading' ? (
            <p className="mt-2 text-body-sm text-fg-subtle">Looking up {iin6}…</p>
          ) : bankState === 'error' ? (
            <p className="mt-2 text-body-sm text-danger">
              The lookup failed. Everything above still works — it is computed here in the page.
            </p>
          ) : (
            <p className="mt-2 text-body-sm text-fg-muted">
              Not in our list. We hold IINs allocated directly to Indian banks, which in practice
              means RuPay and ATM cards. Visa and Mastercard allocate their issuers&rsquo; BINs from
              their own ranges and publish none of them, so for those cards the bank is not
              knowable from the number. Any site that tells you otherwise is guessing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
