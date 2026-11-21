import Link from 'next/link'
import { Callout, ExternalLink } from '@/common/ui'
import { AdSlot } from '@/modules/ads'
import { buildMetadata } from '@/modules/seo'
import { SIG_SCHEMES, ToolShell, WebhookVerifier, getTool } from '@/modules/tools'

const tool = getTool('webhook-signature-verifier')!

export function generateMetadata() {
  return buildMetadata({
    title: tool.title,
    description: tool.description,
    path: `/tools/${tool.slug}/`,
    modified: new Date(tool.lastModified),
  })
}

export default function WebhookVerifierPage() {
  return (
    <ToolShell
      tool={tool}
      intro={
        <>
          <p>
            A signature mismatch is almost never a problem with the hashing. It is the string being
            hashed — a re-serialised body, a missing pipe, an amount that arrived as{' '}
            <code>1499</code> and got compared as <code>1499.00</code>. This shows you that string,
            which is the one thing no provider&rsquo;s documentation prints.
          </p>
          <p className="mt-2">
            Everything happens in this page. Your secret is never sent anywhere.
          </p>
        </>
      }
    >
      <WebhookVerifier />

      <section className="mt-12">
        <h2>The formulas, as each provider documents them</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          Transcribed from each provider&rsquo;s own page, including the pipes. Four providers, four
          different schemes: two keyed HMACs with different output encodings, one plain salted
          digest, and one that does not sign the payload at all.
        </p>

        <div className="mt-4 table-scroll">
          <table className="data-table data-table--zebra">
            <caption className="sr-only">
              Signature formula, algorithm and header for four Indian payment gateways
            </caption>
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">What is signed</th>
                <th scope="col">Formula</th>
                <th scope="col">Header</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {SIG_SCHEMES.map((s) => (
                <tr key={s.id}>
                  <th scope="row" data-label="Provider">
                    {s.gatewaySlug ? (
                      <Link href={`/charges/${s.gatewaySlug}/`}>{s.provider}</Link>
                    ) : (
                      s.provider
                    )}
                  </th>
                  <td data-label="What is signed">{s.verifies}</td>
                  <td data-label="Formula">
                    <code className="text-caption break-all">{s.formula}</code>
                  </td>
                  <td data-label="Header">
                    <code className="text-caption break-all">{s.header}</code>
                  </td>
                  <td data-label="Source">
                    <ExternalLink href={s.docUrl} isSource>
                      {s.docLabel}
                    </ExternalLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdSlot id="in-content-1" pageType="tool" />

      <section className="mt-12">
        <h2>Why it is not matching</h2>
        <p className="mt-2 max-w-[62ch] text-body-sm text-fg-muted">
          Per provider, the things that actually break. These come from reading the documentation
          against itself, so several of them are places where a provider&rsquo;s own pages disagree.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {SIG_SCHEMES.map((s) => (
            <section key={s.id} className="rounded-lg border border-border-default bg-surface p-5">
              <h3>{s.provider}</h3>
              <p className="mt-1 text-caption text-fg-subtle">
                {s.algorithm} → {s.encoding}
              </p>
              <ul className="mt-3 grid list-none gap-3 p-0 text-body-sm">
                {s.caveats.map((c) => (
                  <li key={c} className="border-s-[3px] border-border-strong ps-3">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <Callout tone="warn" title="One thing a matching signature does not prove">
        <p>
          A signature tells you the payload came from someone holding the secret. It does not tell
          you the payload is new. Replay the same valid request a hundred times and it will verify a
          hundred times, so check the event id or the timestamp and make your handler idempotent.
          Cashfree recommends a five-minute timestamp window but does not enforce one, and
          PhonePe&rsquo;s callback scheme hashes only the credentials, so it says nothing about the
          body at all.
        </p>
      </Callout>

      <section className="mt-10">
        <h2>Where the numbers come from</h2>
        <div className="prose-body lane-prose mt-3 !px-0 text-body-sm">
          <p>
            Each formula above links to the provider&rsquo;s own page. Where their pages contradict
            each other we say so rather than picking the version that makes a tidier table —{' '}
            <Link href="/methodology/">the methodology</Link> explains why that rule exists.
          </p>
        </div>
      </section>

      <AdSlot id="footer" pageType="tool" />
    </ToolShell>
  )
}
