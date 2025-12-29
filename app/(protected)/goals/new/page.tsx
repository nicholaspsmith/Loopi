import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import GoalForm from '@/components/goals/GoalForm'

/**
 * Create New Goal Page (T034)
 *
 * Protected route - goal creation flow with skill tree generation.
 *
 * Features:
 * - Goal title and description input
 * - Option to generate skill tree automatically
 * - Loading state during generation
 */

export const metadata = {
  title: 'Create Goal - MemoryLoop',
}

export default async function NewGoalPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Create a Learning Goal
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          What do you want to master? We&apos;ll help break it down into manageable topics.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <GoalForm mode="create" />
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          Tips for effective learning goals
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>
            • Be specific: &quot;Python web development with Django&quot; vs &quot;Python&quot;
          </li>
          <li>• Include your level: &quot;Advanced Kubernetes for DevOps engineers&quot;</li>
          <li>• Consider scope: Can you reasonably master this in weeks/months?</li>
          <li>• Think about your &quot;why&quot; - it helps with motivation</li>
        </ul>
      </div>
    </div>
  )
}
