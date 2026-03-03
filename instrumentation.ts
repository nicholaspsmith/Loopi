/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize:
 * - Sentry error tracking
 *
 * Note: Vector embeddings are now stored in PostgreSQL using pgvector.
 * Database schema is managed via Drizzle migrations.
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

  // Database initialization is handled by migrations (npm run db:migrate)
  // pgvector embeddings are created via the flashcard_embeddings and goal_embeddings tables
}

// Capture errors from Server Components, middleware, and API routes
export const onRequestError = Sentry.captureRequestError
