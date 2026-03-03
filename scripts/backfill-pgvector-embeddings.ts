#!/usr/bin/env tsx

/**
 * Backfill pgvector Embeddings Script
 *
 * Generates embeddings for existing flashcards and goals, storing them in
 * PostgreSQL using pgvector. This enables semantic search and duplicate
 * detection for items created before the pgvector migration.
 *
 * Run with: npx tsx scripts/backfill-pgvector-embeddings.ts
 *
 * Options:
 *   --dry-run      Show what would be done without making changes
 *   --batch-size   Set batch size (default: 10)
 *   --type         Process only 'flashcards' or 'goals' (default: both)
 *   --user-id      Only process items for a specific user
 */

// Load environment variables FIRST, before any imports that use them
import { config } from 'dotenv'
config({ path: '.env.local' })

// Verify key is loaded
if (!process.env.JINA_API_KEY) {
  console.error('❌ JINA_API_KEY not found in .env.local')
  process.exit(1)
}

interface BackfillOptions {
  dryRun: boolean
  batchSize: number
  type: 'flashcards' | 'goals' | 'both'
  userId?: string
}

function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2)
  const options: BackfillOptions = {
    dryRun: false,
    batchSize: 10,
    type: 'both',
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      options.dryRun = true
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--type' && args[i + 1]) {
      const typeArg = args[i + 1].toLowerCase()
      if (typeArg === 'flashcards' || typeArg === 'goals' || typeArg === 'both') {
        options.type = typeArg
      }
      i++
    } else if (args[i] === '--user-id' && args[i + 1]) {
      options.userId = args[i + 1]
      i++
    }
  }

  return options
}

