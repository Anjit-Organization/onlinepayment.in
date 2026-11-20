import Link from 'next/link'
import { formatIST, toISODate } from '@/common/datetime'
import { ExternalLink } from '@/common/ui'

/**
 * The public proof that we maintain the dataset — the thing no competitor can
 * fake. Direction is shown with a glyph, never colour alone. UI.md §7.5.
 */
export function ChangeEntry({
  changedAt,
  field,
  oldValue,
  newValue,
  sourceUrl,
  gatewayName,
  gatewaySlug,
}: {
  changedAt: string
  field: string
  oldValue: string
  newValue: string
  sourceUrl?: string
  gatewayName?: string
  gatewaySlug?: string
}) {
  const date = new Date(changedAt)
  const increased = parseFloat(newValue) > parseFloat(oldValue)
  const glyph = Number.isNaN(parseFloat(newValue)) ? '→' : increased ? '↑' : '↓'

  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-default py-3 text-body-sm last:border-0">
      <time dateTime={toISODate(date)} className="font-mono text-caption text-fg-muted">
        {formatIST(date)}
      </time>

      {gatewayName && gatewaySlug && (
        <Link href={`/charges/${gatewaySlug}/`} className="font-medium">
          {gatewayName}
        </Link>
      )}

      <span className="text-fg-muted">{field}</span>

      <span className="inline-flex items-baseline gap-2">
        <s className="font-mono text-fg-subtle">{oldValue}</s>
        <span aria-hidden="true" className="text-fg-subtle">
          {glyph}
        </span>
        <strong className="font-mono font-medium">{newValue}</strong>
        <span className="sr-only">
          changed from {oldValue} to {newValue}
        </span>
      </span>

      {sourceUrl && (
        <span className="text-caption">
          <ExternalLink href={sourceUrl} isSource>
            source
          </ExternalLink>
        </span>
      )}
    </li>
  )
}
