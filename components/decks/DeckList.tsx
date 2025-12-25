import type { DeckWithMetadata } from '@/lib/db/operations/decks'
import DeckCard from './DeckCard'

/**
 * DeckList Component
 *
 * Container component that renders a grid of deck cards.
 * Handles responsive layout and empty states.
 *
 * Maps to T025 in Phase 3 (User Story 1)
 */

interface DeckListProps {
  decks: DeckWithMetadata[]
}

export default function DeckList({ decks }: DeckListProps) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600 dark:text-gray-400">
        No decks found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  )
}
