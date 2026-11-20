import Link from 'next/link'
import { formatISTLong } from '@/common/datetime'
import { Breadcrumbs, Callout, Lane } from '@/common/ui'
import { StatusBanner, Timeline, getTracker } from '@/modules/regulatory'
import { buildMetadata, JsonLd } from '@/modules/seo'
import { SITE_URL, subscriptionsEnabled } from '@/common/config'
import { SubscribeForm } from '@/modules/subscribe'

const tracker = getTracker('upi-mdr')

export const metadata = buildMetadata({
  title: 'UPI MDR tracker: is UPI charged?',
  description:
    'Live status of UPI MDR in India: what is proposed, what is deferred, what is actually in effect, and who it affects. Every entry dated and sourced.',
  path: '/upi/mdr-tracker/',
  noindex: tracker.state === 'draft',
  modified: new Date(tracker.asOf),
})

export default function MdrTrackerPage() {
  const t = tracker
  const asOf = new Date(t.asOf)

  return (
    <Lane size="default" className="py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'UPI MDR tracker', href: '/upi/mdr-tracker/' },
        ]}
      />

      <h1 className="mt-4">Is UPI charged for merchants?</h1>

      {/* Answer-first: readable at 320px without scrolling. UI.md §7.3 */}
      <div className="mt-5">
        <StatusBanner status={t.currentStatus} answer={t.currentAnswer} asOf={t.asOf} />
      </div>

      <Callout tone="info" title="Sourced from reporting, not from circulars">
        Every entry below links to the report it came from. None is an NPCI or RBI circular, so
        treat the detail as indicative — the direction and the dates are well attested, the exact
        wording of any final rule is not.
      </Callout>

      <section className="mt-10">
        <h2>Who this affects</h2>
        <div className="table-scroll mt-3">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              Which UPI payment types are affected by the proposed MDR, as of {t.asOf}
            </caption>
            <thead>
              <tr>
                <th scope="col">Payment type</th>
                <th scope="col">Affected?</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {t.whoIsAffected.map((w) => (
                <tr key={w.group}>
                  <th scope="row">{w.group}</th>
                  <td data-label="Affected?">{w.affected}</td>
                  <td data-label="Detail">{w.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2>Timeline</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          Every announcement, deferral and reversal, newest first, each with its source.
        </p>
        <div className="mt-4">
          <Timeline entries={t.timeline} />
        </div>
      </section>

      <section className="mt-10">
        <h2>What it would cost you</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          If the proposed 0.4% charge on merchant payments above ₹2,000 does take effect, it applies
          only to the portion of your UPI volume in transactions above that threshold. On ₹5 lakh a
          month of qualifying volume that is ₹2,000 a month before GST, or ₹2,360 with it.
        </p>
        <p className="mt-3 text-body-sm">
          <Link href="/calculator/">Work out your total cost across gateways</Link>
        </p>
      </section>

      {/* The one asset an algorithm cannot take away. BUILD-PLAN T4. */}
      {subscriptionsEnabled && (
        <section className="mt-10 rounded-lg border border-border-strong bg-surface p-4 md:p-5">
          <h2 className="text-h3">Get notified when this changes</h2>
          <p className="mt-2 text-body-sm text-fg-muted">
            The UPI MDR proposal has already been scheduled once and deferred. We will email you if
            the position moves.
          </p>
          <div className="mt-4 max-w-md">
            <SubscribeForm topic="upi-mdr" source="mdr-tracker" />
          </div>
        </section>
      )}

      <Callout tone="info" title="Why this page exists">
        Most coverage of UPI MDR is a single news article from the week it was announced, never
        updated. The proposal has already been scheduled once and deferred. This page is maintained,
        and it states the date it was last checked.
      </Callout>

      <p className="mt-6 text-caption text-fg-muted">
        Last checked {formatISTLong(asOf)}.{' '}
        <Link href="/methodology/">How we verify</Link> &middot;{' '}
        <Link href="/corrections/">Report an error</Link>
      </p>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Is UPI MDR currently charged to merchants in India?',
              acceptedAnswer: { '@type': 'Answer', text: t.currentAnswer },
            },
            ...t.whoIsAffected.map((w) => ({
              '@type': 'Question',
              name: `Does the proposed UPI MDR apply to ${w.group.toLowerCase()}?`,
              acceptedAnswer: { '@type': 'Answer', text: `${w.affected}. ${w.note}` },
            })),
          ],
          url: `${SITE_URL}/upi/mdr-tracker/`,
          dateModified: asOf.toISOString(),
        }}
      />
    </Lane>
  )
}
