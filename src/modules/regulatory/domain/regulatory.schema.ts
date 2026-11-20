import { z } from 'zod'

/**
 * Powers /upi/mdr-tracker/ — the flagship page. The UPI MDR question is live and
 * unresolved, which is exactly why a maintained tracker beats an article: the
 * answer keeps changing, so AI Overviews cannot settle it.
 */
export const eventStatus = z.enum([
  'proposed',
  'scheduled',
  'deferred',
  'in_effect',
  'withdrawn',
  'superseded',
])
export type EventStatus = z.infer<typeof eventStatus>

export const STATUS_LABEL: Record<EventStatus, string> = {
  proposed: 'Proposed',
  scheduled: 'Scheduled',
  deferred: 'Deferred',
  in_effect: 'In effect',
  withdrawn: 'Withdrawn',
  superseded: 'Superseded',
}

/** Maps to the semantic tokens. UI.md §7.3. */
export const STATUS_TONE: Record<EventStatus, 'danger' | 'warn' | 'info' | 'neutral'> = {
  in_effect: 'danger',
  scheduled: 'warn',
  deferred: 'info',
  proposed: 'neutral',
  withdrawn: 'neutral',
  superseded: 'neutral',
}

const timelineEntry = z.object({
  date: z.string().date(),
  headline: z.string().min(1),
  detail: z.string().min(1),
  status: eventStatus,
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
})

export const trackerSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** The one-sentence current answer, readable at 320px without scrolling. */
  currentAnswer: z.string().min(1),
  currentStatus: eventStatus,
  asOf: z.string().date(),
  state: z.enum(['draft', 'verified']),
  draftReason: z.string().optional(),
  whoIsAffected: z.array(z.object({ group: z.string(), affected: z.string(), note: z.string() })),
  timeline: z.array(timelineEntry).min(1),
})

export type Tracker = z.infer<typeof trackerSchema>
export type TimelineEntry = z.infer<typeof timelineEntry>
