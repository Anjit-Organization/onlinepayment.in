import Link from 'next/link'
import { Badge, Breadcrumbs, Lane } from '@/common/ui'
import { TOOLS } from '@/modules/tools'
import { buildMetadata } from '@/modules/seo'

export function generateMetadata() {
  return buildMetadata({
    title: 'Payments developer tools',
    description:
      'Free tools for Indian payment integrations: webhook signature verifier, card BIN checker, settlement date calculator and IFSC checker. No sign-up.',
    path: '/tools/',
  })
}

export default function ToolsHubPage() {
  return (
    <Lane size="wide" className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Payments developer tools',
            itemListElement: TOOLS.map((t, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: t.h1,
              url: `/tools/${t.slug}/`,
            })),
          }),
        }}
      />

      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Tools', href: '/tools/' },
        ]}
      />

      <h1 className="mt-4">Payments developer tools</h1>
      <p className="mt-3 max-w-[62ch] text-body text-fg-muted">
        Four things that go wrong when you integrate an Indian payment gateway, and the tools to
        work out why. No sign-up, no API key, and nothing to install.
      </p>

      <ul className="mt-8 grid list-none gap-4 p-0 md:grid-cols-2">
        {TOOLS.map((t) => (
          <li
            key={t.slug}
            className="flex flex-col rounded-lg border border-border-default bg-surface p-5"
          >
            <h2 className="text-h3">
              <Link href={`/tools/${t.slug}/`} className="no-underline">
                {t.h1}
              </Link>
            </h2>
            <p className="mt-2 text-body-sm text-fg-muted">{t.blurb}</p>
            <p className="mt-3 flex-1 text-body-sm">
              <span className="text-caption uppercase tracking-wide text-fg-subtle">
                The problem
              </span>
              <br />
              {t.solves}
            </p>
            {t.runsLocally ? (
              <p className="mt-4">
                <Badge tone="fresh" dot>
                  Runs in your browser
                </Badge>
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2>Why these four</h2>
        <div className="prose-body lane-prose mt-3 !px-0 text-body-sm">
          <p>
            They are the questions we could answer properly. A signature either matches or it does
            not, and the arithmetic behind a settlement date is arithmetic — so these give you an
            answer you can check rather than an opinion you have to trust.
          </p>
          <p>
            Three of the four run entirely in your browser. That is not a performance boast: a
            webhook secret is a live credential, and a site that offers to hash yours on its
            server is asking you to trust a promise you cannot verify. Open your network tab while
            you use the verifier and you will see it stay empty.
          </p>
          <p>
            The IFSC checker is the exception, and it says so on the page. Branch addresses come
            from a public dataset we do not maintain, so that half of the tool names its source
            instead of pretending the data is ours.
          </p>
          <p>
            <Link href="/calculator/">The cost calculator</Link> is the other tool here, and the
            one most people come for.
          </p>
        </div>
      </section>
    </Lane>
  )
}
