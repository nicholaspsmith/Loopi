'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GoalCard from './GoalCard'
import GoalActionBar from './GoalActionBar'
import ConfirmDialog from './ConfirmDialog'

/**
 * GoalsPageContent Component (T030)
 *
 * Client-side interactive wrapper for the goals page.
 * Handles all stateful UI interactions while keeping the parent as a server component.
 *
 * Features:
 * - Tab switching between Active and Archived goals
 * - Multi-select mode with checkboxes
 * - Bulk archive/delete operations
 * - Single goal restore functionality
 * - Keyboard navigation (Escape to clear selection)
 * - Optimistic UI with error handling
 *
 * Part of Feature 021: Custom Cards & Archive Management
 */

interface Goal {
  id: string
  title: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  masteryPercentage: number
  totalTimeSeconds: number
  createdAt: string
  skillTree: {
    id: string
    nodeCount: number
    maxDepth: number
  } | null
}

interface GoalsPageContentProps {
  goals: Goal[] // Active goals (non-archived)
  archivedGoals: Goal[] // Archived goals
  counts: {
    active: number
    archived: number
    total: number
  }
}

type Tab = 'active' | 'archived'

export default function GoalsPageContent({ goals, archivedGoals, counts }: GoalsPageContentProps) {
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('active')

  // Selection state
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // Loading states
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [restoringGoalId, setRestoringGoalId] = useState<string | null>(null)

  // Dialog states
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Error/success messages (simple toast)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Get current tab's goals
  const currentGoals = activeTab === 'active' ? goals : archivedGoals

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedGoalIds(new Set())
    setSelectionMode(false)
  }, [activeTab])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedGoalIds.size > 0) {
        setSelectedGoalIds(new Set())
        setSelectionMode(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedGoalIds.size])

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Toggle selection mode
  const handleToggleSelectionMode = () => {
    if (selectionMode) {
      // Cancel selection mode
      setSelectedGoalIds(new Set())
      setSelectionMode(false)
    } else {
      // Enter selection mode
      setSelectionMode(true)
    }
  }

  // Toggle individual goal selection
  const handleToggleSelect = (goalId: string) => {
    const newSelected = new Set(selectedGoalIds)
    if (newSelected.has(goalId)) {
      newSelected.delete(goalId)
    } else {
      newSelected.add(goalId)
    }
    setSelectedGoalIds(newSelected)
  }

  // Clear selection
  const handleClearSelection = () => {
    setSelectedGoalIds(new Set())
    setSelectionMode(false)
  }

  // Bulk archive
  const handleArchiveClick = () => {
    setShowArchiveDialog(true)
  }

  const handleConfirmArchive = async () => {
    setIsArchiving(true)
    try {
      const response = await fetch('/api/goals/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalIds: Array.from(selectedGoalIds) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive goals')
      }

      setMessage({
        type: 'success',
        text: `Successfully archived ${data.archived} ${data.archived === 1 ? 'goal' : 'goals'}`,
      })
      setShowArchiveDialog(false)
      setSelectedGoalIds(new Set())
      setSelectionMode(false)
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to archive goals',
      })
    } finally {
      setIsArchiving(false)
    }
  }

  // Bulk delete
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch('/api/goals/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalIds: Array.from(selectedGoalIds) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete goals')
      }

      setMessage({
        type: 'success',
        text: `Successfully deleted ${data.deleted} ${data.deleted === 1 ? 'goal' : 'goals'}`,
      })
      setShowDeleteDialog(false)
      setSelectedGoalIds(new Set())
      setSelectionMode(false)
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete goals',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Single goal restore
  const handleRestore = async (goalId: string) => {
    setRestoringGoalId(goalId)
    try {
      const response = await fetch('/api/goals/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'ACTIVE_LIMIT_EXCEEDED') {
          throw new Error('Maximum 6 active goals reached. Archive or delete a goal first.')
        }
        throw new Error(data.error || 'Failed to restore goal')
      }

      setMessage({
        type: 'success',
        text: `Successfully restored "${data.goal.title}"`,
      })
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restore goal',
      })
    } finally {
      setRestoringGoalId(null)
    }
  }

  // Check if can restore (active < 6)
  const canRestore = counts.active < 6

  return (
    <>
      <div data-testid="goals-content" className="space-y-6">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            <button
              data-testid="goals-tab-active"
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'active'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Active
            </button>
            <button
              data-testid="goals-tab-archived"
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'archived'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Archived ({archivedGoals.length})
            </button>
          </div>

          {/* Selection mode toggle */}
          {currentGoals.length > 0 && (
            <button
              data-testid="selection-toggle"
              onClick={handleToggleSelectionMode}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectionMode
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>

        {/* Goals grid */}
        {currentGoals.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {activeTab === 'active'
                ? 'No active goals yet. Create your first goal to get started!'
                : 'No archived goals.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                selectionMode={selectionMode}
                isSelected={selectedGoalIds.has(goal.id)}
                onToggleSelect={handleToggleSelect}
                onRestore={handleRestore}
                canRestore={canRestore}
                isRestoring={restoringGoalId === goal.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action bar (appears when selection active) */}
      <GoalActionBar
        selectedCount={selectedGoalIds.size}
        onArchive={handleArchiveClick}
        onDelete={handleDeleteClick}
        onClearSelection={handleClearSelection}
      />

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        title="Archive Goals"
        message={`Are you sure you want to archive ${selectedGoalIds.size} ${selectedGoalIds.size === 1 ? 'goal' : 'goals'}? You can restore them later.`}
        confirmLabel="Archive"
        confirmVariant="warning"
        onConfirm={handleConfirmArchive}
        onCancel={() => setShowArchiveDialog(false)}
        isLoading={isArchiving}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Goals"
        message={`Are you sure you want to permanently delete ${selectedGoalIds.size} ${selectedGoalIds.size === 1 ? 'goal' : 'goals'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />

      {/* Toast message */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-md ${
            message.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
          data-testid="toast-message"
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span className="text-sm font-medium">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto hover:opacity-80"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
