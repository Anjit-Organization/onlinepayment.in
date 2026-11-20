import { isProd } from '../config'

type Level = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured JSON logs. Never log a full source_url query string or any scraped
 * page content verbatim. TECHNICAL.md §9.2.
 */
function emit(level: Level, msg: string, meta: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...meta })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else if (!isProd || level === 'info') console.log(line)
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
}
