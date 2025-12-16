/**
 * Quiz Route Loading State
 *
 * Displays while the quiz interface is loading.
 * Shows skeleton UI matching the quiz layout.
 */

export default function QuizLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-2xl space-y-6 animate-pulse">
        {/* Progress bar skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="h-2 w-full rounded-full bg-gray-200"></div>
        </div>

        {/* Flashcard skeleton */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="space-y-3">
            <div className="h-6 w-24 rounded bg-gray-200 mx-auto"></div>
            <div className="h-4 w-full rounded bg-gray-200"></div>
            <div className="h-4 w-5/6 rounded bg-gray-200 mx-auto"></div>
            <div className="h-4 w-4/5 rounded bg-gray-200 mx-auto"></div>
          </div>

          {/* Button skeleton */}
          <div className="flex justify-center">
            <div className="h-10 w-32 rounded-lg bg-gray-200"></div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="flex justify-center space-x-4">
          <div className="h-16 w-24 rounded-lg bg-gray-200"></div>
          <div className="h-16 w-24 rounded-lg bg-gray-200"></div>
          <div className="h-16 w-24 rounded-lg bg-gray-200"></div>
        </div>
      </div>
    </div>
  )
}
