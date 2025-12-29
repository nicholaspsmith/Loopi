'use client'

/**
 * Settings Page
 *
 * User settings and account information
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Service Status
        </h2>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
              Service Active
            </h3>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200">
            Skill tree generation, card creation, and study assistance are ready to use.
          </p>
        </div>
      </section>

      <section className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Account Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Additional account settings coming soon.
        </p>
      </section>
    </div>
  )
}
