import Link from 'next/link'
import { Breadcrumbs, Callout, Lane } from '@/common/ui'
import { STALE_ALERT_DAYS, STALE_BLOCK_DAYS, STALE_WARN_DAYS } from '@/common/config'
import { buildMetadata } from '@/modules/seo'

export const metadata = buildMetadata({
  title: 'How we verify pricing',
  description:
    'How OnlinePayment.in gathers payment gateway pricing, how often it is re-verified, what counts as a primary source, and what we do when sources disagree.',
  path: '/methodology/',
})

export default function MethodologyPage() {
  return (
    <Lane size="prose" className="py-10">
      <Breadcrumbs
        trail={[
          { label: 'Home', href: '/' },
          { label: 'Methodology', href: '/methodology/' },
        ]}
      />

      <h1 className="mt-4">Methodology</h1>
      <p className="mt-4 text-body text-fg-muted">
        Go looking for what a payment gateway costs in India and you&rsquo;ll get ten pages giving
        six different answers. We checked. Comparison sites disagree on headline rates, on annual
        fees, on whether an offer has expired. Several were still advertising deals that ended
        months ago. Here&rsquo;s how we try to do better, and where we fall short.
      </p>

      <div className="prose-body mt-8">
        <h2>What counts as a source</h2>
        <p>Four kinds, best first:</p>
        <ol>
          <li>
            <strong>Official rate card.</strong> A price the provider publishes on its own site.
          </li>
          <li>
            <strong>Written quote.</strong> What their sales team put in writing to a merchant.
          </li>
          <li>
            <strong>Merchant dashboard.</strong> The rate showing inside a live account.
          </li>
          <li>
            <strong>Support confirmation.</strong> Confirmed in writing by their support team.
          </li>
        </ol>
        <p>
          Where a provider publishes none of these, we say so on the page and name whoever we did
          get the number from. CCAvenue is the clearest case. Its pricing link drops you on a
          signup form, so every CCAvenue figure here comes from third parties and the page tells
          you that in a yellow box.
        </p>
        <p>
          What we won&rsquo;t do is launder a third-party number into something that looks official.
        </p>

        <h2>Dating and re-verification</h2>
        <p>
          Every price shows the date we last checked it. Right at the top, not buried in a meta tag
          where nobody looks.
        </p>
        <ul>
          <li>Under {STALE_WARN_DAYS} days, we show it as current.</li>
          <li>
            Between {STALE_WARN_DAYS} and {STALE_ALERT_DAYS} days, it gets flagged for
            re-checking.
          </li>
          <li>
            Past {STALE_ALERT_DAYS} days, the page says outright that the figure may be out of
            date.
          </li>
          <li>
            Past {STALE_BLOCK_DAYS} days, we pull the page from our sitemap until someone
            re-checks it.
          </li>
        </ul>
        <p>
          A confident wrong number does more damage than an honest gap, so we&rsquo;d rather flag
          that something is going stale than let it sit there looking current.
        </p>

        <h2>How we handle changes</h2>
        <p>
          Prices here are never overwritten. When a provider moves a rate we close the old record
          and open a new one, so you can still see what it was, what it became and when. That
          history gets published as a changelog.
        </p>

        <h2>When sources disagree</h2>
        <p>
          Happens more often than you&rsquo;d think, sometimes within one provider&rsquo;s own
          site. When it does we go with the most specific and most recently updated page, link
          both, and note the conflict.
        </p>
        <p>
          A published rate undercut by somebody&rsquo;s written quote is a different problem. We
          print the published rate, because that&rsquo;s the one you can hold them to, and flag
          that negotiated pricing exists. It usually does. Volume is the lever.
        </p>

        <h2>GST is shown separately</h2>
        <p>
          Gateway fees attract 18% GST. We store rates GST-exclusive, the way providers quote them,
          and print the real number next to it. So Razorpay&rsquo;s 2% shows up as 2.36%, which is
          what actually leaves your account. Both are on the page.
        </p>

        <h2>What we don&rsquo;t do</h2>
        <ul>
          <li>Sell ranking. The order is computed from the numbers, every time.</li>
          <li>Take money to change, delay or bury a figure.</li>
          <li>Give financial advice. We publish prices. What you do with them is your call.</li>
        </ul>

        <h2>Where this breaks down</h2>
        <p>
          Enterprise pricing is negotiated behind closed doors and we have no way to see it.
          Promotional rates vanish without warning. Several providers price by business category,
          so a rate that&rsquo;s right for a bookshop may be wrong for a travel agent. We flag
          category-dependent pricing where we know about it, but we won&rsquo;t catch everything.
        </p>
        <p>
          Easebuzz won&rsquo;t publish a rate card at all and quotes per merchant. Take our number
          for them as a rough starting point, nothing firmer.
        </p>
      </div>

      <Callout tone="warn" title="Get it in writing">
        None of this is a quote. It&rsquo;s a starting point for the conversation you&rsquo;re
        about to have with a sales team, so ask them to put your rate in writing before you sign.
        Spotted something wrong here? <Link href="/corrections/">Tell us</Link> and we&rsquo;ll fix
        it in public.
      </Callout>
    </Lane>
  )
}
