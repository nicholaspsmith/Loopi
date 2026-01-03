'use client'

import type { SimilarItem } from '@/lib/dedup/types'

/**
 * SimilarItemCard Component (T013)
 *
 * Displays a single similar item found during duplicate check.
 * Shows the item type, display text, and similarity percentage.
 *
 * Features:
 * - Type badge (flashcard vs goal)
 * - Display text (existing question/title)
 * - Similarity percentage
 * - Compact design for modal display
 */

interface SimilarItemCardProps {
  item: SimilarItem
}

export default function SimilarItemCard({ item }: SimilarItemCardProps) {
  // Convert score (0-1) to percentage
  const similarityPercent = Math.round(item.score * 100)

  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
      data-testid="similar-item-card"
    >
      {/* Header: Type badge and similarity score */}
      <div className="flex items-center justify-between mb-2">
        {/* Type badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            item.type === 'flashcard'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          }`}
          data-testid="item-type-badge"
        >
          {item.type === 'flashcard' ? 'Flashcard' : 'Goal'}
        </span>

        {/* Similarity percentage */}
        <span
          className="text-sm font-semibold text-orange-600 dark:text-orange-400"
          data-testid="similarity-score"
        >
          {similarityPercent}% similar
        </span>
      </div>

      {/* Display text */}
      <p
        className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2"
        data-testid="item-display-text"
      >
        {item.displayText}
      </p>
    </div>
  )
}
