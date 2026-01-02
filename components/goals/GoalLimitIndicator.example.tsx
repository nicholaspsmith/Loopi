/**
 * GoalLimitIndicator Usage Example
 *
 * This file demonstrates how to use the GoalLimitIndicator component
 * in the goals page.
 */

import GoalLimitIndicator from './GoalLimitIndicator'

// Example 1: Normal state (under limit)
export function NormalStateExample() {
  return (
    <GoalLimitIndicator
      counts={{
        active: 3,
        archived: 2,
        total: 5,
      }}
    />
  )
}

// Example 2: Warning state (5 active)
export function WarningStateExample() {
  return (
    <GoalLimitIndicator
      counts={{
        active: 5,
        archived: 3,
        total: 8,
      }}
    />
  )
}

// Example 3: Error state (6 active - at limit)
export function ErrorStateExample() {
  return (
    <GoalLimitIndicator
      counts={{
        active: 6,
        archived: 4,
        total: 10,
      }}
    />
  )
}

// Example 4: Integration in goals page header
export function GoalsPageHeaderExample() {
  // In the actual goals page, you would fetch these counts from the server
  const counts = {
    active: 4,
    archived: 2,
    total: 6,
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Goals</h1>
      <GoalLimitIndicator counts={counts} />
    </div>
  )
}
