import { formatISTLong, toISODate } from '@/common/datetime'
import { Badge } from '@/common/ui'
import { STATUS_LABEL, STATUS_TONE, type EventStatus } from '../domain/regulatory.schema'

/**
 * The answer-first block. UI.md §7.3.
 *
 * This is what gets screenshotted and quoted, so it must stand alone and be
 * readable at 320px without scrolling.
 */
export function StatusBanner({
  status,
  answer,
  asOf,
}: {
  status: EventStatus
  answer: string
  asOf: string
}) {
  const date = new Date(asOf)
  const tone = STATUS_TONE[status]

  return (
    <section
      aria-label="Current status"
      className="rounded-lg border border-border-strong bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone} dot>
          {STATUS_LABEL[status]}
        </Badge>
        <span className="text-caption text-fg-muted">
          as of{' '}
          <time dateTime={toISODate(date)} className="font-medium">
            {formatISTLong(date)}
          </time>
        </span>
      </div>
      <p className="mt-3 text-body md:text-h3 md:leading-snug">{answer}</p>
    </section>
  )
}
