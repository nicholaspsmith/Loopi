/**
 * Sentry Edge Configuration
 *
 * This file configures the Sentry SDK for the Edge runtime.
 * Imported by instrumentation.ts when NEXT_RUNTIME === 'edge'.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Disable Sentry in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true',

  // Performance monitoring - sample 10% in production
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Set environment
  environment: process.env.NODE_ENV || 'development',
})
