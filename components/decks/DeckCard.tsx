import Link from 'next/link'
import type { DeckWithMetadata } from '@/lib/db/operations/decks'

/**
 * DeckCard Component
 *
 * Displays a single deck preview with metadata:
 * - Deck name
 * - Card count with limit indicator
 * - Last studied timestamp
 * - Created date
 *
 * Maps to T024 in Phase 3 (User Story 1)
 */

interface DeckCardProps {
  deck: DeckWithMetadata
}

export default function DeckCard({ deck }: DeckCardProps) {
  const maxCards = 1000
  const cardCountPercentage = (deck.cardCount / maxCards) * 100
  const isNearLimit = cardCountPercentage >= 90

  // Format timestamp for display
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  return (
    <Link
      href={`/decks/${deck.id}`}
      className="block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
          {deck.name}
        </h3>
      </div>

      <div className="space-y-3">
        {/* Card Count */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Cards</span>
            <span
              className={`text-sm font-medium ${
                isNearLimit
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {deck.cardCount} / {maxCards}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(cardCountPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Studied {formatDate(deck.lastStudiedAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Created {formatDate(deck.createdAt)}</span>
          </div>
        </div>

        {/* FSRS Overrides Indicator */}
        {(deck.newCardsPerDayOverride !== null ||
          deck.cardsPerSessionOverride !== null) && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Custom FSRS settings</span>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
