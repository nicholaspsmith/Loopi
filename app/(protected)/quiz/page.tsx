import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import QuizInterface from '@/components/quiz/QuizInterface'

/**
 * Quiz Practice Page
 *
 * Protected route - quiz interface for reviewing flashcards with FSRS scheduling.
 * Implements the second tab of the 2-tab layout (User Story 4).
 *
 * Features:
 * - Due flashcard review with spaced repetition
 * - FSRS-based scheduling (Again/Hard/Good/Easy ratings)
 * - Progress tracking through deck
 * - Completion notification
 *
 * Maps to T119 in Phase 6 (FR-011, FR-012, FR-015, FR-020, FR-021)
 */

export const metadata = {
  title: 'Quiz Practice - MemoryLoop',
}

export default async function QuizPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Quiz Practice</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review your flashcards using spaced repetition
        </p>
      </div>

      <QuizInterface />
    </div>
  )
}
