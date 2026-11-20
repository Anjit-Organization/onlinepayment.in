import type { ReactNode } from 'react'

type Tone = 'neutral' | 'fresh' | 'warn' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-sunk text-fg-muted',
  fresh: 'bg-fresh-weak text-fresh',
  warn: 'bg-warn-weak text-warn',
  danger: 'bg-danger-weak text-danger',
  info: 'bg-info-weak text-info',
}

const DOT: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  fresh: 'bg-fresh',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
}

/** Colour is never the only signal — the label text always carries the meaning. */
export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`${TONE[tone]} inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-caption font-medium`}
    >
      {dot && <span aria-hidden="true" className={`${DOT[tone]} size-1.5 rounded-full`} />}
      {children}
    </span>
  )
}
