import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/pg-client'

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and its dependencies.
 * Used by Docker healthcheck and monitoring systems.
 */
export async function GET() {
  const checks: Record<string, { status: string; message?: string }> = {}

  // Check PostgreSQL database
  try {
    const db = getDb()
    await db.execute('SELECT 1')
    checks.database = { status: 'healthy' }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    }
  }

  // Check Ollama availability
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })

    if (response.ok) {
      checks.ollama = { status: 'healthy' }
    } else {
      checks.ollama = {
        status: 'unhealthy',
        message: `Ollama returned status ${response.status}`,
      }
    }
  } catch (error) {
    checks.ollama = {
      status: 'degraded',
      message: 'Ollama unavailable - Claude API fallback active',
    }
  }

  // Check environment variables
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'ENCRYPTION_KEY']
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

  if (missingEnvVars.length > 0) {
    checks.environment = {
      status: 'unhealthy',
      message: `Missing required env vars: ${missingEnvVars.join(', ')}`,
    }
  } else {
    checks.environment = { status: 'healthy' }
  }

  // Overall status
  const allHealthy = Object.values(checks).every((check) => check.status === 'healthy')
  const anyUnhealthy = Object.values(checks).some((check) => check.status === 'unhealthy')

  const overallStatus = anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded'

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: overallStatus === 'unhealthy' ? 503 : 200 }
  )
}
