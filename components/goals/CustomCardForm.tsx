'use client'

import { useState } from 'react'

/**
 * CustomCardForm Component (T014)
 *
 * Form for creating custom flashcards within skill tree nodes.
 * Users can add their own question/answer pairs for any topic.
 *
 * Features:
 * - Question input (5-1000 chars)
 * - Answer textarea (5-5000 chars)
 * - Character count indicators
 * - Inline validation
 * - API error handling
 */

interface CustomCardFormProps {
  nodeId: string
  nodeTitle: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function CustomCardForm({
  nodeId,
  nodeTitle,
  onSuccess,
  onCancel,
}: CustomCardFormProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    question?: string[]
    answer?: string[]
  }>({})

  const isValid = question.length >= 5 && answer.length >= 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/flashcards/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, question, answer }),
      })

      if (!response.ok) {
        const data = await response.json()

        // Handle validation errors
        if (response.status === 400 && data.details) {
          setFieldErrors(data.details)
          setError('Please fix the validation errors below')
        } else {
          throw new Error(data.error || 'Failed to create flashcard')
        }
        return
      }

      // Success - reset form and notify parent
      setQuestion('')
      setAnswer('')

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="custom-card-form">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Add Custom Card to {nodeTitle}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Create your own flashcard for this topic
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Question Input */}
      <div>
        <label
          htmlFor="custom-card-question"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Question
        </label>
        <textarea
          id="custom-card-question"
          data-testid="custom-card-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What concept or term do you want to remember?"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
          required
          maxLength={1000}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fieldErrors.question && (
              <span className="text-red-600 dark:text-red-400">{fieldErrors.question[0]}</span>
            )}
          </div>
          <span
            className={`text-xs ${
              question.length < 5
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {question.length}/1000
          </span>
        </div>
      </div>

      {/* Answer Textarea */}
      <div>
        <label
          htmlFor="custom-card-answer"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Answer
        </label>
        <textarea
          id="custom-card-answer"
          data-testid="custom-card-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Provide a clear and complete answer..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
          required
          maxLength={5000}
          disabled={isSubmitting}
        />
        <div className="flex justify-between mt-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {fieldErrors.answer && (
              <span className="text-red-600 dark:text-red-400">{fieldErrors.answer[0]}</span>
            )}
          </div>
          <span
            className={`text-xs ${
              answer.length < 5
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {answer.length}/5000
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          data-testid="custom-card-cancel"
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="custom-card-submit"
          disabled={isSubmitting || !isValid}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {isSubmitting ? 'Creating...' : 'Create Card'}
        </button>
      </div>
    </form>
  )
}
