'use client'

/**
 * Imported from '@/common/ui/field' rather than the '@/common/ui' barrel on
 * purpose. The barrel re-exports Breadcrumbs, which imports @/common/config,
 * which imports zod — so pulling the barrel into a client component shipped
 * 29 KB gzipped of schema validator to the browser to render a text input.
 * Field itself has no dependencies at all.
 */
import { useMemo, useState } from 'react'
import { Field, describedBy, fieldControlClass } from '@/common/ui/field'
import { REASON_LABEL, computeSettlement, toCal, type CalDate } from '@/modules/tools/client'

/**
 * The gap between "T+2" and when the money is actually there.
 *
 * The trail is the point. Telling someone their settlement date is 24 November
 * is not useful on its own; showing them that it skipped a fourth Saturday and
 * a Sunday on the way is, because that is the thing they will otherwise ring
 * their account manager about.
 */

export type GatewayCycle = { slug: string; name: string; cycleDays: number | null }

const IST_LONG = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const fmt = (iso: string): string => {
  const c = toCal(iso)
  if (!c) return iso
  return IST_LONG.format(new Date(Date.UTC(c.y, c.m - 1, c.d)))
}

const shortFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const fmtShort = (iso: string): string => {
  const c = toCal(iso)
  if (!c) return iso
  return shortFmt.format(new Date(Date.UTC(c.y, c.m - 1, c.d)))
}

const CUSTOM = '__custom'

export function SettlementForm({
  gateways,
  /** Server-rendered default so the page has a worked example with no JS. */
  defaultCapture,
}: {
  gateways: GatewayCycle[]
  defaultCapture: string
}) {
  const withCycle = gateways.filter((g) => g.cycleDays !== null)
  const [capture, setCapture] = useState(defaultCapture)
  const [choice, setChoice] = useState<string>(withCycle[0]?.slug ?? CUSTOM)
  const [customDays, setCustomDays] = useState(2)
  const [holidayText, setHolidayText] = useState('')

  const cycleDays =
    choice === CUSTOM ? customDays : (withCycle.find((g) => g.slug === choice)?.cycleDays ?? 2)

  const holidays = useMemo(
    () =>
      holidayText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)),
    [holidayText],
  )

  const badHolidays = useMemo(
    () =>
      holidayText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(s)),
    [holidayText],
  )

  const cal: CalDate | null = toCal(capture)
  const result = useMemo(
    () => (cal ? computeSettlement(cal, cycleDays, holidays) : null),
    [cal, cycleDays, holidays],
  )

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
      <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
        <h2 className="text-h3">Your payment</h2>

        <div className="mt-4 grid gap-4">
          <Field
            id="capture"
            label="Date the payment was captured"
            hint="Captured, not initiated. A payment authorised late on Friday and captured on Saturday starts its clock on Saturday."
            error={cal ? undefined : 'Enter a real date as YYYY-MM-DD.'}
          >
            <input
              id="capture"
              type="date"
              value={capture}
              onChange={(e) => setCapture(e.target.value)}
              aria-invalid={cal ? undefined : true}
              aria-describedby={describedBy('capture', { hint: true, error: !cal })}
              className={fieldControlClass}
            />
          </Field>

          <Field id="gateway" label="Gateway">
            <select
              id="gateway"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className={fieldControlClass}
            >
              {withCycle.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.name} — T+{g.cycleDays}
                </option>
              ))}
              <option value={CUSTOM}>Something else</option>
            </select>
          </Field>

          {choice === CUSTOM ? (
            <Field
              id="days"
              label="Cycle"
              hint="Working days, as your agreement states them."
              aside={`T+${customDays}`}
            >
              <input
                id="days"
                type="number"
                min={0}
                max={30}
                value={customDays}
                onChange={(e) =>
                  setCustomDays(Math.max(0, Math.min(30, Number(e.target.value) || 0)))
                }
                aria-describedby={describedBy('days', { hint: true })}
                className={fieldControlClass}
              />
            </Field>
          ) : null}

          <Field
            id="holidays"
            label="Bank holidays in your state"
            hint="One date per line as YYYY-MM-DD. We do not guess these: festival holidays are declared per state and move every year, so a built-in list would be wrong for most people."
            error={
              badHolidays.length > 0
                ? `Ignored, not a date: ${badHolidays.slice(0, 3).join(', ')}`
                : undefined
            }
          >
            <textarea
              id="holidays"
              rows={3}
              spellCheck={false}
              placeholder="2027-03-04"
              value={holidayText}
              onChange={(e) => setHolidayText(e.target.value)}
              aria-describedby={describedBy('holidays', {
                hint: true,
                error: badHolidays.length > 0,
              })}
              className={`${fieldControlClass} py-2 font-mono text-body-sm`}
            />
          </Field>
        </div>
      </div>

      <div aria-live="polite" className="grid gap-6">
        {result ? (
          <>
            <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
              <p className="text-caption uppercase tracking-wide text-fg-subtle">
                Money reaches your account
              </p>
              <p className="mt-1 text-h2">{fmt(result.settlement)}</p>

              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-caption text-fg-subtle">Cycle</dt>
                  <dd className="m-0 text-data-lg">T+{result.cycleDays}</dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Actual wait</dt>
                  <dd className="m-0 text-data-lg">
                    {result.calendarDaysWaited} calendar day
                    {result.calendarDaysWaited === 1 ? '' : 's'}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption text-fg-subtle">Days skipped</dt>
                  <dd className="m-0 text-data-lg">{result.skippedCount}</dd>
                </div>
              </dl>

              {result.calendarDaysWaited > result.cycleDays ? (
                <p className="mt-4 rounded-md border-s-[3px] border-warn bg-warn-weak px-3 py-2 text-body-sm">
                  T+{result.cycleDays} took {result.calendarDaysWaited} calendar days here, because
                  the cycle counts bank working days and {result.skippedCount} day
                  {result.skippedCount === 1 ? '' : 's'} in between{' '}
                  {result.skippedCount === 1 ? 'was not one' : 'were not'}.
                </p>
              ) : null}

              {result.captureOnNonWorkingDay ? (
                <p className="mt-3 text-body-sm text-fg-muted">
                  The capture date itself was a {REASON_LABEL(result.captureOnNonWorkingDay)}. The
                  payment still captures — cards and UPI do not stop at the weekend — but the
                  settlement clock only moves on working days.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
              <h2 className="text-h3">Day by day</h2>
              <p className="mt-1 text-body-sm text-fg-muted">
                Every date between capture and settlement, and why each one counted or did not.
              </p>
              <div className="mt-3 table-scroll">
                <table className="data-table data-table--zebra">
                  <caption className="sr-only">
                    Days from capture to settlement with the reason each was counted or skipped
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Counted</th>
                      <th scope="col">Why</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trail.map((s) => (
                      <tr key={s.date}>
                        <th scope="row" data-label="Date">
                          {fmtShort(s.date)}
                        </th>
                        <td data-label="Counted">
                          {s.workingDayIndex === null ? 'No' : `Working day ${s.workingDayIndex}`}
                        </td>
                        <td data-label="Why">
                          {s.skipped ? REASON_LABEL(s.skipped) : 'Bank working day'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-border-default bg-surface p-4 md:p-5">
            <p className="text-body-sm text-fg-subtle">Enter a capture date to see the result.</p>
          </div>
        )}
      </div>
    </div>
  )
}
