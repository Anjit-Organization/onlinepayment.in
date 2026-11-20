'use client'
// Client component: needs useActionState for inline feedback. The form still
// submits and the action still runs with JavaScript disabled.

import { useActionState } from 'react'
import { subscribeAction } from '../actions'
import type { SubscribeState } from '../domain/subscribe.schema'

const INITIAL: SubscribeState = { status: 'idle' }

export function SubscribeForm({ topic, source }: { topic: string; source: string }) {
  const [state, formAction, pending] = useActionState(subscribeAction, INITIAL)

  if (state.status === 'ok') {
    return (
      <p className="rounded-md border border-fresh bg-fresh-weak px-4 py-3 text-body-sm text-fresh">
        {state.message}
      </p>
    )
  }

  return (
    <form action={formAction} className="not-prose">
      <input type="hidden" name="topic" value={topic} />
      <input type="hidden" name="source" value={source} />

      {/* Honeypot. Hidden from people and from screen readers, visible to bots. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          {/* Visible label, always — never placeholder-only. UI.md §9 */}
          <label htmlFor="subscribe-email" className="block text-caption text-fg-muted">
            Email address
          </label>
          <input
            id="subscribe-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            aria-describedby={state.status === 'error' ? 'subscribe-error' : undefined}
            aria-invalid={state.status === 'error' || undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-border-control bg-surface px-3 text-body"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 cursor-pointer self-end rounded-md bg-accent px-4 font-medium text-accent-fg disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Notify me'}
        </button>
      </div>

      {/* Error sits next to the field it belongs to. UI.md §9 */}
      {state.status === 'error' && (
        <p id="subscribe-error" role="alert" className="mt-2 text-body-sm text-danger">
          {state.message}
        </p>
      )}

      <p className="mt-2 text-caption text-fg-subtle">
        One email when the UPI MDR position changes. No marketing, and you can unsubscribe from any
        message.
      </p>
    </form>
  )
}
