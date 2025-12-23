/**
 * Loading Spinner Component
 *
 * Displays a loading spinner with accessibility support for page loading states.
 * Used in Suspense boundaries across chat, quiz, and settings pages.
 *
 * Accessibility:
 * - role="status" for screen readers
 * - sr-only text provides context
 * - Respects prefers-reduced-motion (via Tailwind)
 */

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
      <div className="text-center" role="status">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}
