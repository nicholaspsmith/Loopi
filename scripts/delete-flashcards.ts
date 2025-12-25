/**
 * Script to delete flashcards not created from a specific message
 *
 * Usage: npx tsx scripts/delete-flashcards.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

import { getDb } from '@/lib/db/pg-client'
import { messages } from '@/lib/db/drizzle-schema'
import { like } from 'drizzle-orm'
import { getFlashcardsByUserId, deleteFlashcard } from '@/lib/db/operations/flashcards'

const TARGET_MESSAGE_CONTENT =
  'What would be involved in building scalable backends for LanceDB Cloud that offer a serverless experience for billion-scale datasets?'
const LANCEDB_MESSAGE_ID = '507c964b-4afc-4e95-a73b-e7d8f0636670'

async function main() {
  try {
    const db = getDb()

    // Find the message with the specific content
    console.log('Searching for target message...')
    const targetMessages = await db
      .select()
      .from(messages)
      .where(like(messages.content, `%${TARGET_MESSAGE_CONTENT}%`))
      .limit(1)

    if (targetMessages.length === 0) {
      console.log('Target message not found!')
      console.log('Looking for message containing:', TARGET_MESSAGE_CONTENT)
      return
    }

    const targetMessage = targetMessages[0]
    console.log(`Found target message: ${targetMessage.id}`)
    console.log(`User ID: ${targetMessage.userId}`)
    console.log(`Created at: ${targetMessage.createdAt}`)

    // Get all flashcards for this user
    console.log('\nFetching all flashcards...')
    const allFlashcards = await getFlashcardsByUserId(targetMessage.userId)
    console.log(`Total flashcards: ${allFlashcards.length}`)

    // Keep flashcards from the target message AND the LanceDB message
    const messagesToKeep = [targetMessage.id, LANCEDB_MESSAGE_ID]

    // Filter flashcards that are NOT from either message
    const flashcardsToDelete = allFlashcards.filter(
      (fc) => !fc.messageId || !messagesToKeep.includes(fc.messageId)
    )

    console.log(`\nFlashcards to delete: ${flashcardsToDelete.length}`)
    console.log(`Flashcards to keep: ${allFlashcards.length - flashcardsToDelete.length}`)

    if (flashcardsToDelete.length === 0) {
      console.log('\nNo flashcards to delete!')
      return
    }

    // Show details of flashcards to delete
    console.log('\n--- Flashcards to be deleted ---')
    for (const fc of flashcardsToDelete) {
      console.log(`\nID: ${fc.id}`)
      console.log(
        `Question: ${fc.question.substring(0, 80)}${fc.question.length > 80 ? '...' : ''}`
      )
      console.log(`Message ID: ${fc.messageId}`)
    }

    // Ask for confirmation
    console.log('\n⚠️  Are you sure you want to delete these flashcards?')
    console.log('This action cannot be undone.')
    console.log('\nTo proceed, set CONFIRM_DELETE=true environment variable and run again.')

    if (process.env.CONFIRM_DELETE !== 'true') {
      console.log('\nDeletion cancelled (CONFIRM_DELETE not set to true)')
      return
    }

    // Delete flashcards
    console.log('\nDeleting flashcards...')
    let deletedCount = 0
    for (const fc of flashcardsToDelete) {
      try {
        await deleteFlashcard(fc.id)
        deletedCount++
        console.log(`✓ Deleted: ${fc.question.substring(0, 60)}...`)
      } catch (error) {
        console.error(`✗ Failed to delete ${fc.id}:`, error)
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} flashcards`)
    console.log(`Remaining flashcards: ${allFlashcards.length - deletedCount}`)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
