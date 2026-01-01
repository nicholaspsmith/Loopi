'use client'

import { useState, useMemo } from 'react'

/**
 * NodeStudyModal Component
 *
 * Modal for selecting card count when starting a targeted node study session.
 * Implements User Story 1 (T030-T034) from spec 020-study-ui-improvements.
 *
 * Features:
 * - Card count slider with increments of 5 (T031)
 * - "All (N)" option as final slider position (T032)
 * - Edge case: if total < 5, show direct button instead of slider (T033)
 * - Confirm button to start study session (T034)
 *
 * Design Decisions (from plan.md):
 * - Slider from 5 to (N rounded to nearest 5)
 * - Final option always "All (N)" where N = exact total
 * - Modal prevents accidental study start
 */

interface NodeStudyModalProps {
  isOpen: boolean
  nodeId: string
  nodeTitle: string
  totalCardCount: number
  onClose: () => void
  onConfirm: (cardLimit: number) => void
}

export default function NodeStudyModal({
  isOpen,
  nodeId: _nodeId,
  nodeTitle,
  totalCardCount,
  onClose,
  onConfirm,
}: NodeStudyModalProps) {
  // nodeId is available via _nodeId if needed for future use
  // Calculate slider configuration
  const sliderConfig = useMemo(() => {
    // If total < 5, no slider needed (T033)
    if (totalCardCount < 5) {
      return null
    }

    // Round total to nearest 5 for max slider value
    const roundedMax = Math.ceil(totalCardCount / 5) * 5

    // Create positions: 5, 10, 15, ..., roundedMax, All (totalCardCount)
    const positions: number[] = []
    for (let i = 5; i <= roundedMax; i += 5) {
      positions.push(i)
    }

    return {
      min: 5,
      max: roundedMax,
      step: 5,
      positions,
      // Add one extra position for "All"
      totalPositions: positions.length + 1,
    }
  }, [totalCardCount])

  // Slider state: position 0 = 5 cards, position N = All cards
  const [sliderPosition, setSliderPosition] = useState(0)

  // Calculate actual card count from slider position
  const selectedCount = useMemo(() => {
    if (!sliderConfig) return totalCardCount

    const isAllPosition = sliderPosition === sliderConfig.positions.length
    if (isAllPosition) {
      return totalCardCount
    }

    return sliderConfig.positions[sliderPosition] || 5
  }, [sliderPosition, sliderConfig, totalCardCount])

  // Display label for current selection
  const displayLabel = useMemo(() => {
    if (!sliderConfig) return `Study all ${totalCardCount} cards`

    const isAllPosition = sliderPosition === sliderConfig.positions.length
    if (isAllPosition) {
      return `All (${totalCardCount})`
    }

    return `${selectedCount} cards`
  }, [sliderPosition, sliderConfig, selectedCount, totalCardCount])

  const handleConfirm = () => {
    onConfirm(selectedCount)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-testid="card-count-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Study {nodeTitle}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Choose how many cards to study</p>
        </div>

        {/* T033: Edge case - if total < 5, show simple button */}
        {!sliderConfig ? (
          <div className="mb-6">
            <div className="text-center py-8">
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Study all <span className="font-bold text-blue-600">{totalCardCount}</span>{' '}
                {totalCardCount === 1 ? 'card' : 'cards'}
              </p>
            </div>
          </div>
        ) : (
          /* T031, T032: Slider with increments of 5 and "All (N)" option */
          <div className="mb-6">
            {/* Selected count display */}
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {displayLabel}
              </div>
            </div>

            {/* Slider */}
            <div className="px-2">
              <input
                type="range"
                min={0}
                max={sliderConfig.totalPositions - 1}
                step={1}
                value={sliderPosition}
                onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                data-testid="card-count-slider"
              />

              {/* Tick marks and labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                {sliderConfig.positions.map((count, idx) => (
                  <span key={idx} className="text-center">
                    {count}
                  </span>
                ))}
                <span className="text-center">All</span>
              </div>
            </div>

            {/* Helper text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Total available: {totalCardCount} {totalCardCount === 1 ? 'card' : 'cards'}
            </p>
          </div>
        )}

        {/* T034: Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Study
          </button>
        </div>
      </div>
    </div>
  )
}
