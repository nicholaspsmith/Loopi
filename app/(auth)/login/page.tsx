import { redirect } from 'next/navigation'
import Image from 'next/image'
import { auth } from '@/auth'
import LoginForm from '@/components/auth/LoginForm'

/**
 * Login Page
 *
 * Public route - displays login form for unauthenticated users.
 * Authenticated users are redirected to /goals.
 */

export const metadata = {
  title: 'Sign In',
}

export default async function LoginPage() {
  const session = await auth()

  // Redirect authenticated users to goals
  if (session) {
    redirect('/goals')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.svg" alt="Loopi Logo" width={80} height={80} priority />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-2">
            Loopi
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Access your Loopi account</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
