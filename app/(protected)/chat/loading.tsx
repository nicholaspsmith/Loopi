/**
 * Chat Route Loading State
 *
 * Displays while the chat interface is loading.
 * Shows skeleton UI matching the chat layout.
 */

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-200px)] flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-pulse">
        {/* Message skeletons */}
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-16 rounded bg-gray-200"></div>
            <div className="rounded-lg bg-gray-200 p-4">
              <div className="h-4 w-full rounded bg-gray-300 mb-2"></div>
              <div className="h-4 w-5/6 rounded bg-gray-300"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-16 rounded bg-gray-200 ml-auto"></div>
            <div className="rounded-lg bg-blue-100 p-4">
              <div className="h-4 w-full rounded bg-blue-200 mb-2"></div>
              <div className="h-4 w-4/5 rounded bg-blue-200"></div>
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-16 rounded bg-gray-200"></div>
            <div className="rounded-lg bg-gray-200 p-4">
              <div className="h-4 w-full rounded bg-gray-300 mb-2"></div>
              <div className="h-4 w-3/4 rounded bg-gray-300"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex space-x-2 animate-pulse">
          <div className="flex-1 h-12 rounded-lg bg-gray-200"></div>
          <div className="h-12 w-12 rounded-lg bg-gray-200"></div>
        </div>
      </div>
    </div>
  )
}
