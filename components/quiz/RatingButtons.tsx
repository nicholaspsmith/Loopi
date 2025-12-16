/**
 * RatingButtons Component
 *
 * FSRS rating buttons for flashcard review.
 * Provides 4 difficulty ratings: Again (1), Hard (2), Good (3), Easy (4).
 *
 * Maps to T117 in Phase 6 (User Story 4)
 */

interface RatingButtonsProps {
  onRate: (rating: number) => void
  disabled?: boolean
}

export default function RatingButtons({
  onRate,
  disabled = false,
}: RatingButtonsProps) {
  const ratings = [
    { value: 1, label: 'Again', color: 'bg-red-600 hover:bg-red-700' },
    { value: 2, label: 'Hard', color: 'bg-orange-600 hover:bg-orange-700' },
    { value: 3, label: 'Good', color: 'bg-green-600 hover:bg-green-700' },
    { value: 4, label: 'Easy', color: 'bg-blue-600 hover:bg-blue-700' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 text-center mb-4">
        How well did you know this?
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ratings.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => onRate(value)}
            disabled={disabled}
            className={`px-4 py-3 ${color} text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
