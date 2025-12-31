import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listDecks } from '@/lib/db/operations/decks'
import DeckList from '@/components/decks/DeckList'
import DeckActions from '@/components/decks/DeckActions'

/**
 * Decks List Page
 *
 * Protected route - displays user's flashcard decks with usage stats.
 * Implements User Story 1 (Manual Deck Creation and Study).
 *
 * Features:
 * - List all decks with metadata (card count, last studied)
 * - Usage stats (X/100 decks, Y/1000 cards per deck)
 * - Create new deck button
 * - Filter by archived status
 * - Sort by name, created, or last studied
 *
 * Maps to T023 in Phase 3 (FR-001, FR-002, FR-033)
 */

export const metadata = {
  title: 'My Decks - MemoryLoop',
}

export default async function DecksPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get all active (non-archived) decks
  const decks = await listDecks(session.user.id, {
    archived: false,
    sortBy: 'last_studied_at',
  })

  const totalDecks = decks.length
  const maxDecks = 100

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="px-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">My Decks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Organize your flashcards into focused study collections
          </p>
        </div>
        <DeckActions totalDecks={totalDecks} maxDecks={maxDecks} />
      </div>

      {/* Usage Stats */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Decks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalDecks} / {maxDecks}
              </p>
            </div>
            {totalDecks >= maxDecks && (
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm rounded-full">
                Limit reached
              </div>
            )}
          </div>
          {totalDecks > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {decks.reduce((sum, d) => sum + d.cardCount, 0)} total cards
            </div>
          )}
        </div>
      </div>

      {/* Decks List */}
      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No decks yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            Create your first deck to organize your flashcards into focused study collections
          </p>
          <Link
            href="/decks/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Deck
          </Link>
        </div>
      ) : (
        <DeckList decks={decks} />
      )}
    </div>
  )
}
