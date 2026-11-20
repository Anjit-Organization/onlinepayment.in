import Link from 'next/link'
import { Breadcrumbs, Callout, Lane } from '@/common/ui'
import { buildMetadata } from '@/modules/seo'

export const metadata = buildMetadata({
  title: 'Disclosure — how we make money',
  description:
    'We earn partner commissions and ad revenue. Exactly how, and the rules we hold ourselves to so it does not affect what we publish.',
  path: '/disclosure/',
})

export default function DisclosurePage() {
  return (
    <Lane size="prose" className="py-10">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Disclosure', href: '/disclosure/' },
        ]}
      />

      <h1 className="mt-4">Disclosure</h1>
      <p className="mt-4 text-body text-fg-muted">
        Some of the providers on this site pay us. That&rsquo;s a real conflict of interest and
        you should factor it in when you read our numbers. Here&rsquo;s exactly how it works.
      </p>

      <div className="prose-body mt-8">
        <h2>How we earn</h2>
        <ul>
          <li>
            <strong>Partner commissions.</strong> Most providers run referral programmes that pay a
            slice of what referred merchants process. Sign up through a link here and we may get a
            recurring cut of your volume. It costs you nothing extra. The rate is the same as
            going direct.
          </li>
          <li>
            <strong>Ads.</strong> They run on guides and free tools. They don&rsquo;t run on the
            pricing pages, the comparisons, or the calculator.
          </li>
          <li>
            <strong>Sponsored slots.</strong> We don&rsquo;t sell these today. If that changes,
            they&rsquo;ll be labelled on the page.
          </li>
        </ul>

        <h2>The rules we hold ourselves to</h2>
        <ol>
          <li>
            <strong>Ranking is never for sale.</strong> The order comes out of the pricing data.
            Commission rates aren&rsquo;t an input to any calculation on this site, and no amount
            of money moves a provider up.
          </li>
          <li>
            <strong>We cover providers who pay us nothing.</strong> CCAvenue and Easebuzz have no
            partner arrangement with us. They&rsquo;re on the site anyway.
          </li>
          <li>
            <strong>Nothing gets buried for money.</strong> We won&rsquo;t remove a figure, soften
            it, or sit on it because a provider asked.
          </li>
          <li>
            <strong>Ads stay away from the numbers.</strong> None on pricing pages, comparisons,
            the calculator, this page, or <Link href="/methodology/">the methodology</Link>.
          </li>
          <li>
            <strong>Partner links don&rsquo;t masquerade as data.</strong> They sit after the
            figures, look like links, and never share space with an ad.
          </li>
        </ol>

        <h2>Check our working</h2>
        <p>
          Every price links to where we got it. If ours disagrees with the provider&rsquo;s own
          page, theirs is right and we have a bug.{' '}
          <Link href="/corrections/">Tell us</Link> and we&rsquo;ll fix it.
        </p>
      </div>

      <Callout tone="note" title="Not financial advice">
        None of this is financial, tax or legal advice. We publish prices and show our assumptions.
        Which provider you pick is your call, and whatever rate you&rsquo;re promised, get it in
        writing first.
      </Callout>
    </Lane>
  )
}
