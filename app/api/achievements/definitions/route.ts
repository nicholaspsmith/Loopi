import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/db/operations/achievements'
import { TITLE_LADDER } from '@/lib/db/operations/user-titles'
import * as logger from '@/lib/logger'

/**
 * GET /api/achievements/definitions
 *
 * Get all achievement and title definitions.
 * Useful for displaying locked achievements with requirements.
 *
 * Per contracts/achievements.md
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Achievement definitions retrieved', {
      userId: session.user.id,
    })

    return NextResponse.json({
      achievements: ACHIEVEMENT_DEFINITIONS,
      titles: TITLE_LADDER,
    })
  } catch (error) {
    logger.error('Failed to get achievement definitions', error as Error, {
      path: '/api/achievements/definitions',
    })

    return NextResponse.json({ error: 'Failed to get achievement definitions' }, { status: 500 })
  }
}
