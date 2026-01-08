/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize:
 * - Sentry error tracking
 * - LanceDB tables
 */

import * as Sentry from '@sentry/nextjs'

export async function register() {
  // Initialize Sentry based on runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }

  // Initialize LanceDB (Node.js only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeSchema, isSchemaInitialized } = await import('@/lib/db/schema')

    try {
      const initialized = await isSchemaInitialized()
      if (!initialized) {
        console.log('[Instrumentation] Initializing LanceDB schema...')
        await initializeSchema()
        console.log('[Instrumentation] LanceDB schema initialized')
      } else {
        console.log('[Instrumentation] LanceDB schema already initialized')
      }
    } catch (error) {
      console.error('[Instrumentation] Failed to initialize LanceDB schema:', error)
      // Don't throw - let the app start anyway, tables can be created on first use
    }
  }
}

// Capture errors from Server Components, middleware, and API routes
export const onRequestError = Sentry.captureRequestError
