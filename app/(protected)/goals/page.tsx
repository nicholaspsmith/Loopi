import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getGoalsByUserId, getGoalCounts } from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import GoalsPageContent from '@/components/goals/GoalsPageContent'
import GoalStatsCards from '@/components/goals/GoalStatsCards'

/**
 * Goals Dashboard Page (T033)
 *
 * Protected route - displays user's learning goals.
 * Server component that fetches data and renders client component for interactions.
 *
 * Features:
 * - List active and archived goals with mastery progress
 * - Multi-select for bulk operations (T030)
 * - Archive/delete/restore functionality (T029, T030, T031)
 * - Create new goal button
 * - Goal limits enforcement
 */

export const metadata = {
  title: 'My Goals - MemoryLoop',
}

export default async function GoalsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Get goal counts for limit indicator
  const counts = await getGoalCounts(session.user.id)

  // Get all goals (both active and archived)
  const allGoalsRaw = await getGoalsByUserId(session.user.id, {
    includeArchived: true,
  })

  // Transform goals with skill tree info
  const transformGoal = async (goal: (typeof allGoalsRaw)[0]) => {
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
  }

  const allGoals = await Promise.all(allGoalsRaw.map(transformGoal))

  // Separate active and archived goals
  const goals = allGoals.filter((g) => g.status !== 'archived')
  const archivedGoals = allGoals.filter((g) => g.status === 'archived')

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  // Calculate average mastery for non-archived goals
  const averageMastery =
    goals.length > 0
      ? goals.reduce((sum, goal) => sum + (goal.masteryPercentage || 0), 0) / goals.length
      : 0

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-3 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
          My Learning Goals
        </h1>
        <p className="text-xs sm:text-base text-gray-600 dark:text-gray-400">
          Track your progress toward mastering new skills
        </p>
      </div>

      {/* Stats Cards */}
      {(goals.length > 0 || archivedGoals.length > 0) && (
        <GoalStatsCards
          activeCount={activeGoals.length}
          completedCount={completedGoals.length}
          averageMastery={averageMastery}
        />
      )}

      {/* Goals List - Client Component with Tabs & Multi-Select */}
      {goals.length === 0 && archivedGoals.length === 0 ? (
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
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md px-4">
            Create a learning goal to generate a personalized skill tree to guide your study
          </p>
          <Link
            href="/goals/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] flex items-center justify-center"
          >
            Create Your First Goal
          </Link>
        </div>
      ) : (
        <>
          <GoalsPageContent goals={goals} archivedGoals={archivedGoals} counts={counts} />
          {/* Mobile: New Goal button at bottom */}
          {counts.active < GOAL_LIMITS.ACTIVE && (
            <div className="sm:hidden mt-4">
              <Link
                href="/goals/new"
                className="w-full px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                data-testid="new-goal-button-mobile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="whitespace-nowrap">New Goal</span>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
