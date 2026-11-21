import Link from 'next/link'
import { bp, effectiveRate, formatRate } from '@/common/money'
import { Callout, ExternalLink } from '@/common/ui'
import { AdSlot } from '@/modules/ads'
import { getVerifiedGateways } from '@/modules/pricing'
import { buildMetadata } from '@/modules/seo'
import {
  CardChecker,
  IIN_RANGES,
  NETWORK_LABEL,
  ToolShell,
  getBankDataset,
  getTool,
} from '@/modules/tools'

const tool = getTool('bin-lookup')!

/** The three rates a card's identity decides. The point of the whole tool. */
const MDR_METHODS = [
  { method: 'rupay_debit', label: 'RuPay debit', href: '/charges/debit-card/' },
  { method: 'credit_card_domestic', label: 'Domestic credit', href: '/charges/credit-card/' },
  { method: 'international_card', label: 'International card', href: '/charges/international/' },
] as const

export function generateMetadata() {
  return buildMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${tool.slug}/`,
    modified: new Date(tool.lastModified),
  })
}

export default function BinLookupPage() {
  const data = getBankDataset()
  const gateways = getVerifiedGateways()

  /** One row per network, collapsing its ranges into a readable prefix list. */
  const networks = [...new Set(IIN_RANGES.map((r) => r.network))].map((network) => {
    const ranges = IIN_RANGES.filter((r) => r.network === network)
    return {
      network,
      prefixes: ranges
        .map((r) => (r.from === r.to ? String(r.from) : `${r.from}–${r.to}`))
        .join(', '),
      lengths: [...new Set(ranges.flatMap((r) => r.lengths))].sort((a, b) => a - b),
      basis: ranges[0]!.basis,
      sourceLabel: ranges[0]!.sourceLabel,
      sourceUrl: ranges[0]!.sourceUrl,
    }
  })

  return (
    <ToolShell
      tool={tool}
      intro={
        <>
          <p>
            The same ₹2,000 basket costs you nothing, about ₹47, or about ₹71 depending on which
            card paid for it. RuPay debit carries zero MDR by law, domestic credit runs around 2%,
            and an international card is half again as expensive. The first six digits are the only
            signal you get.
          </p>
          <p className="mt-2">
            This identifies the network from published prefix ranges and names the issuing bank
            from {data.counts.iins.toLocaleString('en-IN')} Indian bank IINs &mdash; and is straight
            with you about the cards where that is not possible.
          </p>
        </>
      }
    >
      <CardChecker />

      <section className="mt-12">
        <h2>What a card costs you, by type</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          Across the {gateways.length} providers whose rate cards we have verified. Rates shown with
          18% GST, which is what actually leaves your account.
        </p>

        <div className="mt-4 table-scroll">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              Effective MDR by card type across verified Indian payment gateways
            </caption>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                {MDR_METHODS.map((m) => (
                  <th key={m.method} scope="col">
                    <Link href={m.href}>{m.label}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gateways.map((g) => (
                <tr key={g.slug}>
                  <th scope="row" data-label="Provider">
                    <Link href={`/charges/${g.slug}/`}>{g.displayName}</Link>
                  </th>
                  {MDR_METHODS.map((m) => {
                    const fee = g.fees.find((f) => f.method === m.method)
                    return (
                      <td key={m.method} data-label={m.label} className="font-mono">
                        {!fee || fee.rateBp === null ? (
                          <span className="text-fg-subtle">not published</span>
                        ) : fee.rateBp === 0 ? (
                          <span className="text-fresh">0%</span>
                        ) : (
                          formatRate(effectiveRate(bp(fee.rateBp)))
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-caption text-fg-subtle">
          RuPay debit is 0% because the Finance Act 2019 and the subsequent CBDT circular made MDR
          on RuPay debit and UPI unlawful to charge, not because providers chose to waive it. See{' '}
          <Link href="/upi/mdr-tracker/">the MDR tracker</Link> for where that stands now.
        </p>
      </section>

      <AdSlot id="in-content-1" pageType="tool" />

      <section className="mt-12">
        <h2>Published IIN ranges</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          Longest matching prefix wins, which is why <code>652</code> resolves to RuPay rather than
          Discover even though <code>65</code> is a Discover range. Real overlaps like that exist
          and the tool reports them instead of hiding the second answer.
        </p>

        <div className="mt-4 table-scroll">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">Card network prefix ranges, lengths and sources</caption>
            <thead>
              <tr>
                <th scope="col">Network</th>
                <th scope="col">Prefixes</th>
                <th scope="col">Length</th>
                <th scope="col">Where the range comes from</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((n) => (
                <tr key={n.network}>
                  <th scope="row" data-label="Network">
                    {NETWORK_LABEL[n.network]}
                  </th>
                  <td data-label="Prefixes" className="font-mono text-caption">
                    {n.prefixes}
                  </td>
                  <td data-label="Length" className="font-mono">
                    {n.lengths.join(', ')}
                  </td>
                  <td data-label="Where the range comes from" className="text-caption">
                    {n.basis === 'published' ? (
                      n.sourceLabel
                    ) : (
                      <>
                        <ExternalLink href={n.sourceUrl} isSource>
                          Third-party
                        </ExternalLink>{' '}
                        &mdash; {n.sourceLabel}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Callout tone="warn" title="What a BIN cannot tell you">
        <p>
          Every commercial BIN lookup claims to name the issuing bank and country for any card. For
          Visa and Mastercard that is not knowable from published data: both networks allocate
          their issuers&rsquo; BINs from their own ranges and publish none of them, so those sites
          are reselling scraped databases of uncertain accuracy.
        </p>
        <p className="mt-2">
          What we hold is the {data.counts.iins.toLocaleString('en-IN')} IINs allocated to Indian
          banks directly &mdash; the NPCI and ATM-network identifiers that appear on RuPay cards. So
          the bank is nameable for exactly the cards where it matters most to an Indian merchant,
          and not for the rest. A Luhn pass is also only a typo check: it proves the digits are
          self-consistent, never that the card was issued.
        </p>
      </Callout>

      <section className="mt-10">
        <h2>Source</h2>
        <div className="prose-body lane-prose mt-3 !px-0 text-body-sm">
          <p>
            The bank IIN list is release {data.source.release} of the{' '}
            <ExternalLink href={data.source.url} isSource>
              {data.source.dataset}
            </ExternalLink>{' '}
            dataset, published {data.source.releasedAt} under the {data.source.license} licence and
            retrieved {data.retrievedAt}. It is committed to our repository and regenerated by a
            script, so the provenance of every row is reproducible rather than pasted in once.
          </p>
          <p>
            Network prefix ranges come from the ISO/IEC 7812 issuer register and the networks&rsquo;
            own published allocations, except RuPay&rsquo;s, which are attributed in the table above
            because NPCI publishes no public range list.
          </p>
        </div>
      </section>

      <AdSlot id="footer" pageType="tool" />
    </ToolShell>
  )
}
