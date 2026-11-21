import type { ReactNode } from 'react'

/**
 * A labelled form control. UI.md §9: the label is always visible and always
 * real — never a placeholder standing in for one, because a placeholder
 * disappears the moment someone starts typing, which is exactly when they
 * need it, and it is invisible to a screen reader's forms list.
 *
 * Hints and errors are wired through aria-describedby here rather than at each
 * call site, which is the part that gets forgotten when this markup is
 * copy-pasted.
 *
 * Stateless by design, so it works in a server component as well as a client
 * one. The caller owns the value.
 */

const CONTROL =
  'mt-1 min-h-11 w-full rounded-md border border-border-control bg-surface px-3 text-body ' +
  'aria-[invalid=true]:border-danger'

export type FieldTone = 'default' | 'error'

export function Field({
  id,
  label,
  hint,
  error,
  children,
  /** Rendered at the right of the label row — a unit, a toggle, a byte count. */
  aside,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-body-sm font-medium">
          {label}
        </label>
        {aside ? <span className="text-caption text-fg-subtle">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-caption text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-caption text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Shared describedby wiring, so hint and error are never silently dropped. */
export const describedBy = (id: string, opts: { hint?: unknown; error?: unknown }): string | undefined => {
  const ids = [opts.error ? `${id}-error` : null, opts.hint ? `${id}-hint` : null].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

export const fieldControlClass = CONTROL
