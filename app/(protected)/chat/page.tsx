import { auth } from '@/auth'

/**
 * Chat Page
 *
 * Protected route - main chat interface.
 * Placeholder for Phase 4 (User Story 2) implementation.
 */

export const metadata = {
  title: 'Chat',
}

export default async function ChatPage() {
  const session = await auth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Chat</h2>
        <p className="mt-2 text-gray-600">
          Welcome to MemoryLoop! Chat interface coming in Phase 4.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-700">
          You are logged in as <strong>{session?.user?.email}</strong>
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Phase 3 (Authentication) is complete. The chat interface will be
          implemented in Phase 4.
        </p>
      </div>
    </div>
  )
}
