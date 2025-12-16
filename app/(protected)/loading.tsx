/**
 * Protected Routes Loading State
 *
 * Displays while protected routes are loading.
 * Used as a Suspense fallback by Next.js.
 */

export default function ProtectedLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          {/* Navigation skeleton */}
          <div className="mb-8 flex space-x-4 border-b border-gray-200 pb-4">
            <div className="h-8 w-20 rounded bg-gray-200"></div>
            <div className="h-8 w-20 rounded bg-gray-200"></div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-4">
            <div className="h-64 rounded-lg bg-gray-200"></div>
            <div className="h-32 rounded-lg bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
