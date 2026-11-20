import { STALE_ALERT_DAYS, STALE_WARN_DAYS } from '../config'
import { daysSince, formatIST, toISODate } from '../datetime'
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

function tone(ageDays: number): { dot: string; text: string } {
  if (ageDays <= STALE_WARN_DAYS) return { dot: 'bg-fresh', text: 'text-fg-muted' }
  if (ageDays <= STALE_ALERT_DAYS) return { dot: 'bg-warn', text: 'text-fg-muted' }
  return { dot: 'bg-danger', text: 'text-danger' }
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
  const t = isDraft ? { dot: 'bg-danger', text: 'text-danger' } : tone(age)
  const isStale = !isDraft && age > STALE_ALERT_DAYS

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
