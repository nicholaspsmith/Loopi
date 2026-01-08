/**
 * Sentry Client Configuration
 *
 * This file configures the Sentry SDK for the browser/client-side.
 * Initialized automatically by Next.js instrumentation.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Performance monitoring - sample 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay - capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors that aren't actionable
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User-initiated navigation
    'AbortError',
  ],

  // Scrub sensitive data
  beforeSend(event) {
    // Remove any potential PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data?.url) {
          // Scrub query parameters that might contain sensitive data
          try {
            const url = new URL(breadcrumb.data.url)
            const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth']
            sensitiveParams.forEach((param) => {
              if (url.searchParams.has(param)) {
                url.searchParams.set(param, '[REDACTED]')
              }
            })
            breadcrumb.data.url = url.toString()
          } catch {
            // Not a valid URL, leave as-is
          }
        }
        return breadcrumb
      })
    }
    return event
  },
})
