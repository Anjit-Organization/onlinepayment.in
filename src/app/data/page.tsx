import Link from 'next/link'
import { AUTHOR, SITE_NAME, SITE_URL } from '@/common/config'
import { Breadcrumbs, Callout, ExternalLink, Lane } from '@/common/ui'
import { CSV_COLUMNS, buildDataset, datasetJsonLd, toCsv } from '@/modules/dataset'
import { getVerifiedGateways } from '@/modules/pricing'
import { JsonLd, buildMetadata } from '@/modules/seo'

/**
 * The dataset's canonical landing page. Google's guidance is explicit that
 * Dataset markup belongs on the page a human lands on, not on the file and not
 * on a listing — so this page carries the JSON-LD and the downloads hang off it.
 *
 * It documents every field in prose as well as serving the data, for the same
 * reason the tool pages carry reference tables: someone searching "payment
 * gateway MDR data India" wants to know what is in the file before they fetch
 * it, and a page that only offers a download link answers nobody.
 */
export function generateMetadata() {
  const ds = buildDataset(getVerifiedGateways(), SITE_URL)
  return buildMetadata({
    title: 'Indian payment gateway pricing dataset (free, CC BY)',
    description: `Free dataset of published charges for ${ds.coverage.providerCount} Indian payment gateways across ${ds.coverage.methods.length} payment methods. JSON and CSV, every row dated and sourced.`,
    path: '/data/',
    modified: new Date(ds.version),
    noindex: ds.coverage.providerCount === 0,
  })
}

/** Rendered in the schema table. Kept next to the columns it documents. */
const FIELD_NOTES: Record<string, string> = {
  provider_slug: 'Stable identifier. Also the last path segment of the provider page.',
  provider_name: 'Trading name, as the provider writes it.',
  payment_method: 'One of a closed set. See the method list below.',
  rate_bp: 'The published rate in basis points. 195 means 1.95%. Empty when the fee is flat-only.',
  rate_percent: 'rate_bp divided by 100. Convenience only — rate_bp is the authoritative figure.',
  effective_rate_bp_incl_gst: 'rate_bp with 18% GST applied. This is what you are billed.',
  effective_rate_percent_incl_gst: 'The same figure as a percentage.',
  flat_fee_paise: 'Per-transaction flat fee in paise. Empty when there is none.',
  min_fee_paise: 'Floor on the fee, in paise.',
  max_fee_paise: 'Cap on the fee, in paise.',
  band_min_paise: 'Lower bound of the transaction-value band this rate applies to.',
  band_max_paise: 'Upper bound of that band. Empty means unbounded.',
  setup_fee_paise: 'One-off onboarding charge. Repeated on every row for the provider.',
  annual_maintenance_paise: 'Annual charge. Repeated on every row for the provider.',
  monthly_fee_paise: 'Monthly charge. Repeated on every row for the provider.',
  settlement_cycle_days: 'The n in T+n, counted in bank working days.',
  verified_at: 'The date this record was last checked against its source.',
  source_kind: 'What kind of document the figure came from.',
  source_url: 'The document itself. Follow it before relying on a figure.',
  page_url: 'Our page for this provider, where the figure is shown in context.',
  note: 'Any caveat the provider attached, or that reading the rate card required.',
}

