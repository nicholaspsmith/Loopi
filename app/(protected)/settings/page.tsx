'use client'

import { useState, useEffect } from 'react'
import ApiKeyForm from '@/components/settings/ApiKeyForm'
import ApiKeyDisplay from '@/components/settings/ApiKeyDisplay'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { GetApiKeyResponse } from '@/lib/types/api-key'

/**
 * Settings Page
 *
 * User settings including Claude API key management
 */
export default function SettingsPage() {
  const [apiKeyData, setApiKeyData] = useState<GetApiKeyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchApiKeyStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/settings/api-key')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch API key status')
      }

      setApiKeyData(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchApiKeyStatus()
  }, [])

  const handleSaveApiKey = async (apiKey: string) => {
    setSuccessMessage(null)
    setError(null)

    const response = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save API key')
    }

    // Show success message before refreshing (so it persists through re-render)
    setSuccessMessage('API key saved successfully')

    // Refresh the API key status
    await fetchApiKeyStatus()
  }

  const handleDeleteApiKey = async () => {
    setSuccessMessage(null)
    setError(null)

    const response = await fetch('/api/settings/api-key', {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete API key')
    }

    // Show success message before refreshing
    setSuccessMessage('API key deleted successfully')

    // Refresh the API key status
    await fetchApiKeyStatus()
  }

  return (
    <div className="mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Claude API Key
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Provide your own Claude API key to use Claude for chat and flashcard generation. Your key
          is encrypted and stored securely.
        </p>

        {successMessage && (
          <div
            role="status"
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm"
          >
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : apiKeyData?.exists ? (
          <div className="space-y-6">
            <ApiKeyDisplay
              keyPreview={apiKeyData.keyPreview || ''}
              onDelete={handleDeleteApiKey}
              isValid={apiKeyData.isValid}
              lastValidatedAt={apiKeyData.lastValidatedAt || undefined}
            />
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Update API Key
              </h3>
              <ApiKeyForm onSave={handleSaveApiKey} />
            </div>
          </div>
        ) : (
          <ApiKeyForm onSave={handleSaveApiKey} />
        )}
      </section>

      <section className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Provider</h2>
        {apiKeyData?.exists ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                Claude API Active
              </h3>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              Your AI-powered features are using Claude API for faster, higher-quality responses.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Using Ollama (Free Local AI)
              </h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              You&apos;re currently using Ollama, a free local AI model. This is completely free and
              private, but responses may be slower. Add your Claude API key above for improved
              performance and quality.
            </p>
            <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Benefits of Claude API: Faster responses, better accuracy, and support for advanced
                features.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
