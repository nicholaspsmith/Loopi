'use client'

import { useState } from 'react'

interface ApiKeyDisplayProps {
  keyPreview: string
  onDelete: () => Promise<void>
  isValid?: boolean
  lastValidatedAt?: string
}

/**
 * ApiKeyDisplay Component
 *
 * Displays masked API key preview with delete functionality
 */
export default function ApiKeyDisplay({
  keyPreview,
  onDelete,
  isValid = true,
  lastValidatedAt,
}: ApiKeyDisplayProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await onDelete()
      setSuccessMessage('API key deleted successfully')
      setShowDeleteConfirm(false)
    } catch (err) {
      setError('Failed to delete API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm">{keyPreview}</p>
              {isValid !== undefined && (
                <span
                  role="status"
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    isValid
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {isValid ? 'Valid' : 'Invalid'}
                </span>
              )}
            </div>

            {!isValid && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                This API key appears to be invalid or expired. Please update it.
              </p>
            )}

            {lastValidatedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Last validated: {formatDate(lastValidatedAt)}
              </p>
            )}
          </div>

          <button
            onClick={handleDeleteClick}
            disabled={isLoading}
            className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete API key"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm mb-3">
            Are you sure you want to delete your API key? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={handleDeleteCancel}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
            >
              No, cancel
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div role="status" className="text-green-600 text-sm">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
