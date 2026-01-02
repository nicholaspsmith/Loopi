'use client'

import CustomCardForm from './CustomCardForm'

/**
 * CustomCardModal Component (T015)
 *
 * Modal wrapper for the CustomCardForm component.
 * Provides a centered modal dialog for creating custom flashcards.
 *
 * Features:
 * - Backdrop click to close
 * - Centered layout
 * - Responsive design
 * - Dark mode support
 */

interface CustomCardModalProps {
  isOpen: boolean
  nodeId: string
  nodeTitle: string
  onClose: () => void
  onSuccess?: () => void
}

export default function CustomCardModal({
  isOpen,
  nodeId,
  nodeTitle,
  onClose,
  onSuccess,
}: CustomCardModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      data-testid="custom-card-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <CustomCardForm
          nodeId={nodeId}
          nodeTitle={nodeTitle}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
