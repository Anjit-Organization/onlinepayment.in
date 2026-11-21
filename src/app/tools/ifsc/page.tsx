import Link from 'next/link'
import { Callout, ExternalLink } from '@/common/ui'
import { AdSlot } from '@/modules/ads'
import { buildMetadata } from '@/modules/seo'
import {
  IFSC_SEGMENTS,
  IfscChecker,
  ToolShell,
  type BankTuple,
  bankTypeLabel,
  getBankDataset,
  getTool,
} from '@/modules/tools'

const tool = getTool('ifsc')!

export function generateMetadata() {
  return buildMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${tool.slug}/`,
    modified: new Date(tool.lastModified),
  })
}

export default function IfscPage() {
  const data = getBankDataset()

  return (
    <ToolShell
      tool={tool}
      intro={
        <>
          <p>
            An IFSC has no check digit. Mistype one character of the branch half and you get another
            perfectly well-formed IFSC &mdash; which is why a format check showing a green tick
            tells you almost nothing, and why money sent to a valid-looking wrong code bounces days
            later rather than being rejected at once.
          </p>
          <p className="mt-2">
            This separates the two questions: is the shape right, which we can answer here and now
            from {data.counts.ifscBanks} bank codes, and does the branch exist, which needs the
            Reserve Bank&rsquo;s branch list.
          </p>
        </>
      }
    >
      <IfscChecker
        banks={data.ifscBanks.map(
          (b): BankTuple => [b.code, b.name, b.type, b.upi === null ? null : b.upi ? 1 : 0],
        )}
      />

      <section className="mt-12">
        <h2>How an IFSC is built</h2>
        <div className="mt-4 table-scroll">
          <table className="data-table">
            <caption className="sr-only">The three parts of an 11-character IFSC code</caption>
            <thead>
              <tr>
                <th scope="col">Position</th>
                <th scope="col">Part</th>
                <th scope="col">Rule</th>
                <th scope="col">Example</th>
              </tr>
            </thead>
            <tbody>
              {IFSC_SEGMENTS.map((s) => (
                <tr key={s.positions}>
                  <th scope="row" data-label="Position" className="font-mono">
                    {s.positions}
                  </th>
                  <td data-label="Part">{s.name}</td>
                  <td data-label="Rule">{s.rule}</td>
                  <td data-label="Example" className="font-mono">
                    {s.example}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-fg-subtle">
          The fifth character being a zero rather than a letter O is the single most common typo,
          and in most fonts the two are nearly identical.
        </p>
      </section>

      <Callout tone="warn" title="Your IFSC may not name your bank">
        <p>
          {data.counts.subletBranches.toLocaleString('en-IN')} branch codes in the current dataset
          are sublet: the branch belongs to a co-operative or regional bank, but its IFSC carries a
          sponsor bank&rsquo;s prefix because the smaller bank clears through the larger one. So an
          IFSC beginning <code>HDFC</code> does not always mean HDFC Bank, and a transfer form that
          auto-fills the bank name from the prefix can be confidently wrong.
        </p>
        <p className="mt-2">
          The branch lookup above resolves this correctly, because it returns the bank the Reserve
          Bank has on record for that specific code rather than inferring it from four letters.
        </p>
      </Callout>

      <AdSlot id="in-content-1" pageType="tool" />

      <section className="mt-12">
        <h2>Bank codes</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          All {data.counts.ifscBanks} four-letter prefixes that appear at the start of an IFSC, with
          the bank each belongs to. {data.counts.namesUnavailable} further prefixes exist in the
          dataset without a usable bank name and are left out rather than shown blank.
        </p>

        <div className="mt-4 table-scroll">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              IFSC bank prefix codes with bank name, type and UPI availability
            </caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Bank</th>
                <th scope="col">Type</th>
                <th scope="col">On UPI</th>
              </tr>
            </thead>
            <tbody>
              {data.ifscBanks.map((b) => (
                <tr key={b.code}>
                  <th scope="row" data-label="Code" className="font-mono">
                    {b.code}
                  </th>
                  <td data-label="Bank">{b.name}</td>
                  <td data-label="Type" className="text-caption">
                    {bankTypeLabel(b.type) ?? '—'}
                  </td>
                  <td data-label="On UPI">{b.upi === null ? '—' : b.upi ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2>Source, and what is ours</h2>
        <div className="prose-body lane-prose mt-3 !px-0 text-body-sm">
          <p>
            The bank codes and names above are release {data.source.release} of the{' '}
            <ExternalLink href={data.source.url} isSource>
              {data.source.dataset}
            </ExternalLink>{' '}
            dataset, published {data.source.releasedAt} under the {data.source.license} licence and
            retrieved {data.retrievedAt}. We commit that file and regenerate it with a script, so
            you can see exactly which release every row came from.
          </p>
          <p>
            The branch lookup calls the same project&rsquo;s public API through our server, which
            means the IFSC you type reaches a third party. We mention that because it is true, and
            because an IFSC identifies a bank branch rather than a person. The structure check never
            leaves your browser.
          </p>
          <p>
            We do not hold the full branch list &mdash; roughly 170,000 rows &mdash; because we
            cannot verify it to the standard we hold our{' '}
            <Link href="/methodology/">pricing data</Link> to. Naming whose data it is beats
            implying it is ours.
          </p>
        </div>
      </section>

      <AdSlot id="footer" pageType="tool" />
    </ToolShell>
  )
}
