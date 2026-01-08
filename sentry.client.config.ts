// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://f04b03b5481c840fabcb0934d519474d@o4510672318955520.ingest.us.sentry.io/4510672320200704',

  // Performance monitoring - sample 10% in production, 100% in development
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

    // Scrub request bodies (may contain user-generated content)
    if (event.request?.data) {
      event.request.data = '[REDACTED]'
    }

    // Anonymize user context to prevent IP address and user ID tracking
    if (event.user) {
      event.user = {
        id: event.user.id ? '[ANONYMIZED]' : undefined,
        ip_address: undefined,
      }
    }

    return event
  },
})
