import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

/**
 * NextAuth.js v5 Configuration
 *
 * Configures authentication with:
 * - Credentials provider (email/password)
 * - Custom callbacks for session and JWT
 * - Session expiration handling
 * - Route protection and redirects
 */

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Dynamic import to avoid Edge Runtime issues in middleware
        const { getUserByEmail, toPublicUser } = await import('@/lib/db/operations/users')
        const { verifyPassword } = await import('@/lib/auth/helpers')

        // Find user by email
        const user = await getUserByEmail(email)

        if (!user) {
          return null
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash)

        if (!isValid) {
          return null
        }

        // Return public user data (no password hash)
        const publicUser = toPublicUser(user)

        return {
          id: publicUser.id,
          email: publicUser.email,
          name: publicUser.name,
          emailVerified: user.emailVerified || false,
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.emailVerified = (user.emailVerified ?? false) as boolean

        // Store passwordChangedAt timestamp for session invalidation
        const { getUserById } = await import('@/lib/db/operations/users')
        const dbUser = await getUserById(user.id)
        if (dbUser?.passwordChangedAt) {
          token.passwordChangedAt = dbUser.passwordChangedAt
        }
      }

      // On every request, validate session hasn't been invalidated by password change
      if (token.id && trigger !== 'signIn' && trigger !== 'signUp') {
        const { getUserById } = await import('@/lib/db/operations/users')
        const dbUser = await getUserById(token.id as string)

        // If user doesn't exist, invalidate session
        if (!dbUser) {
          return null
        }

        // If password was changed after this JWT was issued, invalidate session
        const tokenPasswordChangedAt = token.passwordChangedAt as number | undefined
        const dbPasswordChangedAt = dbUser.passwordChangedAt

        if (dbPasswordChangedAt && tokenPasswordChangedAt) {
          if (dbPasswordChangedAt > tokenPasswordChangedAt) {
            // Password changed after JWT was issued - force re-authentication
            return null
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Add user fields from token
      return {
        ...session,
        user: {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          emailVerified: (token.emailVerified ?? false) as boolean,
        },
      }
    },
  },
})
