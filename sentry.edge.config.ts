// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
})
