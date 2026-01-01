'use client'

import { useEffect } from 'react'

/**
 * StudySummary Component (T035-T037)
 *
 * Session completion summary screen showing:
 * - Cards completed (X/Y format)
 * - Accuracy percentage
 * - Done button to return to skill tree view
 *
 * Optional enhancement: Confetti effect for high accuracy (>= 80%)
 */

interface StudySummaryProps {
  cardsCompleted: number
  totalSelected: number
  correctCount: number
  goalId: string
  onDone: () => void
}

export default function StudySummary({
  cardsCompleted,
  totalSelected,
  correctCount,
  onDone,
}: StudySummaryProps) {
  // Calculate accuracy percentage
  const accuracy = cardsCompleted > 0 ? Math.round((correctCount / cardsCompleted) * 100) : 0

  // Optional enhancement: Trigger confetti for high accuracy
  useEffect(() => {
    if (accuracy >= 80) {
      // Dynamically import canvas-confetti to avoid SSR issues
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      })
    }
  }, [accuracy])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh]"
      data-testid="session-summary"
    >
      {/* Success Icon */}
      <div className="text-6xl mb-4">🎉</div>

      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Session Complete!
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {cardsCompleted}/{totalSelected}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cards Completed</p>
        </div>
        <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{accuracy}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy</p>
        </div>
      </div>

      {/* Done Button */}
      <button
        onClick={onDone}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Done
      </button>
    </div>
  )
}
