import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'
import Navigation from '@/components/nav/Navigation'
import { PageTransition } from '@/components/ui/PageTransition'
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner'

/**
 * Protected Layout
 *
 * Layout for authenticated routes.
 * Includes navigation and logout functionality.
 * Middleware handles redirect if not authenticated.
 */

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Double-check authentication (middleware should handle this)
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  MemoryLoop
                </h1>
                {session.user?.name && (
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
                    Welcome, {session.user.name}
                  </span>
                )}
              </div>

              <LogoutButton />
            </div>

            {/* Navigation Tabs */}
            <Navigation />
          </div>
        </div>
      </header>

      {/* Email Verification Banner */}
      {session.user?.email && !session.user.emailVerified && (
        <EmailVerificationBanner userEmail={session.user.email} />
      )}

      {/* Main content */}
      <main className="mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