export default function DataPage() {
  const dataset = buildDataset(getVerifiedGateways(), SITE_URL)
  const csvBytes = new TextEncoder().encode(toCsv(dataset)).length
  const jsonBytes = new TextEncoder().encode(JSON.stringify(dataset, null, 2)).length
  const csvRows = dataset.coverage.feeCount

  return (
    <Lane className="py-8">
      <JsonLd
        data={datasetJsonLd(dataset, {
          siteUrl: SITE_URL,
          creator: AUTHOR.name,
          publisher: SITE_NAME,
        })}
      />

      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Data', href: '/data/' },
        ]}
      />

      <h1 className="mt-4">Indian payment gateway pricing dataset</h1>

      <p className="mt-3 max-w-[65ch] text-body text-fg-muted">
        Every verified figure on this site, in one file. {dataset.coverage.providerCount}{' '}
        providers, {dataset.coverage.methods.length} payment methods,{' '}
        {dataset.coverage.feeCount} rates &mdash; each one carrying the date it was last checked
        and a link to the document it came from. Free, no key, no sign-up, and licensed so you can
        republish it.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/data/pricing.json"
          className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface-sunk px-4 font-medium no-underline"
        >
          pricing.json <span className="ms-2 text-caption text-fg-muted">{kb(jsonBytes)}</span>
        </a>
        <a
          href="/data/pricing.csv"
          className="inline-flex min-h-11 items-center rounded-md border border-border-strong bg-surface-sunk px-4 font-medium no-underline"
        >
          pricing.csv <span className="ms-2 text-caption text-fg-muted">{kb(csvBytes)}</span>
        </a>
      </div>

      <p className="mt-3 text-caption text-fg-muted">
        Version <strong>{dataset.version}</strong> &mdash; the newest verification date in the
        data, not a build timestamp. The bytes only change when a figure does.
      </p>

      <h2 className="mt-10">Licence and how to cite</h2>
      <p className="mt-3 max-w-[65ch]">
        Released under{' '}
        <ExternalLink href={dataset.license.url} isSource>
          {dataset.license.name}
        </ExternalLink>
        . Use it commercially, build on it, redistribute it &mdash; the one condition is credit.
      </p>

      <Callout tone="note" title="Attribution">
        <p>
          <code>
            {SITE_NAME} &mdash; Indian payment gateway pricing dataset, version {dataset.version}.{' '}
            {SITE_URL}/data/ &mdash; CC BY 4.0
          </code>
        </p>
      </Callout>

      <p className="mt-3 max-w-[65ch] text-body-sm text-fg-muted">
        To be exact about what the licence covers: a rate of 2% is a fact, and facts are not
        anyone&rsquo;s property. What is ours is the compilation &mdash; which providers to cover,
        which methods to break out, the GST-inclusive figure worked out for each, and the
        verification date and source pinned to every row. That is what CC BY applies to, and
        credit is all it asks.
      </p>

      <h2 className="mt-10">What is in it</h2>
      <p className="mt-3 max-w-[65ch]">
        The JSON keeps the full structure: fixed costs, settlement cycles, promotional pricing,
        recorded rate changes, and third-party source attributions for providers that publish no
        rate card of their own. The CSV flattens the same data to one row per provider and method
        &mdash; {csvRows} rows and {CSV_COLUMNS.length} columns &mdash; which is the shape a
        spreadsheet wants.
      </p>

      <div className="table-scroll mt-5">
        <table className="data-table data-table--zebra">
          <caption className="sr-only">Columns in pricing.csv, with what each one holds</caption>
          <thead>
            <tr>
              <th scope="col">Column</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {CSV_COLUMNS.map((c) => (
              <tr key={c}>
                <th scope="row">
                  <code>{c}</code>
                </th>
                <td>{FIELD_NOTES[c]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10">Units, and why they are integers</h2>
      <div className="table-scroll mt-5">
        <table className="data-table">
          <caption className="sr-only">Units used in the dataset</caption>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Unit</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(dataset.units).map(([k, v]) => (
              <tr key={k}>
                <th scope="row">
                  <code>{k}</code>
                </th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-[65ch] text-body-sm text-fg-muted">
        No money in this dataset has ever been a float. Rates are basis points and amounts are
        paise, both integers, because 0.1 + 0.2 is not 0.3 and a rounding error in a fee is a
        rounding error in somebody&rsquo;s invoice.
      </p>

      <h2 className="mt-10">Payment methods</h2>
      <div className="table-scroll mt-5">
        <table className="data-table data-table--zebra">
          <caption className="sr-only">The closed set of payment method identifiers</caption>
          <thead>
            <tr>
              <th scope="col">
                <code>payment_method</code>
              </th>
              <th scope="col">Means</th>
            </tr>
          </thead>
          <tbody>
            {dataset.coverage.methods.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  <code>{m.id}</code>
                </th>
                <td>{m.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10">Provenance</h2>
      <p className="mt-3 max-w-[65ch]">
        Nothing here is aggregated from other comparison sites. Each provider&rsquo;s figures were
        read off the document linked below on the date shown.
      </p>
      <div className="table-scroll mt-5">
        <table className="data-table data-table--zebra">
          <caption className="sr-only">Source and verification date for each provider</caption>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">Rates</th>
              <th scope="col">Checked</th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {dataset.providers.map((p) => (
              <tr key={p.slug}>
                <th scope="row">
                  <Link href={`/charges/${p.slug}/`}>{p.displayName}</Link>
                </th>
                <td>{p.fees.length}</td>
                <td>
                  <time dateTime={p.verifiedAt}>{p.verifiedAt}</time>
                </td>
                <td>
                  <ExternalLink href={p.sourceUrl} isSource>
                    {p.sourceKindLabel}
                  </ExternalLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10">What it does not contain</h2>
      <ul className="mt-3 max-w-[65ch] list-disc ps-5">
        <li>
          <strong>Negotiated rates.</strong> Every figure is rate-card pricing. Anyone doing real
          volume pays less than this, and what they pay is not public.
        </li>
        <li className="mt-2">
          <strong>Gateways that publish nothing.</strong> A provider with no public rate card and
          no citable third-party figure is absent rather than estimated.
        </li>
        <li className="mt-2">
          <strong>Rates we could not read unambiguously.</strong> Where a rate card says
          &ldquo;up to 3%&rdquo;, the record carries 3% and a note saying so. Where it says
          nothing at all, the field is empty, not zero.
        </li>
        <li className="mt-2">
          <strong>History before this site existed.</strong> The <code>changes</code> array
          records repricing we have observed ourselves, from{' '}
          <time dateTime={dataset.version}>{dataset.temporalCoverage.split('/')[0]}</time> onward.
        </li>
      </ul>

      <Callout tone="warn" title="Before you rely on a figure">
        <p>{dataset.disclaimer}</p>
      </Callout>

      <h2 className="mt-10">Bank and IFSC data</h2>
      <p className="mt-3 max-w-[65ch]">
        The bank identification data behind our{' '}
        <Link href="/tools/bin-lookup/">BIN checker</Link> and{' '}
        <Link href="/tools/ifsc/">IFSC checker</Link> is not ours and is not part of this dataset.
        It comes from the MIT-licensed{' '}
        <ExternalLink href="https://github.com/razorpay/ifsc" isSource>
          razorpay/ifsc
        </ExternalLink>{' '}
        dataset, and anyone wanting it should take it from the source rather than from us, where it
        will be current.
      </p>

      <h2 className="mt-10">Corrections</h2>
      <p className="mt-3 max-w-[65ch]">
        If a figure is wrong, it is worth more to us to know than to look right.{' '}
        <Link href="/corrections/">How to report it</Link>, or email{' '}
        <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>. Methodology is written up{' '}
        <Link href="/methodology/">here</Link>.
      </p>
    </Lane>
  )
}

/** Byte counts are only ever read as "is this big?", so one decimal is plenty. */
function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}
