'use client'

import { useEffect } from 'react'
import { triggerConfetti } from '@/lib/animations/confetti'

/**
 * GuidedStudyFlow Component (T025, T028)
 *
 * Displays completion modals for guided study flow:
 * - Node completion with Continue/Return options
 * - Tree completion with congratulations
 *
 * Per specs/019-auto-gen-guided-study/contracts/guided-study.md
 */

interface GuidedStudyFlowProps {
  currentNode: {
    id: string
    title: string
    path: string
  } | null
  nodeProgress: {
    completedInNode: number
    totalInNode: number
  }
  isTreeComplete: boolean
  onContinue: () => void
  onReturn: () => void
}

export default function GuidedStudyFlow({
  currentNode,
  nodeProgress,
  isTreeComplete,
  onContinue,
  onReturn,
}: GuidedStudyFlowProps) {
  // Trigger confetti when tree is complete (T028)
  useEffect(() => {
    if (isTreeComplete) {
      triggerConfetti()
    }
  }, [isTreeComplete])

  // Show tree completion congratulations (T028)
  if (isTreeComplete) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Congratulations!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You&apos;ve completed all nodes in this skill tree. Excellent work!
          </p>

          <button
            onClick={onReturn}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Goal
          </button>
        </div>
      </div>
    )
  }

  // Show node completion modal
  const isNodeComplete =
    nodeProgress.completedInNode === nodeProgress.totalInNode && nodeProgress.totalInNode > 0

  if (!isNodeComplete || !currentNode) {
    return null // Don't show anything if node is not complete
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="text-green-600 dark:text-green-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Node Complete!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-1">
          You&apos;ve mastered &quot;{currentNode.title}&quot;
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Progress: {nodeProgress.completedInNode} / {nodeProgress.totalInNode} cards
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onContinue}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue to Next Node
          </button>
          <button
            onClick={onReturn}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Return to Goal
          </button>
        </div>
      </div>
    </div>
  )
}
