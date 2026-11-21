import Link from 'next/link'
import { Callout, ExternalLink } from '@/common/ui'
import { AdSlot } from '@/modules/ads'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'
import {
  CYCLE_CONFLICTS,
  FIXED_NATIONAL_HOLIDAYS,
  SettlementForm,
  ToolShell,
  getTool,
} from '@/modules/tools'

const tool = getTool('settlement-calculator')!

/**
 * A FIXED default, not today's date.
 *
 * Two reasons. The server-rendered example stays stable, so the page can be
 * cached and asserted on; and this particular Friday is followed by a fourth
 * Saturday, so the default state demonstrates the entire point of the tool
 * before anyone touches a control: a T+1 cycle taking three calendar days.
 */
const DEFAULT_CAPTURE = '2026-11-27'

export function generateMetadata() {
  return buildMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${tool.slug}/`,
    modified: new Date(tool.lastModified),
  })
}

export default function SettlementCalculatorPage() {
  const gateways = getVerifiedGateways()
  const cycles = gateways.map((g) => ({
    slug: g.slug,
    name: g.displayName,
    cycleDays: g.settlementCycleDays,
  }))

  return (
    <ToolShell
      tool={tool}
      intro={
        <>
          <p>
            T+2 does not mean two days. It means two bank working days, and the Reserve
            Bank&rsquo;s weekend rules mean banks are shut on Sundays <em>and</em> on the second and
            fourth Saturday of every month. Capture a payment on the Friday before a fourth
            Saturday and a T+1 cycle takes three calendar days.
          </p>
          <p className="mt-2">
            This counts the working days properly and shows you every day it skipped, so you can
            see where the time went.
          </p>
        </>
      }
    >
      <SettlementForm gateways={cycles} defaultCapture={DEFAULT_CAPTURE} />

      <section className="mt-12">
        <h2>Settlement cycles we have verified</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          From each provider&rsquo;s own published terms. These are standard-plan cycles: a
          negotiated contract or a high-risk vertical can carry a different one, and an instant
          settlement is a paid add-on at every provider that offers it.
        </p>

        <div className="mt-4 table-scroll">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              Published settlement cycle for each verified Indian payment gateway
            </caption>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Cycle</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => {
                const conflict = CYCLE_CONFLICTS.find((x) => x.gatewaySlug === c.slug)
                return (
                  <tr key={c.slug}>
                    <th scope="row" data-label="Provider">
                      <Link href={`/charges/${c.slug}/`}>{c.name}</Link>
                    </th>
                    <td data-label="Cycle" className="font-mono">
                      {c.cycleDays === null ? (
                        <span className="text-fg-subtle">not published</span>
                      ) : (
                        `T+${c.cycleDays}`
                      )}
                    </td>
                    <td data-label="Note" className="text-caption">
                      {conflict
                        ? `Their own pages disagree — see below`
                        : c.cycleDays === null
                          ? 'No cycle stated in their public terms'
                          : 'Working days, not calendar days'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {CYCLE_CONFLICTS.map((c) => (
        <Callout key={c.gatewaySlug} tone="warn" title={`${c.seededLabel} or ${c.alternativeLabel}?`}>
          <p>{c.explanation}</p>
          <p className="mt-2">
            {c.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 ? ' · ' : ''}
                <ExternalLink href={s.url} isSource>
                  {s.label}
                </ExternalLink>
              </span>
            ))}
          </p>
        </Callout>
      ))}

      <AdSlot id="in-content-1" pageType="tool" />

      <section className="mt-12">
        <h2>What counts as a working day</h2>
        <div className="mt-4 table-scroll">
          <table className="data-table">
            <caption className="sr-only">Rules deciding whether a date is a bank working day</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Counts?</th>
                <th scope="col">Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" data-label="Day">
                  Monday to Friday
                </th>
                <td data-label="Counts?">Yes</td>
                <td data-label="Why">Unless it is a declared bank holiday</td>
              </tr>
              <tr>
                <th scope="row" data-label="Day">
                  First, third, fifth Saturday
                </th>
                <td data-label="Counts?">Yes</td>
                <td data-label="Why">Banks work these Saturdays</td>
              </tr>
              <tr>
                <th scope="row" data-label="Day">
                  Second and fourth Saturday
                </th>
                <td data-label="Counts?">No</td>
                <td data-label="Why">Bank holiday across India</td>
              </tr>
              <tr>
                <th scope="row" data-label="Day">
                  Sunday
                </th>
                <td data-label="Counts?">No</td>
                <td data-label="Why">Bank holiday</td>
              </tr>
              <tr>
                <th scope="row" data-label="Day">
                  Declared bank holiday
                </th>
                <td data-label="Counts?">No</td>
                <td data-label="Why">Declared per state under the Negotiable Instruments Act</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-fg-subtle">
          Razorpay states the rule as: working days do not include second and fourth Saturdays,
          Sundays and bank holidays.{' '}
          <ExternalLink href="https://razorpay.com/docs/payments/settlements/faqs/" isSource>
            Settlement FAQs
          </ExternalLink>
        </p>
      </section>

      <section className="mt-12">
        <h2>Holidays this tool knows, and the ones it asks you for</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          Only four bank holidays in India fall on a fixed date every year and are observed in every
          state:
        </p>
        <ul className="mt-3 grid list-none gap-2 p-0 text-body-sm sm:grid-cols-2">
          {FIXED_NATIONAL_HOLIDAYS.map((h) => (
            <li key={h.name} className="rounded-md border border-border-default bg-surface px-3 py-2">
              <span className="font-mono text-caption text-fg-subtle">
                {String(h.d).padStart(2, '0')}/{String(h.m).padStart(2, '0')}
              </span>{' '}
              {h.name}
            </li>
          ))}
        </ul>

        <div className="prose-body lane-prose mt-5 !px-0 text-body-sm">
          <p>
            Everything else moves. Holi, Diwali, Eid, Dussehra and the rest follow lunar calendars,
            and each state declares its own list under the Negotiable Instruments Act &mdash; so a
            bank in Maharashtra and a bank in Tamil Nadu close on different days. Gandhi Jayanti is
            the same date everywhere; Gudi Padwa is not.
          </p>
          <p>
            We could ship a festival calendar. It would be wrong for most users on day one, because
            it would have to pick a state, and wrong for everyone within a year, while looking
            every bit as authoritative as the parts that are right. So the tool takes your
            state&rsquo;s holidays as input instead. Your bank publishes its list; the{' '}
            <ExternalLink
              href="https://www.rbi.org.in/Scripts/HolidayMatrixDisplay.aspx"
              isSource
            >
              Reserve Bank&rsquo;s holiday matrix
            </ExternalLink>{' '}
            is the authority.
          </p>
        </div>
      </section>

      <Callout tone="note" title="What this does not model">
        <p>
          No provider we track publishes a capture cut-off time, so this works in whole days. If
          your payment captures at 11:55pm the provider may well treat it as the next day&rsquo;s
          transaction, which pushes everything one working day out. The calculator also assumes your
          account is in good standing: a risk hold, a pending KYC item or a reserve can delay a
          settlement past any cycle, and none of that is visible from outside.
        </p>
      </Callout>

      <section className="mt-10">
        <h2>Related</h2>
        <ul className="mt-3 grid list-none gap-2 p-0 text-body-sm">
          <li>
            <Link href="/calculator/">What those payments cost you</Link> &mdash; the fees, rather
            than the timing.
          </li>
          <li>
            <Link href="/charges/">Published charges by provider</Link>
          </li>
        </ul>
      </section>

      <AdSlot id="footer" pageType="tool" />
    </ToolShell>
  )
}
