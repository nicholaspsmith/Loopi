'use client'

import { signOut } from 'next-auth/react'

/**
 * LogoutButton Component
 *
 * Provides a button to sign out the current user.
 */

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: '/login',
    })
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Sign out of your account"
      className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      Log out
    </button>
  )
}
