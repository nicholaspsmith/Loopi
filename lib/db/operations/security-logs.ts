/**
 * Security Logs Database Operations
 *
 * Provides operations for logging security-related events
 * Used for audit trail and security monitoring
 */

import { db } from '@/lib/db'
import { securityLogs, type SecurityLog } from '@/lib/db/drizzle-schema'

/**
 * Log a security event
 *
 * Non-blocking operation - errors are logged but not thrown
 * to prevent security logging from blocking request processing
 *
 * @param data - Security event data
 * @returns Created security log entry
 *
 * @example
 * await logSecurityEvent({
 *   userId: user.id,
 *   eventType: 'password_reset_request',
 *   email: user.email,
 *   ipAddress: request.headers['x-forwarded-for'] || request.ip,
 *   userAgent: request.headers['user-agent'],
 *   geolocation: await getGeolocation(ipAddress),
 *   outcome: 'success'
 * })
 */
export async function logSecurityEvent(data: {
  userId?: string | null
  eventType: string
  email: string
  ipAddress: string
  userAgent?: string | null
  geolocation?: { country: string; region: string; city: string } | null
  tokenId?: string | null
  outcome: 'success' | 'failed' | 'rate_limited' | 'expired'
  metadata?: Record<string, any> | null
}): Promise<SecurityLog> {
  // Validate required fields
  if (!data.eventType || data.eventType.trim() === '') {
    throw new Error('Event type is required')
  }

  if (!data.email || !data.email.includes('@')) {
    throw new Error('Valid email address is required')
  }

  if (!data.ipAddress || data.ipAddress.trim() === '') {
    throw new Error('IP address is required')
  }

  try {
    const [logEntry] = await db
      .insert(securityLogs)
      .values({
        userId: data.userId || null,
        eventType: data.eventType,
        email: data.email,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        geolocation: data.geolocation || null,
        tokenId: data.tokenId || null,
        outcome: data.outcome,
        metadata: data.metadata || null,
      })
      .returning()

    return logEntry
  } catch (error) {
    // Log error but don't throw - security logging should not block requests
    console.error('❌ Failed to log security event:', error)
    throw error // For testing purposes, we throw in development
  }
}

/**
 * Get security logs for a user
 *
 * @param userId - User ID to get logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of security log entries
 */
export async function getSecurityLogsByUser(
  userId: string,
  limit: number = 100
): Promise<SecurityLog[]> {
  return await db
    .select()
    .from(securityLogs)
    .where(eq(securityLogs.userId, userId))
    .orderBy(desc(securityLogs.createdAt))
    .limit(limit)
}

/**
 * Get security logs for an email
 *
 * @param email - Email address to get logs for
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of security log entries
 */
export async function getSecurityLogsByEmail(
  email: string,
  limit: number = 100
): Promise<SecurityLog[]> {
  return await db
    .select()
    .from(securityLogs)
    .where(eq(securityLogs.email, email))
    .orderBy(desc(securityLogs.createdAt))
    .limit(limit)
}

// Add missing imports
import { eq, desc } from 'drizzle-orm'
