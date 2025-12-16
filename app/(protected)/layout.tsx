import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import Navigation from '@/components/nav/Navigation'

/**
 * Protected Layout
 *
 * Layout for authenticated routes.
 * Includes navigation and logout functionality.
 * Middleware handles redirect if not authenticated.
 */

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Double-check authentication (middleware should handle this)
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">MemoryLoop</h1>
              {session.user?.name && (
                <span className="text-sm text-gray-600">
                  Welcome, {session.user.name}
                </span>
              )}
            </div>

            <LogoutButton />
          </div>

          {/* Navigation Tabs */}
          <Navigation />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
