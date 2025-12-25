import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getDeck } from '@/lib/db/operations/decks'
import DeckStudyInterface from '@/components/study/DeckStudyInterface'

/**
 * Deck Study Session Page
 *
 * Protected route - initiates deck-filtered FSRS study session.
 * Shows deck-specific completion statistics.
 * Implements User Story 4 (Deck-Filtered Study Sessions).
 *
 * Features:
 * - Deck-filtered flashcard queue
 * - Deck-specific FSRS settings applied
 * - Completion stats showing deck name and performance
 *
 * Maps to T039 in Phase 4 (FR-010, FR-027)
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId } = await params
  const deck = await getDeck(deckId)

  return {
    title: deck ? `Study ${deck.name} - MemoryLoop` : 'Study Session',
  }
}

export default async function DeckStudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <Link href="/decks" className="hover:text-blue-600 dark:hover:text-blue-400">
            Decks
          </Link>
          <span>/</span>
          <Link
            href={`/decks/${deck.id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {deck.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Study</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Study: {deck.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review flashcards from this deck using spaced repetition
        </p>
      </div>

      <DeckStudyInterface deckId={deck.id} deckName={deck.name} />
    </div>
  )
}
