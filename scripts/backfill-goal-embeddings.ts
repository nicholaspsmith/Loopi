#!/usr/bin/env tsx

/**
 * Backfill Goal Embeddings Script
 *
 * Generates embeddings for all existing goals and syncs them to LanceDB.
 * This enables duplicate detection for goals that existed before the
 * deduplication feature was implemented.
 *
 * Run with: npx tsx scripts/backfill-goal-embeddings.ts
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --batch-size Set batch size (default: 10)
 *   --user-id    Only process goals for a specific user
 */

import { getDb, learningGoals } from '../lib/db'
import { eq } from 'drizzle-orm'
import { syncGoalToLanceDB } from '../lib/db/operations/goals-lancedb'
import { getDbConnection, closeDbConnection } from '../lib/db/client'
import { initializeSchema, isSchemaInitialized } from '../lib/db/schema'

interface BackfillOptions {
  dryRun: boolean
  batchSize: number
  userId?: string
}

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2)
  const options: BackfillOptions = {
    dryRun: false,
    batchSize: 10,
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      options.dryRun = true
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--user-id' && args[i + 1]) {
      options.userId = args[i + 1]
      i++
    }
  }

  return options
}

async function ensureLanceDBReady(): Promise<void> {
  const initialized = await isSchemaInitialized()
  if (!initialized) {
    console.log('📦 Initializing LanceDB schema...')
    await initializeSchema()
  }
}

async function getAllGoals(userId?: string) {
  const db = getDb()

  if (userId) {
    return db
      .select({
        id: learningGoals.id,
        userId: learningGoals.userId,
        title: learningGoals.title,
        description: learningGoals.description,
      })
      .from(learningGoals)
      .where(eq(learningGoals.userId, userId))
  }

  return db
    .select({
      id: learningGoals.id,
      userId: learningGoals.userId,
      title: learningGoals.title,
      description: learningGoals.description,
    })
    .from(learningGoals)
}

async function getExistingGoalIds(): Promise<Set<string>> {
  try {
    const db = await getDbConnection()
    const table = await db.openTable('goals')
    const results = await table.query().select(['id']).toArray()
    return new Set(results.map((r: { id: string }) => r.id))
  } catch {
    // Table might be empty or not exist yet
    return new Set()
  }
}

async function main() {
  const options = parseArgs()

  console.log('🔄 Goal Embeddings Backfill Script')
  console.log('==================================\n')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  try {
    // Ensure LanceDB schema exists
    await ensureLanceDBReady()

    // Get all goals from PostgreSQL
    console.log('📊 Fetching goals from PostgreSQL...')
    const goals = await getAllGoals(options.userId)
    console.log(`   Found ${goals.length} goals\n`)

    if (goals.length === 0) {
      console.log('✅ No goals to process')
      process.exit(0)
    }

    // Get existing embeddings to avoid duplicates
    console.log('🔍 Checking existing embeddings in LanceDB...')
    const existingIds = await getExistingGoalIds()
    console.log(`   Found ${existingIds.size} existing embeddings\n`)

    // Filter out goals that already have embeddings
    const goalsToProcess = goals.filter((g) => !existingIds.has(g.id))
    console.log(`📝 Goals to process: ${goalsToProcess.length}`)
    console.log(`   Already synced: ${goals.length - goalsToProcess.length}\n`)

    if (goalsToProcess.length === 0) {
      console.log('✅ All goals already have embeddings')
      process.exit(0)
    }

    if (options.dryRun) {
      console.log('Would process the following goals:')
      goalsToProcess.slice(0, 10).forEach((g) => {
        console.log(`  - ${g.id}: "${g.title.substring(0, 50)}${g.title.length > 50 ? '...' : ''}"`)
      })
      if (goalsToProcess.length > 10) {
        console.log(`  ... and ${goalsToProcess.length - 10} more`)
      }
      console.log('\n✅ Dry run complete')
      process.exit(0)
    }

    // Process in batches
    let processed = 0
    let failed = 0

    for (let i = 0; i < goalsToProcess.length; i += options.batchSize) {
      const batch = goalsToProcess.slice(i, i + options.batchSize)
      console.log(
        `\n⏳ Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(goalsToProcess.length / options.batchSize)}...`
      )

      for (const goal of batch) {
        try {
          await syncGoalToLanceDB({
            id: goal.id,
            userId: goal.userId,
            title: goal.title,
            description: goal.description,
          })
          processed++
          process.stdout.write(`\r   Processed: ${processed}/${goalsToProcess.length}`)
        } catch (error) {
          failed++
          console.error(`\n   ❌ Failed to sync goal ${goal.id}:`, error)
        }
      }

      // Small delay between batches to avoid rate limiting
      if (i + options.batchSize < goalsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log('\n\n📊 Backfill Summary')
    console.log('==================')
    console.log(`   Total goals: ${goals.length}`)
    console.log(`   Already synced: ${goals.length - goalsToProcess.length}`)
    console.log(`   Newly processed: ${processed}`)
    console.log(`   Failed: ${failed}`)
    console.log(`\n✅ Backfill complete!`)

    process.exit(failed > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Backfill failed:', error)
    process.exit(1)
  } finally {
    await closeDbConnection()
  }
}

main()
