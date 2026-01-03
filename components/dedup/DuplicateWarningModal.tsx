'use client'

import { useEffect } from 'react'
import type { DuplicateCheckResult } from '@/lib/dedup/types'
import SimilarItemCard from './SimilarItemCard'

/**
 * DuplicateWarningModal Component (T014)
 *
 * Modal that shows when duplicates are detected during flashcard or goal creation.
 * Displays similar items and allows user to proceed or cancel.
 *
 * Features:
 * - Warning header with context
 * - List of similar items (up to 3)
 * - Cancel and "Create Anyway" actions
 * - Backdrop click to close
 * - Escape key to close
 * - Accessible ARIA attributes
 */

interface DuplicateWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onProceed: () => void
  result: DuplicateCheckResult
  itemType: 'flashcard' | 'goal'
}

export default function DuplicateWarningModal({
  isOpen,
  onClose,
  onProceed,
  result,
  itemType,
}: DuplicateWarningModalProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const itemTypeLabel = itemType === 'flashcard' ? 'flashcard' : 'goal'
  const similarCount = result.similarItems.length

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleBackdropClick}
      data-testid="duplicate-warning-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-warning-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl"
        data-testid="duplicate-warning-modal"
      >
        {/* Warning icon and title */}
        <div className="flex items-start gap-3 mb-4">
          {/* Warning icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-orange-600 dark:text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h2
              id="duplicate-warning-title"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
              data-testid="duplicate-warning-title"
            >
              Possible Duplicate Detected
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We found {similarCount} similar{' '}
              {similarCount === 1 ? itemTypeLabel : `${itemTypeLabel}s`} that already exist:
            </p>
          </div>
        </div>

        {/* Similar items list */}
        <div className="mb-6 space-y-2" data-testid="similar-items-list">
          {result.similarItems.map((item) => (
            <SimilarItemCard key={item.id} item={item} />
          ))}
        </div>

        {/* Help text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          You can cancel to review these existing items, or proceed to create a new {itemTypeLabel}{' '}
          anyway.
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            data-testid="duplicate-cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
            data-testid="duplicate-proceed-button"
          >
            Create Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
