import { z } from 'zod'

export const TOPICS = ['upi-mdr'] as const
export type Topic = (typeof TOPICS)[number]

export const subscribeInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  topic: z.enum(TOPICS),
  source: z.string().max(120).default('unknown'),
  /** Honeypot: a real person never fills this in. */
  website: z.string().max(0).optional().or(z.literal('')),
})

export type SubscribeInput = z.infer<typeof subscribeInput>

export type SubscribeState = {
  status: 'idle' | 'ok' | 'error'
  message?: string
}
