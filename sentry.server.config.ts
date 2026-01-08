// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://f04b03b5481c840fabcb0934d519474d@o4510672318955520.ingest.us.sentry.io/4510672320200704',

  // Performance monitoring - sample 10% in production, 100% in development
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // IMPORTANT: Do NOT send user PII - we handle privacy ourselves
  sendDefaultPii: false,

  // Set environment
  environment: process.env.NODE_ENV || 'development',

  // Scrub sensitive data from server-side events
  beforeSend(event) {
    // Scrub sensitive headers
    if (event.request?.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
      sensitiveHeaders.forEach((header) => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = '[REDACTED]'
        }
      })
    }

    // Scrub request/response bodies (may contain user flashcards, goals, messages)
    if (event.request?.data) {
      event.request.data = '[REDACTED]'
    }

    // Scrub any extra context that might contain PII
    if (event.contexts?.data) {
      delete event.contexts.data
    }

    // Anonymize user context to prevent IP address and user ID tracking
    if (event.user) {
      event.user = {
        id: event.user.id ? '[ANONYMIZED]' : undefined,
        ip_address: undefined,
      }
    }

    // Scrub sensitive data from error messages
    if (event.message) {
      event.message = event.message
        .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
        .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]')
        .replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
    }

    return event
  },
})
