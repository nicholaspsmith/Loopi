import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import { getDeck } from '@/lib/db/operations/decks'
import { getDeckCards } from '@/lib/db/operations/deck-cards'
import DeckEditor from '@/components/decks/DeckEditor'
import ArchiveDeckButton from '@/components/decks/ArchiveDeckButton'
import Link from 'next/link'

/**
 * Deck Detail Page
 *
 * Protected route - displays deck details with full card list.
 * Allows adding/removing cards and editing deck metadata.
 * Implements User Story 1 (Manual Deck Creation and Study).
 *
 * Features:
 * - Deck metadata (name, card count, created/last studied)
 * - Full card list with add/remove functionality
 * - Delete deck option
 * - Start study session button
 *
 * Maps to T028 in Phase 3 (FR-002, FR-004, FR-005)
 */

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params
  const deck = await getDeck(deckId)

  return {
    title: deck ? `${deck.name} - MemoryLoop` : 'Deck Not Found',
  }
}

export default async function DeckDetailPage({ params }: { params: Promise<{ deckId: string }> }) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { deckId } = await params

  const deck = await getDeck(deckId)

  if (!deck) {
    notFound()
  }

  // Verify ownership
  if (deck.userId !== session.user.id) {
    notFound()
  }

  const cards = await getDeckCards(deckId)

  // Format timestamp for display
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
          <Link href="/decks" className="hover:text-blue-600 dark:hover:text-blue-400">
            Decks
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{deck.name}</span>
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="px-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {deck.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                <span>{deck.cardCount} cards</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Created {formatDate(deck.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Last studied {formatDate(deck.lastStudiedAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <ArchiveDeckButton deckId={deck.id} deckName={deck.name} isArchived={deck.archived} />
            {deck.cardCount > 0 && !deck.archived && (
              <Link
                href={`/study/deck/${deckId}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Start Study Session
              </Link>
            )}
          </div>
        </div>

        {/* FSRS Overrides */}
        {(deck.newCardsPerDayOverride !== null || deck.cardsPerSessionOverride !== null) && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Custom FSRS Settings
                </h3>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {deck.newCardsPerDayOverride !== null && (
                    <p>New cards per day: {deck.newCardsPerDayOverride}</p>
                  )}
                  {deck.cardsPerSessionOverride !== null && (
                    <p>Cards per session: {deck.cardsPerSessionOverride}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deck Editor */}
      <DeckEditor deck={deck} cards={cards} />
    </div>
  )
}
