'use client'

/**
 * GoalActionBar Component
 *
 * Fixed floating action bar for bulk goal operations.
 * Appears at bottom of screen when goals are selected.
 *
 * Features:
 * - Slide up animation when appearing
 * - Archive and Delete actions
 * - Clear selection button
 * - Selected count display
 * - Mobile-friendly touch targets
 *
 * Part of Feature 021: Custom Cards & Archive Management
 */

interface GoalActionBarProps {
  selectedCount: number // Number of goals selected
  onArchive: () => void // Called when Archive button clicked
  onDelete: () => void // Called when Delete button clicked
  onClearSelection: () => void // Called when X button clicked
}

export default function GoalActionBar({
  selectedCount,
  onArchive,
  onDelete,
  onClearSelection,
}: GoalActionBarProps) {
  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null
  }

  return (
    <div
      data-testid="goal-action-bar"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none animate-slide-up"
    >
      <div className="bg-gray-900 dark:bg-gray-950 text-white rounded-lg shadow-lg px-6 py-3 pointer-events-auto flex items-center gap-4 max-w-2xl w-full">
        {/* Left section: Clear button + count */}
        <div className="flex items-center gap-3 flex-1">
          <button
            data-testid="clear-selection"
            onClick={onClearSelection}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors"
            aria-label="Clear selection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <span data-testid="selected-count" className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>

        {/* Right section: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Archive button */}
          <button
            data-testid="archive-selected"
            onClick={onArchive}
            className="px-4 py-2 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label={`Archive ${selectedCount} ${selectedCount === 1 ? 'goal' : 'goals'}`}
          >
            Archive
          </button>

          {/* Delete button */}
          <button
            data-testid="delete-selected"
            onClick={onDelete}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            aria-label={`Delete ${selectedCount} ${selectedCount === 1 ? 'goal' : 'goals'}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
