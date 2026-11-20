import type { ReactNode } from 'react'

type Tone = 'info' | 'warn' | 'danger' | 'note'

const TONE: Record<Tone, { wrap: string; label: string }> = {
  info: { wrap: 'bg-info-weak border-info', label: 'Note' },
  warn: { wrap: 'bg-warn-weak border-warn', label: 'Caution' },
  danger: { wrap: 'bg-danger-weak border-danger', label: 'Important' },
  note: { wrap: 'bg-surface-sunk border-border-strong', label: 'Note' },
}

export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: Tone
  title?: string
  children: ReactNode
}) {
  const t = TONE[tone]
  return (
    <aside
      className={`${t.wrap} border-s-[3px] rounded-md px-4 py-3`}
      style={{ marginBlock: 'var(--sp-5)' }}
    >
      <p className="text-caption font-semibold uppercase tracking-wide text-fg-muted">
        {title ?? t.label}
      </p>
      <div className="mt-1 text-body-sm">{children}</div>
    </aside>
  )
}
