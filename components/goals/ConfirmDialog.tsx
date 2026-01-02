'use client'

import { useEffect } from 'react'

/**
 * ConfirmDialog Component
 *
 * Modal confirmation dialog for destructive actions like archive/delete operations.
 *
 * Features:
 * - Modal overlay with backdrop click to cancel
 * - Escape key to close
 * - Configurable danger/warning variants
 * - Loading state support
 * - Accessible ARIA attributes
 *
 * Design:
 * - Centered modal with max-width-md
 * - White background with rounded corners
 * - Two button layout: Cancel (secondary) + Confirm (colored)
 * - Smooth fade-in animation
 */

interface ConfirmDialogProps {
  isOpen: boolean
  title: string // e.g., "Archive Goals" or "Delete Goals"
  message: string // Descriptive text about what will happen
  confirmLabel: string // e.g., "Archive" or "Delete"
  confirmVariant: 'danger' | 'warning' // danger=red, warning=amber
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean // Show loading state on confirm button
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  // Handle Escape key to close dialog
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isLoading, onCancel])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel()
    }
  }

  // Determine button styles based on variant
  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-amber-600 hover:bg-amber-700 text-white'

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity"
      onClick={handleBackdropClick}
      data-testid="confirm-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
        data-testid="confirm-dialog"
      >
        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3"
          data-testid="confirm-dialog-title"
        >
          {title}
        </h2>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6" data-testid="confirm-dialog-message">
          {message}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="confirm-dialog-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${confirmButtonClass}`}
            data-testid="confirm-dialog-confirm"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
