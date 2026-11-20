import { formatIST, toISODate } from '@/common/datetime'
import { Badge, ExternalLink } from '@/common/ui'
import { STATUS_LABEL, STATUS_TONE, type TimelineEntry } from '../domain/regulatory.schema'

/** Every announcement and deferral, dated and sourced, newest first. */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ol className="m-0 list-none p-0">
      {sorted.map((e) => (
        <li
          key={`${e.date}-${e.headline}`}
          className="border-s-2 border-border-strong ps-4"
          style={{ paddingBlock: 'var(--sp-4)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <time dateTime={toISODate(new Date(e.date))} className="font-mono text-caption text-fg-muted">
              {formatIST(new Date(e.date))}
            </time>
            <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
          </div>

          <h3 className="mt-1">{e.headline}</h3>
          <p className="mt-1 text-body-sm text-fg-muted">{e.detail}</p>
          <p className="mt-2 text-caption">
            <ExternalLink href={e.sourceUrl} isSource>
              {e.sourceName}
            </ExternalLink>
          </p>
        </li>
      ))}
    </ol>
  )
}
