'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * ArchiveDeckButton Component
 *
 * Client-side button for archiving/unarchiving decks.
 * Soft delete - archived decks don't count toward 100-deck limit.
 *
 * Maps to T047 in Phase 5 (User Story 2)
 */

interface ArchiveDeckButtonProps {
  deckId: string
  deckName: string
  isArchived: boolean
}

export default function ArchiveDeckButton({
  deckId,
  deckName,
  isArchived,
}: ArchiveDeckButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleArchive = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          archived: !isArchived,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${isArchived ? 'unarchive' : 'archive'} deck`)
      }

      // Redirect back to decks list
      router.push('/decks')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isArchived ? 'unarchive' : 'archive'} deck`)
      setIsProcessing(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {isArchived ? 'Unarchive Deck' : 'Archive Deck'}
      </button>
    )
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {isArchived ? 'Unarchive' : 'Archive'} &quot;{deckName}&quot;?
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {isArchived
          ? 'This will restore the deck to your active decks list.'
          : 'Archived decks are hidden from your decks list and do not count toward the 100-deck limit. You can unarchive them later.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleArchive}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : isArchived ? 'Yes, Unarchive' : 'Yes, Archive'}
        </button>
        <button
          onClick={() => {
            setShowConfirm(false)
            setError(null)
          }}
          disabled={isProcessing}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
