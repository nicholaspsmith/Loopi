'use client'

import { useState, useEffect } from 'react'
import ApiKeyForm from '@/components/settings/ApiKeyForm'
import ApiKeyDisplay from '@/components/settings/ApiKeyDisplay'
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

    // Refresh the API key status
    await fetchApiKeyStatus()
  }

  const handleDeleteApiKey = async () => {
    const response = await fetch('/api/settings/api-key', {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete API key')
    }

    // Refresh the API key status
    await fetchApiKeyStatus()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-2">Claude API Key</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
          Provide your own Claude API key to use Claude for chat and flashcard generation.
          Your key is encrypted and stored securely.
        </p>

        {isLoading ? (
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : apiKeyData?.exists ? (
          <ApiKeyDisplay
            keyPreview={apiKeyData.keyPreview || ''}
            onDelete={handleDeleteApiKey}
            isValid={apiKeyData.isValid}
            lastValidatedAt={apiKeyData.lastValidatedAt || undefined}
          />
        ) : (
          <ApiKeyForm onSave={handleSaveApiKey} />
        )}
      </section>

      <section className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-xl font-semibold mb-2">AI Provider</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {apiKeyData?.exists
            ? 'Claude is currently active for AI-powered features.'
            : 'Ollama is currently active. Add a Claude API key to use Claude instead.'}
        </p>
      </section>
    </div>
  )
}
