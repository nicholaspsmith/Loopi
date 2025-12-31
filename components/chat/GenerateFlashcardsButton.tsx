'use client'

import { useState, useEffect } from 'react'
import { useJobStatus } from '@/hooks/useJobStatus'
import { GenerationPlaceholder } from '@/components/ui/GenerationPlaceholder'

/**
 * GenerateFlashcardsButton Component
 *
 * Button to generate flashcards from assistant messages using background jobs
 *
 * Maps to:
 * - FR-008: "Generate Flashcards" action for assistant messages
 * - FR-017: Duplicate prevention (disabled when already generated)
 * - FR-018: Loading feedback during generation
 */

interface GenerateFlashcardsButtonProps {
  messageId: string
  conversationId: string
  hasFlashcards: boolean
  onGenerated?: (count: number) => void
}

interface GenerationResult {
  count: number
  flashcardIds: string[]
}

export default function GenerateFlashcardsButton({
  messageId,
  conversationId: _conversationId,
  hasFlashcards: initialHasFlashcards,
  onGenerated,
}: GenerateFlashcardsButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [hasFlashcards, setHasFlashcards] = useState(initialHasFlashcards)
  const [message, setMessage] = useState<string>('')
  const [flashcardCount, setFlashcardCount] = useState<number | null>(null)
  const [rateLimitError, setRateLimitError] = useState<{
    message: string
    retryAfter: number
  } | null>(null)

  // Poll job status
  const { job, isPolling, error: pollError, retry } = useJobStatus(jobId)

  // Handle job completion - responding to job polling updates
  useEffect(() => {
    if (!job) return

    if (job.status === 'completed') {
      const result = job.result as GenerationResult
      const count = result?.count || 0
      // eslint-disable-next-line
      setHasFlashcards(true)
      setFlashcardCount(count)
      setMessage(`${count} flashcard${count === 1 ? '' : 's'} generated!`)
      onGenerated?.(count)
      setJobId(null) // Stop polling
    } else if (job.status === 'failed') {
      // Job failed - error will be shown by GenerationPlaceholder
      setJobId(null) // Stop polling
    }
    // eslint-disable-next-line
  }, [job?.status, job?.result, job?.error, onGenerated])

  const handleGenerate = async () => {
    if (isPolling || hasFlashcards) return

    setMessage('')
    setRateLimitError(null)

    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      })

      const data = await response.json()

      if (response.status === 202) {
        // Job created successfully - start polling
        setJobId(data.job.id)
      } else {
        // Error handling
        if (data.code === 'FLASHCARDS_ALREADY_EXIST') {
          // FR-017: Duplicate prevention
          setHasFlashcards(true)
          setMessage('Flashcards have already been generated from this message')
        } else if (data.code === 'INSUFFICIENT_CONTENT') {
          // FR-019: Insufficient content
          setMessage('Insufficient educational content for flashcard generation')
        } else if (data.code === 'INVALID_MESSAGE_ROLE') {
          setMessage('Can only generate flashcards from assistant responses')
        } else if (data.code === 'RATE_LIMITED') {
          // Handle 429 rate limit
          setRateLimitError({
            message: data.error,
            retryAfter: data.retryAfter,
          })
        } else {
          setMessage(data.error || 'Failed to generate flashcards')
        }
      }
    } catch (error) {
      console.error('Error generating flashcards:', error)
      setMessage('Failed to generate flashcards. Please try again.')
    }
  }

  const handleRetry = () => {
    setRateLimitError(null)
    retry()
  }

  // Show placeholder during job processing
  if (isPolling && job) {
    return (
      <div className="mt-2">
        <GenerationPlaceholder
          jobType="flashcard"
          status={job.status as 'pending' | 'processing' | 'failed'}
          error={job.error || pollError || undefined}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <button
        onClick={handleGenerate}
        disabled={isPolling || hasFlashcards}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          hasFlashcards
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-not-allowed'
            : isPolling
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-wait'
              : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isPolling
          ? 'Generating flashcards...'
          : hasFlashcards
            ? '✓ Flashcards Generated'
            : '📝 Generate Flashcards'}
      </button>

      {message && (
        <p
          className={`text-sm ${
            flashcardCount !== null
              ? 'text-green-600 dark:text-green-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {message}
        </p>
      )}

      {rateLimitError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-700">{rateLimitError.message}</p>
          <p className="mt-1 text-xs text-amber-600">
            Retry after {rateLimitError.retryAfter} seconds
          </p>
        </div>
      )}
    </div>
  )
}
