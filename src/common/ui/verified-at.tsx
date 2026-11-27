import { daysSince, formatIST, toISODate } from '../datetime'
import { freshnessOfAge, type Freshness } from '../staleness'
import { ExternalLink } from './external-link'

/**
 * The most important component on the site. UI.md §7.1.
 *
 * Our entire differentiator is that our numbers are dated and sourced, so this
 * appears on every data surface and its consistency is what makes the claim
 * credible. Past the alert threshold it says so in words: admitting staleness
 * builds more trust than hiding it.
 */
export type VerifiedAtVariant = 'inline' | 'block' | 'compact'

/**
 * Colour follows the published policy rather than its own copy of the
 * boundaries. `blocked` looks the same as `alert` deliberately: a reader does
 * not care whether we are still submitting the page to Google, only that the
 * figure is old. The distinction matters to the sitemap, not to the badge.
 */
const TONE: Record<Freshness, { dot: string; text: string }> = {
  current: { dot: 'bg-fresh', text: 'text-fg-muted' },
  warn: { dot: 'bg-warn', text: 'text-fg-muted' },
  alert: { dot: 'bg-danger', text: 'text-danger' },
  blocked: { dot: 'bg-danger', text: 'text-danger' },
}

export function VerifiedAt({
  date,
  sourceUrl,
  sourceLabel,
  variant = 'inline',
  state = 'verified',
}: {
  date: Date
  sourceUrl?: string
  sourceLabel?: string
  variant?: VerifiedAtVariant
  /**
   * A draft record has NOT been verified by a person, so it must never say
   * "Verified". Claiming verification we have not done is precisely the failure
   * this site exists to avoid.
   */
  state?: 'draft' | 'verified'
}) {
  const age = daysSince(date)
  const isDraft = state === 'draft'
  const freshness = freshnessOfAge(age)
  const t = isDraft ? { dot: 'bg-danger', text: 'text-danger' } : TONE[freshness]
  const isStale = !isDraft && (freshness === 'alert' || freshness === 'blocked')

  const size = variant === 'block' ? 'text-body-sm' : 'text-caption'

  return (
    <div
      className={`${size} ${t.text} flex flex-wrap items-center gap-x-2 gap-y-1`}
      style={variant === 'block' ? { marginBlock: 'var(--sp-3)' } : undefined}
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`${t.dot} size-2 shrink-0 rounded-full`} />
        <span>
          {isDraft ? 'Drafted' : 'Verified'}{' '}
          <time dateTime={toISODate(date)} className="font-medium">
            {formatIST(date)}
          </time>
          {isDraft && <span className="ms-1">— not verified by a person</span>}
        </span>
      </span>

      {sourceUrl && (
        <>
          <span aria-hidden="true" className="text-fg-subtle">
            ·
          </span>
          <span>
            Source:{' '}
            <ExternalLink href={sourceUrl} isSource>
              {sourceLabel ?? 'official rate card'}
            </ExternalLink>
          </span>
        </>
      )}

      {isStale && (
        <>
          <span aria-hidden="true" className="text-fg-subtle">
            ·
          </span>
          <strong className="font-semibold">this figure may be out of date</strong>
        </>
      )}
    </div>
  )
}
