'use client'

import { useState } from 'react'
import { validateApiKey } from '@/lib/validation/api-key'

interface ApiKeyFormProps {
  onSave: (apiKey: string) => Promise<void>
  onDelete?: () => Promise<void>
  existingKeyPreview?: string
}

/**
 * ApiKeyForm Component
 *
 * Form for entering and saving Claude API keys
 */
export default function ApiKeyForm({ onSave, onDelete, existingKeyPreview }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    setError(null)
    setSuccessMessage(null)
    setValidationMessage(null)
  }

  const handleBlur = () => {
    if (apiKey.trim()) {
      const validation = validateApiKey(apiKey)
      if (!validation.valid) {
        setError(validation.error || 'Invalid API key')
      }
    }
  }

  const handleValidate = async () => {
    setError(null)
    setSuccessMessage(null)
    setValidationMessage(null)

    // Basic format validation first
    const formatValidation = validateApiKey(apiKey)
    if (!formatValidation.valid) {
      setError(formatValidation.error || 'Invalid API key format')
      return
    }

    setIsValidating(true)

    try {
      const response = await fetch('/api/settings/api-key/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setValidationMessage('API key is valid and working correctly!')
      } else {
        setError(data.error || 'API key validation failed')
      }
    } catch (err) {
      setError('Failed to validate API key. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)

    const validation = validateApiKey(apiKey)
    if (!validation.valid) {
      setError(validation.error || 'Invalid API key')
      return
    }

    setIsLoading(true)

    try {
      await onSave(apiKey)
      setSuccessMessage('API key saved successfully')
      setApiKey('')
    } catch (err) {
      setError('Failed to save API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!onDelete) return

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

  const isValid = apiKey.trim() && validateApiKey(apiKey).valid

  return (
    <div className="space-y-4">
      {existingKeyPreview && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">Current API Key:</p>
          <p className="font-mono text-sm mt-1">{existingKeyPreview}</p>
        </div>
      )}

      <div>
        <label htmlFor="api-key" className="block text-sm font-medium mb-2">
          API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="sk-ant-api03-..."
          aria-describedby={error ? 'api-key-error' : undefined}
        />
        {error && (
          <p id="api-key-error" className="text-red-600 text-sm mt-1">
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={!apiKey.trim() || isLoading || isValidating}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isValidating}
          title="Validate your Claude API key"
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>

        <button
          onClick={handleSave}
          disabled={!isValid || isLoading || isValidating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isLoading}
          title={existingKeyPreview ? 'Update your Claude API key' : 'Save your Claude API key'}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>

        {existingKeyPreview && onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isLoading || isValidating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete your Claude API key"
          >
            Delete
          </button>
        )}
      </div>

      {validationMessage && (
        <div role="status" className="text-green-600 text-sm">
          {validationMessage}
        </div>
      )}

      {successMessage && (
        <div role="status" className="text-green-600 text-sm">
          {successMessage}
        </div>
      )}

      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
        >
          <p id="delete-dialog-description" className="text-sm mb-3">
            Are you sure you want to delete your API key?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              aria-label="Confirm deletion"
              aria-busy={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Confirm'}
            </button>
            <button
              onClick={handleDeleteCancel}
              disabled={isLoading}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
              aria-label="Cancel deletion"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
