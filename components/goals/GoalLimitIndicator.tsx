'use client'

import { useState } from 'react'

/**
 * GoalLimitIndicator Component
 *
 * Displays current goal count vs limit with visual feedback:
 * - Normal state (< 5 active): subtle gray text
 * - Warning state (5 active): yellow color
 * - Error state (6 active): red color
 * - Hover tooltip explains what happens when limit is reached
 *
 * Part of Feature 021: Custom Cards & Goal Management
 * Implements FR-008: Display current goal counts vs limits on goals page
 */

interface GoalLimitIndicatorProps {
  counts: {
    active: number
    archived: number
    total: number
  }
}

export default function GoalLimitIndicator({ counts }: GoalLimitIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Determine state based on active count
  const getActiveState = () => {
    if (counts.active >= 6) {
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        ),
      }
    }
    if (counts.active >= 5) {
      return {
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      }
    }
    return {
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      borderColor: 'border-gray-200 dark:border-gray-800',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    }
  }

  const state = getActiveState()

  // Tooltip content based on current state
  const getTooltipContent = () => {
    if (counts.active >= 6) {
      return 'Maximum active goals reached. Archive or delete a goal to create a new one.'
    }
    if (counts.archived >= 6) {
      return 'Maximum archived goals reached. Delete an archived goal before archiving more.'
    }
    if (counts.total >= 12) {
      return 'Maximum total goals reached. Delete a goal to continue.'
    }
    return 'Goal limits: 6 active, 6 archived, 12 total. Helps maintain focus and prevent overwhelm.'
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      role="status"
      aria-label={`${counts.active} of 6 active goals, ${counts.archived} of 6 archived goals`}
    >
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${state.bgColor} ${state.borderColor} transition-colors`}
        tabIndex={0}
      >
        <div className={state.color}>{state.icon}</div>
        <div className="flex items-baseline gap-3 text-sm">
          <span className={`font-medium ${state.color}`}>
            {counts.active}/6 <span className="font-normal">active</span>
          </span>
          <span className="text-gray-400 dark:text-gray-600">•</span>
          <span className="text-gray-600 dark:text-gray-400">
            {counts.archived}/6 <span className="font-normal">archived</span>
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-2 w-64 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          role="tooltip"
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45"></div>
          <p className="relative">{getTooltipContent()}</p>
        </div>
      )}
    </div>
  )
}
