'use client'

/**
 * GoalActionBar Example Usage
 *
 * This file demonstrates how to use the GoalActionBar component
 * in a parent component that manages goal selection state.
 */

import { useState } from 'react'
import GoalActionBar from './GoalActionBar'

export default function GoalActionBarExample() {
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])

  const handleArchive = () => {
    console.log('Archiving goals:', selectedGoalIds)
    // Make API call to archive goals
    // After success, clear selection
    setSelectedGoalIds([])
  }

  const handleDelete = () => {
    console.log('Deleting goals:', selectedGoalIds)
    // Make API call to delete goals
    // After success, clear selection
    setSelectedGoalIds([])
  }

  const handleClearSelection = () => {
    setSelectedGoalIds([])
  }

  // Example goal selection toggle
  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        GoalActionBar Example
      </h1>

      {/* Example goal cards with checkboxes */}
      <div className="space-y-4 mb-20">
        {['goal-1', 'goal-2', 'goal-3'].map((goalId) => (
          <div
            key={goalId}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <input
              type="checkbox"
              checked={selectedGoalIds.includes(goalId)}
              onChange={() => toggleGoalSelection(goalId)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Example Goal {goalId.split('-')[1]}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the checkbox to select this goal
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar appears when goals are selected */}
      <GoalActionBar
        selectedCount={selectedGoalIds.length}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onClearSelection={handleClearSelection}
      />
    </div>
  )
}
