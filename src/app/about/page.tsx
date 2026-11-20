import { Breadcrumbs, Lane } from '@/common/ui'
import { AUTHOR, SITE_NAME, SITE_URL } from '@/common/config'
import { JsonLd } from '@/modules/seo'
import { buildMetadata } from '@/modules/seo'

export const metadata = buildMetadata({
  title: 'About',
  description:
    'Who runs OnlinePayment.in, why it exists, and what it is not. An independent record of what Indian payment gateways charge.',
  path: '/about/',
})

export default function AboutPage() {
  return (
    <Lane size="prose" className="py-10">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about/' },
        ]}
      />

      <h1 className="mt-4">About</h1>

      <div className="prose-body mt-6">
        <p>
          &ldquo;What will accepting payments cost me?&rdquo; sounds like it should have a short
          answer. In India it doesn&rsquo;t. Most of the pages that try to answer it were written
          by the gateways themselves, which is a bit like asking a shop whether its prices are
          good. This site is our attempt at a straight answer.
        </p>

        <h2>It&rsquo;s a dataset, not a blog</h2>
        <p>
          Comparison articles rot. Someone writes &ldquo;best payment gateway 2026&rdquo; in
          January, a provider changes its pricing in March, and the article sits there being wrong
          for the rest of the year.
        </p>
        <p>
          So the thing we actually maintain is the data. Dated, sourced, versioned, with the old
          values kept. The writing on this site describes that data. It isn&rsquo;t the point of
          the site.
        </p>

        <h2>What we&rsquo;re not</h2>
        <ul>
          <li>A payment gateway, an aggregator, or an RBI-licensed anything.</li>
          <li>Financial advisors. Nothing here is advice.</li>
          <li>Affiliated with or endorsed by any provider on this site.</li>
        </ul>

        <h2>How we make money</h2>
        <p>
          Partner commissions when someone signs up with a provider through us, plus ads on the
          guide pages. That&rsquo;s a conflict of interest and there&rsquo;s no point pretending
          otherwise. <a href="/disclosure/">The disclosure page</a> sets out what we earn and the
          rules we hold ourselves to. Short version: ranking isn&rsquo;t for sale.
        </p>
      </div>

      <section className="mt-10">
        <h2>Who maintains this</h2>
        <p className="mt-2 text-body-sm text-fg-muted">
          <strong className="text-fg">{AUTHOR.name}</strong>, {AUTHOR.role}. Every figure published
          here was checked against the provider&rsquo;s own rate card, or attributed to a named
          third party where no rate card exists.
        </p>
        <p className="mt-3 text-body-sm">
          Corrections and questions:{' '}
          <a href={`mailto:${AUTHOR.email}`}>{AUTHOR.email}</a>
        </p>
      </section>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          url: `${SITE_URL}/about/`,
          publisher: { '@id': `${SITE_URL}/#organization` },
          mainEntity: {
            '@type': 'Person',
            name: AUTHOR.name,
            jobTitle: AUTHOR.role,
            email: AUTHOR.email,
            worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
          },
        }}
      />
    </Lane>
  )
}
