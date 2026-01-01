'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GoalProgress from '@/components/goals/GoalProgress'
import StudyNowButton from '@/components/goals/StudyNowButton'
import SkillTreeEditor from '@/components/skills/SkillTreeEditor'
import { type SkillNodeData } from '@/components/skills/SkillNode'
import { useJobStatus } from '@/hooks/useJobStatus'
import { GenerationPlaceholder } from '@/components/ui/GenerationPlaceholder'

/**
 * Goal Detail Page (T035)
 *
 * Displays a specific goal with:
 * - Goal info and progress
 * - Skill tree visualization and editing
 * - Actions (study, edit, archive)
 */

interface GoalData {
  id: string
  title: string
  description: string | null
  status: string
  masteryPercentage: number
  totalTimeSeconds: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  archivedAt: string | null
  skillTree: {
    id: string
    generatedBy: string
    nodeCount: number
    maxDepth: number
    nodes: SkillNodeData[]
  } | null
  stats: {
    totalCards: number
    cardsDue: number
    retentionRate: number
  }
}

export default function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const router = useRouter()
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setGoalId(p.goalId))
  }, [params])

  // Fetch goal data
  useEffect(() => {
    if (!goalId) return

    const fetchGoal = async () => {
      try {
        const response = await fetch(`/api/goals/${goalId}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Goal not found')
          }
          throw new Error('Failed to load goal')
        }
        const data = await response.json()
        setGoal(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchGoal()
  }, [goalId])

  // Handle create skill tree (for goals without one)
  const [skillTreeJobId, setSkillTreeJobId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // Poll job status
  const { job, isPolling, error: pollError, retry } = useJobStatus(skillTreeJobId)

  // Handle job completion
  useEffect(() => {
    if (!job || !goalId) return

    if (job.status === 'completed') {
      // Fetch the updated goal data with the new skill tree
      const fetchUpdatedGoal = async () => {
        try {
          const response = await fetch(`/api/goals/${goalId}`)
          if (response.ok) {
            const data = await response.json()
            setGoal(data)
          }
        } catch (err) {
          console.error('Error fetching updated goal:', err)
        }
      }
      fetchUpdatedGoal()
      setSkillTreeJobId(null) // Stop polling
    } else if (job.status === 'failed') {
      setCreateError(job.error || 'Failed to generate skill tree')
      setSkillTreeJobId(null) // Stop polling
    }
  }, [job, goalId])

  const handleCreateSkillTree = async () => {
    if (!goalId) return

    setCreateError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/skill-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.status === 202) {
        // Job created successfully - start polling
        const data = await response.json()
        setSkillTreeJobId(data.jobId)
      } else {
        // Error handling
        const data = await response.json()
        throw new Error(data.message || data.error || 'Failed to generate skill tree')
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to generate skill tree')
    }
  }

  const handleRetry = () => {
    setCreateError(null)
    retry()
  }

  // Poll flashcard generation jobs when skill tree exists but no cards yet
  const [flashcardJobsStatus, setFlashcardJobsStatus] = useState<{
    pending: number
    processing: number
    completed: number
    total: number
  } | null>(null)

  useEffect(() => {
    // Only poll if we have a skill tree but no cards
    if (!goalId || !goal?.skillTree || goal.stats.totalCards > 0) {
      setFlashcardJobsStatus(null)
      return
    }

    let isMounted = true
    let pollCount = 0
    let timeoutId: NodeJS.Timeout

    const pollFlashcardJobs = async () => {
      if (!isMounted) return

      try {
        const response = await fetch(`/api/goals/${goalId}/flashcard-jobs`)
        if (!response.ok) return

        const data = await response.json()
        if (!isMounted) return

        setFlashcardJobsStatus(data)

        // If all jobs completed, refresh goal data
        if (data.total > 0 && data.pending === 0 && data.processing === 0) {
          const goalResponse = await fetch(`/api/goals/${goalId}`)
          if (goalResponse.ok && isMounted) {
            const goalData = await goalResponse.json()
            setGoal(goalData)
          }
          return // Stop polling
        }

        // Continue polling
        pollCount++
        const delay = pollCount < 10 ? 3000 : pollCount < 30 ? 5000 : 10000
        if (pollCount < 100) {
          timeoutId = setTimeout(pollFlashcardJobs, delay)
        }
      } catch {
        // Retry on error
        timeoutId = setTimeout(pollFlashcardJobs, 5000)
      }
    }

    // Start polling after a short delay
    timeoutId = setTimeout(pollFlashcardJobs, 1000)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [goalId, goal?.skillTree, goal?.stats.totalCards])

  /* Archive functionality hidden for streamlined UI
  const handleArchive = async () => {
    if (!goalId || !confirm('Are you sure you want to archive this goal?')) return

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })

      if (!response.ok) throw new Error('Failed to archive goal')

      router.push('/goals')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }
  */

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !goal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{error || 'Goal not found'}</h1>
        <Link href="/goals" className="text-blue-600 hover:underline">
          Back to Goals
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/goals"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Goals
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-6">
          <GoalProgress masteryPercentage={goal.masteryPercentage} size="lg" />
          <div className="px-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {goal.title}
            </h1>
            {goal.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{goal.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{formatTime(goal.totalTimeSeconds)} studied</span>
              <span>•</span>
              <span>{goal.stats.totalCards} cards</span>
              <span>•</span>
              <span>{goal.stats.cardsDue} due for review</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {goal.skillTree && goal.skillTree.nodeCount > 0 && goal.stats.totalCards > 0 && (
            <StudyNowButton onClick={() => router.push(`/goals/${goal.id}/study?mode=guided`)} />
          )}
          {goal.skillTree && goal.skillTree.nodeCount > 0 && goal.stats.totalCards === 0 && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg flex items-center gap-2 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 dark:border-yellow-400"></div>
              <span>
                Generating flashcards
                {flashcardJobsStatus && flashcardJobsStatus.total > 0
                  ? ` (${flashcardJobsStatus.completed}/${flashcardJobsStatus.total} topics)`
                  : '...'}
              </span>
            </div>
          )}
          {/* Archive button hidden for streamlined UI
          <button
            onClick={handleArchive}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Archive
          </button>
*/}
        </div>
      </div>

      {/* Skill Tree Section */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Skill Tree</h2>

        {goal.skillTree ? (
          <SkillTreeEditor goalId={goal.id} nodes={goal.skillTree.nodes} />
        ) : isPolling && job ? (
          <div className="py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="max-w-2xl mx-auto px-6">
              <GenerationPlaceholder
                jobType="skill_tree"
                status={job.status as 'pending' | 'processing' | 'failed'}
                error={job.error || pollError || createError || undefined}
                onRetry={handleRetry}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No skill tree generated for this goal yet.
            </p>
            {createError && (
              <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{createError}</p>
            )}
            <button
              onClick={handleCreateSkillTree}
              disabled={isPolling}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Skill Tree
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