async function main() {
  const options = parseArgs()

  console.log('🔄 pgvector Embeddings Backfill Script')
  console.log('======================================\n')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  console.log(`Options:`)
  console.log(`  - Batch size: ${options.batchSize}`)
  console.log(`  - Type: ${options.type}`)
  if (options.userId) {
    console.log(`  - User ID: ${options.userId}`)
  }

  // Dynamic imports AFTER dotenv is loaded
  const { getDb } = await import('../lib/db/pg-client')
  const { sql } = await import('drizzle-orm')
  const { syncFlashcardEmbedding } = await import('../lib/db/operations/flashcards-pgvector')
  const { syncGoalEmbedding } = await import('../lib/db/operations/goals-pgvector')

  const db = getDb()

  async function getFlashcardsWithoutEmbeddings(userId?: string) {
    const query = userId
      ? sql`
          SELECT f.id, f.user_id as "userId", f.question
          FROM flashcards f
          LEFT JOIN flashcard_embeddings fe ON f.id = fe.id
          WHERE fe.id IS NULL AND f.user_id = ${userId}
          ORDER BY f.created_at
        `
      : sql`
          SELECT f.id, f.user_id as "userId", f.question
          FROM flashcards f
          LEFT JOIN flashcard_embeddings fe ON f.id = fe.id
          WHERE fe.id IS NULL
          ORDER BY f.created_at
        `

    const result = await db.execute<{ id: string; userId: string; question: string }>(query)
    return result as unknown as { id: string; userId: string; question: string }[]
  }

  async function getGoalsWithoutEmbeddings(userId?: string) {
    const query = userId
      ? sql`
          SELECT lg.id, lg.user_id as "userId", lg.title, lg.description
          FROM learning_goals lg
          LEFT JOIN goal_embeddings ge ON lg.id = ge.id
          WHERE ge.id IS NULL AND lg.user_id = ${userId}
          ORDER BY lg.created_at
        `
      : sql`
          SELECT lg.id, lg.user_id as "userId", lg.title, lg.description
          FROM learning_goals lg
          LEFT JOIN goal_embeddings ge ON lg.id = ge.id
          WHERE ge.id IS NULL
          ORDER BY lg.created_at
        `

    const result = await db.execute<{
      id: string
      userId: string
      title: string
      description: string | null
    }>(query)
    return result as unknown as {
      id: string
      userId: string
      title: string
      description: string | null
    }[]
  }

  async function getTotalCounts() {
    const flashcardCount = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM flashcards`
    )
    const flashcardEmbeddingCount = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM flashcard_embeddings`
    )
    const goalCount = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM learning_goals`
    )
    const goalEmbeddingCount = await db.execute<{ count: string }>(
      sql`SELECT COUNT(*) as count FROM goal_embeddings`
    )

    return {
      flashcards: parseInt((flashcardCount as unknown as { count: string }[])[0]?.count || '0', 10),
      flashcardEmbeddings: parseInt(
        (flashcardEmbeddingCount as unknown as { count: string }[])[0]?.count || '0',
        10
      ),
      goals: parseInt((goalCount as unknown as { count: string }[])[0]?.count || '0', 10),
      goalEmbeddings: parseInt(
        (goalEmbeddingCount as unknown as { count: string }[])[0]?.count || '0',
        10
      ),
    }
  }

  async function backfillFlashcards(): Promise<{ processed: number; failed: number }> {
    console.log('\n📚 Processing Flashcards')
    console.log('========================\n')

    const flashcardsToProcess = await getFlashcardsWithoutEmbeddings(options.userId)
    console.log(`   Found ${flashcardsToProcess.length} flashcards without embeddings\n`)

    if (flashcardsToProcess.length === 0) {
      console.log('   ✅ All flashcards already have embeddings')
      return { processed: 0, failed: 0 }
    }

    if (options.dryRun) {
      console.log('   Would process the following flashcards:')
      flashcardsToProcess.slice(0, 10).forEach((f) => {
        console.log(
          `     - ${f.id}: "${f.question.substring(0, 50)}${f.question.length > 50 ? '...' : ''}"`
        )
      })
      if (flashcardsToProcess.length > 10) {
        console.log(`     ... and ${flashcardsToProcess.length - 10} more`)
      }
      return { processed: flashcardsToProcess.length, failed: 0 }
    }

    let processed = 0
    let failed = 0

    for (let i = 0; i < flashcardsToProcess.length; i += options.batchSize) {
      const batch = flashcardsToProcess.slice(i, i + options.batchSize)
      console.log(
        `   ⏳ Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(flashcardsToProcess.length / options.batchSize)}...`
      )

      for (const flashcard of batch) {
        try {
          await syncFlashcardEmbedding({
            id: flashcard.id,
            userId: flashcard.userId,
            question: flashcard.question,
          })
          processed++
          process.stdout.write(`\r   Processed: ${processed}/${flashcardsToProcess.length}`)
        } catch (error) {
          failed++
          console.error(`\n   ❌ Failed to sync flashcard ${flashcard.id}:`, error)
        }
      }

      // Small delay between batches to avoid rate limiting Jina API
      if (i + options.batchSize < flashcardsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log('')
    return { processed, failed }
  }

  async function backfillGoals(): Promise<{ processed: number; failed: number }> {
    console.log('\n🎯 Processing Goals')
    console.log('===================\n')

    const goalsToProcess = await getGoalsWithoutEmbeddings(options.userId)
    console.log(`   Found ${goalsToProcess.length} goals without embeddings\n`)

    if (goalsToProcess.length === 0) {
      console.log('   ✅ All goals already have embeddings')
      return { processed: 0, failed: 0 }
    }

    if (options.dryRun) {
      console.log('   Would process the following goals:')
      goalsToProcess.slice(0, 10).forEach((g) => {
        console.log(
          `     - ${g.id}: "${g.title.substring(0, 50)}${g.title.length > 50 ? '...' : ''}"`
        )
      })
      if (goalsToProcess.length > 10) {
        console.log(`     ... and ${goalsToProcess.length - 10} more`)
      }
      return { processed: goalsToProcess.length, failed: 0 }
    }

    let processed = 0
    let failed = 0

    for (let i = 0; i < goalsToProcess.length; i += options.batchSize) {
      const batch = goalsToProcess.slice(i, i + options.batchSize)
      console.log(
        `   ⏳ Processing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(goalsToProcess.length / options.batchSize)}...`
      )

      for (const goal of batch) {
        try {
          await syncGoalEmbedding({
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

      // Small delay between batches to avoid rate limiting Jina API
      if (i + options.batchSize < goalsToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log('')
    return { processed, failed }
  }

  try {
    // Get current counts
    console.log('\n📊 Current Status')
    console.log('-----------------')
    const counts = await getTotalCounts()
    console.log(`   Flashcards: ${counts.flashcardEmbeddings}/${counts.flashcards} have embeddings`)
    console.log(`   Goals: ${counts.goalEmbeddings}/${counts.goals} have embeddings`)

    let flashcardResults = { processed: 0, failed: 0 }
    let goalResults = { processed: 0, failed: 0 }

    // Process flashcards
    if (options.type === 'flashcards' || options.type === 'both') {
      flashcardResults = await backfillFlashcards()
    }

    // Process goals
    if (options.type === 'goals' || options.type === 'both') {
      goalResults = await backfillGoals()
    }

    // Summary
    console.log('\n📊 Backfill Summary')
    console.log('==================')
    if (options.type === 'flashcards' || options.type === 'both') {
      console.log(`   Flashcards processed: ${flashcardResults.processed}`)
      console.log(`   Flashcards failed: ${flashcardResults.failed}`)
    }
    if (options.type === 'goals' || options.type === 'both') {
      console.log(`   Goals processed: ${goalResults.processed}`)
      console.log(`   Goals failed: ${goalResults.failed}`)
    }

    const totalFailed = flashcardResults.failed + goalResults.failed
    if (options.dryRun) {
      console.log(`\n✅ Dry run complete!`)
    } else {
      console.log(`\n✅ Backfill complete!`)
    }

    process.exit(totalFailed > 0 ? 1 : 0)
  } catch (error) {
    console.error('\n❌ Backfill failed:', error)
    process.exit(1)
  }
}

main()
