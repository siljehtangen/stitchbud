import * as Sentry from '@sentry/react'
import { setSchemaMismatchReporter } from './api/schemas'

const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry(): void {
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
  })

  setSchemaMismatchReporter((context, issues) => {
    Sentry.captureMessage(`API schema mismatch: ${context}`, {
      level: 'warning',
      extra: { issues },
    })
  })
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
