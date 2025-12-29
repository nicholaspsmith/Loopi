import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listDecks } from '@/lib/db/operations/decks'
import { getDb } from '@/lib/db/pg-client'
import { flashcards } from '@/lib/db/drizzle-schema'
import { eq, count } from 'drizzle-orm'
import CreateDeckForm from '@/components/decks/CreateDeckForm'

/**
 * Create Deck Page
 *
 * Protected route - form to create a new flashcard deck.
 * Implements User Story 1 (Manual Deck Creation).
 *
 * Features:
 * - Deck name validation (1-200 characters)
 * - 100-deck limit check
 * - Empty state if user has no flashcards
 * - Optional FSRS override settings
 *
 * Maps to T026-T027 in Phase 3 (FR-001, FR-033, Edge Case: No flashcards)
 */

export const metadata = {
  title: 'Create Deck - MemoryLoop',
}

export default async function NewDeckPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Check deck limit
  const existingDecks = await listDecks(session.user.id, { archived: false })
  const deckCount = existingDecks.length
  const maxDecks = 100

  if (deckCount >= maxDecks) {
    return (
      <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create New Deck
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="mb-4 text-red-600 dark:text-red-400">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Deck Limit Reached
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            You have reached the maximum limit of {maxDecks} decks. Please delete or archive unused
            decks before creating new ones.
          </p>
          <Link
            href="/decks"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Decks
          </Link>
        </div>
      </div>
    )
  }

  // Check if user has any flashcards (FR-034: Empty state handling)
  const db = getDb()
  const [flashcardCountResult] = await db
    .select({ count: count() })
    .from(flashcards)
    .where(eq(flashcards.userId, session.user.id))

  const flashcardCount = flashcardCountResult?.count ?? 0

  if (flashcardCount === 0) {
    return (
      <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create New Deck
          </h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="mb-4 text-gray-400 dark:text-gray-600">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Flashcards Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            You need to create flashcards before you can organize them into decks. Start a
            conversation to generate flashcards.
          </p>
          <Link
            href="/chat"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Chatting
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Create New Deck
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Organize your flashcards into a focused study collection
        </p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Deck Usage: {deckCount} / {maxDecks}
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You can create {maxDecks - deckCount} more{' '}
              {maxDecks - deckCount !== 1 ? 'decks' : 'deck'}.
            </p>
          </div>
        </div>
      </div>

      <CreateDeckForm />
    </div>
  )
}
