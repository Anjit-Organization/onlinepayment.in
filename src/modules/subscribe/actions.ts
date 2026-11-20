'use server'

import { logger } from '@/common/logger'
import { insertSubscriber } from './data/subscriber.repository'
import { subscribeInput, type SubscribeState } from './domain/subscribe.schema'

/**
 * Crude per-instance rate limit. In a serverless deployment each instance keeps
 * its own window, so this slows abuse rather than stopping it — the real
 * protections are the honeypot, the RLS insert-only policy, and the unique
 * index. A shared limiter belongs in Phase 3 alongside the public API.
 */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > MAX_PER_WINDOW
}

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = subscribeInput.safeParse({
    email: formData.get('email'),
    topic: formData.get('topic'),
    source: formData.get('source') ?? 'unknown',
    website: formData.get('website') ?? '',
  })

  if (!parsed.success) {
    return { status: 'error', message: 'That does not look like a valid email address.' }
  }

  // Honeypot: silently accept so a bot learns nothing from the response.
  if (parsed.data.website) {
    logger.info('subscribe honeypot triggered')
    return { status: 'ok', message: 'Thanks — we will email you when this changes.' }
  }

  if (rateLimited(parsed.data.topic)) {
    return { status: 'error', message: 'Too many attempts. Please try again in a minute.' }
  }

  const result = await insertSubscriber(parsed.data.email, parsed.data.topic, parsed.data.source)

  if (result.ok) {
    return { status: 'ok', message: 'Thanks — we will email you when this changes.' }
  }

  switch (result.error.reason) {
    case 'already_subscribed':
      // Not an error worth surfacing as one.
      return { status: 'ok', message: 'You are already on this list.' }
    case 'storage_unavailable':
      return {
        status: 'error',
        message: 'We could not save that right now. Please try again shortly.',
      }
    default:
      return { status: 'error', message: 'We could not save that. Please try again shortly.' }
  }
}
