import * as Sentry from '@sentry/react'
import { setSchemaMismatchReporter } from './api/schemas'

// Sentry only runs when VITE_SENTRY_DSN is set (i.e. in builds you configure it
// for). With no DSN — local dev, or if you remove it — this is a no-op, so there
// is no error-reporting noise while developing.
const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry(): void {
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Tie events to a build so production stack traces map to a known release.
    // Set VITE_SENTRY_RELEASE in the build env (e.g. the git SHA) to populate it.
    release: import.meta.env.VITE_SENTRY_RELEASE,
    // Don't attach IP addresses / cookies to events (this app handles user data).
    sendDefaultPii: false,
    // Sample a fraction of performance traces; errors are always captured.
    tracesSampleRate: 0.1,
  })

  // Surface API schema drift (previously console-only) as a Sentry warning.
  setSchemaMismatchReporter((context, issues) => {
    Sentry.captureMessage(`API schema mismatch: ${context}`, {
      level: 'warning',
      extra: { issues },
    })
  })
}

/** Report a caught error (e.g. from the React error boundary) to Sentry. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
