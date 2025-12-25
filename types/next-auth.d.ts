/**
 * NextAuth.js Type Declarations
 *
 * Extends the default NextAuth types with custom fields
 */

import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name?: string | null
      emailVerified: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    emailVerified: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    emailVerified: boolean
  }
}
