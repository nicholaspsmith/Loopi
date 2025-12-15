import { handlers } from '@/auth'

/**
 * NextAuth.js API Route Handler
 *
 * Handles all NextAuth.js authentication requests:
 * - POST /api/auth/signin
 * - POST /api/auth/signout
 * - GET /api/auth/session
 * - GET /api/auth/csrf
 * - GET /api/auth/providers
 */

export const { GET, POST } = handlers
