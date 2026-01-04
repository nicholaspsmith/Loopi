#!/usr/bin/env npx tsx
/**
 * Post-Migration Cleanup Script
 *
 * Runs after drizzle-kit migrate to clean up orphaned data.
 * Called from: npm run start (drizzle-kit migrate && npx tsx scripts/post-migrate.ts && next start)
 */

import { cleanupOrphanedFlashcardEmbeddings } from '../lib/db/operations/flashcards-lancedb'

async function main() {
  console.log('[Post-Migrate] Starting cleanup...')

  try {
    // Clean up orphaned LanceDB embeddings
    const deletedCount = await cleanupOrphanedFlashcardEmbeddings()
    console.log(`[Post-Migrate] Cleanup complete. Deleted ${deletedCount} orphaned embeddings.`)
  } catch (error) {
    console.error('[Post-Migrate] Cleanup failed:', error)
    // Don't fail the startup - cleanup is best-effort
  }
}

main()
