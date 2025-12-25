import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata = {
  title: 'Forgot Password | MemoryLoop',
  description: 'Reset your MemoryLoop password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            No worries! We&apos;ll send you reset instructions.
          </p>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 px-8 py-10 shadow-md">
          <ForgotPasswordForm />
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Remember your password?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
