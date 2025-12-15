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
    async jwt({ token, user }) {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }

      return token
    },
    async session({ session, token }) {
      // Add user ID to session from token
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string | null
      }

      return session
    },
  },
})
