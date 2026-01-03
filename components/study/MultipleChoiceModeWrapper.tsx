'use client'

import { useMemo } from 'react'
import MultipleChoiceMode from './MultipleChoiceMode'
import FlashcardMode from './FlashcardMode'
import { useJobStatus } from '@/hooks/useJobStatus'
import { GenerationPlaceholder } from '@/components/ui/GenerationPlaceholder'

/**
 * MultipleChoiceModeWrapper Component
 *
 * Handles background distractor generation for multiple choice cards.
 * Shows loading state while distractors are being generated,
 * then renders MultipleChoiceMode when ready.
 * Falls back to FlashcardMode if generation fails.
 */

interface MultipleChoiceModeWrapperProps {
  question: string
  answer: string
  distractors?: string[]
  distractorsJobId?: string
  onRate: (rating: 1 | 2 | 3, responseTimeMs: number) => void
  cardNumber: number
  totalCards: number
}

export default function MultipleChoiceModeWrapper({
  question,
  answer,
  distractors,
  distractorsJobId,
  onRate,
  cardNumber,
  totalCards,
}: MultipleChoiceModeWrapperProps) {
  // Only poll if we have a jobId and no distractors yet
  const shouldPoll = distractorsJobId && !distractors
  const { job, isPolling, error, retry } = useJobStatus(shouldPoll ? distractorsJobId : null)

  // Compute final state based on job and initial distractors
  const { finalDistractors, shouldFallback, isLoading } = useMemo(() => {
    // If distractors provided initially, use them
    if (distractors && distractors.length >= 3) {
      return { finalDistractors: distractors, shouldFallback: false, isLoading: false }
    }

    // If polling and job is in progress
    if (isPolling && job && job.status !== 'completed' && job.status !== 'failed') {
      return { finalDistractors: undefined, shouldFallback: false, isLoading: true }
    }

    // If job completed with valid distractors
    if (job?.status === 'completed' && job.result) {
      const result = job.result as { distractors?: string[] }
      if (result.distractors && result.distractors.length >= 3) {
        return { finalDistractors: result.distractors, shouldFallback: false, isLoading: false }
      }
    }

    // If job failed or invalid result
    if (job?.status === 'failed' || (job?.status === 'completed' && !job.result)) {
      return { finalDistractors: undefined, shouldFallback: true, isLoading: false }
    }

    // If error occurred
    if (error && !isPolling) {
      return { finalDistractors: undefined, shouldFallback: true, isLoading: false }
    }

    return { finalDistractors: undefined, shouldFallback: false, isLoading: false }
  }, [distractors, job, isPolling, error])

  // If distractors are available, render MC mode directly
  if (finalDistractors && finalDistractors.length >= 3) {
    return (
      <MultipleChoiceMode
        question={question}
        answer={answer}
        distractors={finalDistractors}
        onRate={onRate}
        cardNumber={cardNumber}
        totalCards={totalCards}
      />
    )
  }

  // If generation failed or we should fallback, use flashcard mode
  if (shouldFallback) {
    return (
      <FlashcardMode
        question={question}
        answer={answer}
        onRate={(rating) => onRate(Math.min(rating, 3) as 1 | 2 | 3, 0)}
        cardNumber={cardNumber}
        totalCards={totalCards}
      />
    )
  }

  // Show loading placeholder while generating distractors
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        {/* Screen reader announcement for card navigation */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          Card {cardNumber} of {totalCards}
        </div>

        {/* Progress */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4" aria-hidden="true">
          Card {cardNumber} of {totalCards}
        </div>

        {/* Question */}
        <div className="w-full max-w-2xl mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Question</p>
            <p className="text-xl text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {question}
            </p>
          </div>
        </div>

        {/* Loading placeholder */}
        <div className="w-full max-w-2xl" data-testid="generation-placeholder">
          <GenerationPlaceholder
            jobType="distractor"
            status={(job?.status === 'completed' ? 'processing' : job?.status) || 'pending'}
            error={error || undefined}
            onRetry={retry}
          />
        </div>
      </div>
    )
  }

  // Fallback: if no job and no distractors, use flashcard mode
  return (
    <FlashcardMode
      question={question}
      answer={answer}
      onRate={(rating) => onRate(Math.min(rating, 3) as 1 | 2 | 3, 0)}
      cardNumber={cardNumber}
      totalCards={totalCards}
    />
  )
}
