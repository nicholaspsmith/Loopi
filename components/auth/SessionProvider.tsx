'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

/**
 * SessionProvider Component
 *
 * Wraps the application with NextAuth SessionProvider.
 * This is a client component that provides session context to all child components.
 */

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
