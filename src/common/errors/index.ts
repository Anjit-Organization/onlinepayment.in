export type ErrorCode =
  | 'NOT_FOUND'
  | 'STALE_DATA'
  | 'VALIDATION'
  | 'UPSTREAM'
  | 'CONFIG'
  | 'INTERNAL'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly meta: Record<string, unknown>

  constructor(code: ErrorCode, message: string, meta: Record<string, unknown> = {}) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.meta = meta
  }
}

export class NotFoundError extends AppError {
  constructor(what: string, meta: Record<string, unknown> = {}) {
    super('NOT_FOUND', `${what} not found`, meta)
    this.name = 'NotFoundError'
  }
}

export class StaleDataError extends AppError {
  constructor(what: string, ageDays: number) {
    super('STALE_DATA', `${what} was last verified ${ageDays} days ago`, { ageDays })
    this.name = 'StaleDataError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, meta: Record<string, unknown> = {}) {
    super('VALIDATION', message, meta)
    this.name = 'ValidationError'
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super('CONFIG', message)
    this.name = 'ConfigError'
  }
}
