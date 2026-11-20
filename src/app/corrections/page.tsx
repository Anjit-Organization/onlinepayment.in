import { Breadcrumbs, Callout, Lane } from '@/common/ui'
import { AUTHOR } from '@/common/config'
import { STALE_ALERT_DAYS } from '@/common/config'
import { buildMetadata } from '@/modules/seo'

export const metadata = buildMetadata({
  title: 'Corrections policy',
  description:
    'How OnlinePayment.in handles errors in published pricing: how to report one, how fast we fix it, and how corrections are recorded on the page.',
  path: '/corrections/',
})

export default function CorrectionsPage() {
  return (
    <Lane size="prose" className="py-10">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Corrections', href: '/corrections/' },
        ]}
      />

      <h1 className="mt-4">Corrections</h1>
      <p className="mt-4 text-body text-fg-muted">
        We publish numbers people make decisions on, which means sooner or later we&rsquo;ll get
        one wrong. Here&rsquo;s what happens then.
      </p>

      <div className="prose-body mt-8">
        <h2>Reporting an error</h2>
        <p>
          Email <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a> with the page, the figure you
          believe is wrong, and the source that shows the correct value. A link to the provider&rsquo;s own page is the most useful thing you can send. If
          you are a provider and we have your pricing wrong, a link to your current rate card is
          enough — we do not need a formal request.
        </p>

        <h2>What we do</h2>
        <ol>
          <li>
            <strong>Verify against the primary source.</strong> Not against the report — against the
            provider&rsquo;s own published rate card, a written quote, or a live dashboard.
          </li>
          <li>
            <strong>Fix it, keep the history.</strong> The wrong value stays in the changelog with
            the date we replaced it. Nothing disappears quietly.
          </li>
          <li>
            <strong>Say so on the page.</strong> A correction notice stays up: what was wrong, what
            it is now, when it changed.
          </li>
          <li>
            <strong>Re-check the rest.</strong> One bad figure usually means others. We go through
            that provider&rsquo;s whole record rather than assume it was a one-off.
          </li>
        </ol>

        <h2>Our targets</h2>
        <ul>
          <li>
            <strong>Acknowledged within 2 working days.</strong>
          </li>
          <li>
            <strong>Corrected within 5 working days</strong> where the primary source is public.
          </li>
          <li>
            <strong>Flagged straight away</strong> if we can&rsquo;t check quickly. The figure gets
            marked disputed while we work on it rather than left sitting there unqualified.
          </li>
        </ul>

        <h2>Distinguishing errors from changes</h2>
        <p>
          A price that was right when we checked it and has since changed is not an error — it is a
          change, and it is recorded as one in the changelog. A figure older than{' '}
          {STALE_ALERT_DAYS} days is labelled as possibly out of date on the page. An error is a
          figure that was wrong at the moment we published it.
        </p>
      </div>

      <Callout tone="note" title="Who handles these">
        Corrections are read and actioned by {AUTHOR.name}, who maintains the dataset. If a figure
        here disagrees with the provider&rsquo;s own page, the provider is right and we have a bug.
      </Callout>
    </Lane>
  )
}
