'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DuplicateWarningModal from '@/components/dedup/DuplicateWarningModal'
import type { DuplicateCheckResult } from '@/lib/dedup/types'

/**
 * GoalForm Component (T028)
 *
 * Form for creating/editing learning goals with:
 * - Title input (required)
 * - Description textarea (optional)
 * - Generate tree toggle
 * - Duplicate detection before creation (T022)
 */

interface GoalFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id?: string
    title: string
    description: string | null
  }
  onSuccess?: () => void
}

export default function GoalForm({ mode, initialData, onSuccess }: GoalFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [generateTree, setGenerateTree] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Duplicate detection state (only for create mode)
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  // Check for duplicates before creating (only for create mode)
  const checkDuplicate = async (): Promise<boolean> => {
    if (mode !== 'create') return false

    setIsCheckingDuplicate(true)
    try {
      const response = await fetch('/api/goals/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined }),
      })

      if (!response.ok) {
        // If dedup check fails, allow creation to proceed
        console.warn('Duplicate check failed, proceeding with creation')
        return false
      }

      const result: DuplicateCheckResult = await response.json()

      // If check was skipped (short content) or no duplicates, proceed
      if (result.checkSkipped || !result.isDuplicate) {
        return false
      }

      // Duplicates found - show warning modal
      setDuplicateResult(result)
      setShowDuplicateModal(true)
      return true
    } catch (err) {
      console.warn('Duplicate check error, proceeding with creation:', err)
      return false
    } finally {
      setIsCheckingDuplicate(false)
    }
  }

  // Actually create or update the goal
  const saveGoal = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const endpoint = mode === 'create' ? '/api/goals' : `/api/goals/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          ...(mode === 'create' && { generateTree }),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save goal')
      }

      const data = await response.json()
      setDuplicateResult(null)

      if (onSuccess) {
        onSuccess()
      } else {
        // Navigate to the goal page
        router.push(`/goals/${data.goal?.id || initialData?.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // For create mode, check for duplicates first
    if (mode === 'create') {
      const hasDuplicate = await checkDuplicate()
      // If duplicates found, modal will be shown and user must decide
      if (hasDuplicate) return
    }

    await saveGoal()
  }

  // Handle user clicking "Create Anyway" in duplicate modal
  const handleProceedAnyway = () => {
    setShowDuplicateModal(false)
    saveGoal()
  }

  // Handle user clicking "Cancel" in duplicate modal
  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false)
    setDuplicateResult(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          What do you want to learn?
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Kubernetes Administration, Machine Learning Fundamentals"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          required
          maxLength={200}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Be specific - &quot;Python web development with FastAPI&quot; is better than
          &quot;Python&quot;
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Additional context (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why are you learning this? What's your background? Any specific focus areas?"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Generate Tree Toggle (only for create mode) */}
      {mode === 'create' && (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={generateTree}
              onChange={(e) => setGenerateTree(e.target.checked)}
              className="sr-only peer"
              disabled={isSubmitting}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Generate skill tree automatically
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your learning goal will be broken down into topics and subtopics
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isCheckingDuplicate || !title.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {(isSubmitting || isCheckingDuplicate) && (
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
          {isCheckingDuplicate
            ? 'Checking...'
            : mode === 'create'
              ? isSubmitting
                ? generateTree
                  ? 'Creating Goal & Generating Tree...'
                  : 'Creating Goal...'
                : 'Create Goal'
              : isSubmitting
                ? 'Saving...'
                : 'Save Changes'}
        </button>
      </div>

      {/* Duplicate Warning Modal (only for create mode) */}
      {mode === 'create' && duplicateResult && (
        <DuplicateWarningModal
          isOpen={showDuplicateModal}
          onClose={handleCancelDuplicate}
          onProceed={handleProceedAnyway}
          result={duplicateResult}
          itemType="goal"
        />
      )}
    </form>
  )
}
