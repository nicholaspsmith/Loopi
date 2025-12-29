import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGoalsByUserId } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import GoalCard from '@/components/goals/GoalCard'

/**
 * Goals Dashboard Page (T033)
 *
 * Protected route - displays user's learning goals.
 * Replaces the old home/chat flow with goal-based entry.
 *
 * Features:
 * - List all goals with mastery progress
 * - Create new goal button
 * - Filter by status
 */

export const metadata = {
  title: 'My Goals - MemoryLoop',
}

export default async function GoalsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get all non-archived goals
  const rawGoals = await getGoalsByUserId(session.user.id, {
    includeArchived: false,
  })

  // Fetch skill tree info for each goal
  const goals = await Promise.all(
    rawGoals.map(async (goal) => {
      const tree = await getSkillTreeByGoalId(goal.id)
      return {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        status: goal.status as 'active' | 'paused' | 'completed' | 'archived',
        masteryPercentage: goal.masteryPercentage,
        totalTimeSeconds: goal.totalTimeSeconds,
        createdAt: goal.createdAt.toISOString(),
        skillTree: tree
          ? {
              id: tree.id,
              nodeCount: tree.nodeCount,
              maxDepth: tree.maxDepth,
            }
          : null,
      }
    })
  )

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Learning Goals
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress toward mastering new skills
          </p>
        </div>
        <Link
          href="/goals/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Goal
        </Link>
      </div>

      {/* Stats Summary */}
      {goals.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">Active Goals</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {activeGoals.length}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {completedGoals.length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-400">Avg. Mastery</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {goals.length > 0
                ? Math.round(goals.reduce((sum, g) => sum + g.masteryPercentage, 0) / goals.length)
                : 0}
              %
            </p>
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-gray-400 dark:text-gray-600">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Start your learning journey
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            Create a learning goal to generate a personalized skill tree to guide your study
          </p>
          <Link
            href="/goals/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Goal
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  )
}
