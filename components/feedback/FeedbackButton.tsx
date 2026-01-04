'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * FeedbackButton Component
 *
 * Floating feedback button that appears on all protected pages.
 * Opens a modal dialog for users to submit feedback that gets converted to GitHub issues.
 *
 * Features:
 * - Fixed position button in bottom-right corner
 * - Modal with feedback form (category, title, body)
 * - Form validation (min/max character counts)
 * - Loading state during submission
 * - Success/error messages
 * - Escape key to close
 * - Backdrop click to close
 * - Accessible ARIA attributes
 * - Mobile-friendly responsive design
 */

type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other'

interface FeedbackFormData {
  category: FeedbackCategory
  title: string
  body: string
}

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FeedbackFormData>({
    category: 'other',
    title: '',
    body: '',
  })

  // Close modal and reset state
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setIsOpen(false)
    // Reset form after animation completes
    setTimeout(() => {
      setFormData({ category: 'other', title: '', body: '' })
      setError(null)
      setSuccess(false)
    }, 200)
  }, [isSubmitting])

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, handleClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose()
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate body length
    if (formData.body.length < 10) {
      setError('Feedback must be at least 10 characters')
      return
    }

    if (formData.body.length > 5000) {
      setError('Feedback must not exceed 5000 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title || undefined,
          body: formData.body,
          category: formData.category,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      await response.json()
      setSuccess(true)

      // Close modal after showing success message
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if form is valid
  const isValid = formData.body.length >= 10 && formData.body.length <= 5000

  return (
    <>
      {/* Floating Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-40 group"
        aria-label="Send feedback"
        data-testid="feedback-button"
      >
        {/* Speech bubble icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Tooltip */}
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Send Feedback
        </span>
      </button>

      {/* Feedback Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
          data-testid="feedback-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl"
            data-testid="feedback-modal"
          >
            {success ? (
              /* Success Message */
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <svg
                    className="w-16 h-16 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Thank you!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your feedback has been submitted successfully.
                </p>
              </div>
            ) : (
              /* Feedback Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Header */}
                <div>
                  <h2
                    id="feedback-modal-title"
                    className="text-xl font-bold text-gray-900 dark:text-gray-100"
                  >
                    Send Feedback
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Help us improve MemoryLoop by sharing your thoughts
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    data-testid="feedback-error"
                  >
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Category Dropdown */}
                <div>
                  <label
                    htmlFor="feedback-category"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Category
                  </label>
                  <select
                    id="feedback-category"
                    data-testid="feedback-category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as FeedbackCategory })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={isSubmitting}
                  >
                    <option value="other">Other</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                  </select>
                </div>

                {/* Title Input (Optional) */}
                <div>
                  <label
                    htmlFor="feedback-title"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Title <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="feedback-title"
                    data-testid="feedback-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Brief summary of your feedback"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    maxLength={200}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.title.length}/200
                    </span>
                  </div>
                </div>

                {/* Feedback Body (Required) */}
                <div>
                  <label
                    htmlFor="feedback-body"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Feedback <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="feedback-body"
                    data-testid="feedback-body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Share your thoughts, report a bug, or request a feature..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    required
                    minLength={10}
                    maxLength={5000}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Minimum 10 characters
                    </span>
                    <span
                      className={`text-xs ${
                        formData.body.length < 10
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formData.body.length}/5000
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="feedback-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isValid}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                    data-testid="feedback-submit"
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
