import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getPopularTopics,
  getTopicsNeedingCuration,
  getTopicStats,
} from '@/lib/db/operations/topic-analytics'
import * as logger from '@/lib/logger'

/**
 * GET /api/analytics/topics
 *
 * Get topic trends for demand tracking.
 *
 * Per contracts/analytics.md
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const hasCurated = searchParams.get('hasCurated')

    // Get topics based on filter
    let topics
    if (hasCurated === 'false') {
      topics = await getTopicsNeedingCuration(limit)
    } else {
      topics = await getPopularTopics(limit)
    }

    // Filter by curated status if specified as true
    if (hasCurated === 'true') {
      topics = topics.filter((t) => t.hasCuratedTree)
    }

    // Get overall stats
    const stats = await getTopicStats()

    logger.info('Topic analytics retrieved', {
      userId: session.user.id,
      topicCount: topics.length,
      limit,
      hasCurated,
    })

    return NextResponse.json({
      topics: topics.map((t) => ({
        normalizedTopic: t.normalizedTopic,
        originalExamples: t.originalExamples as string[],
        userCount: t.userCount,
        goalCount: t.goalCount,
        firstSeenAt: t.firstSeenAt.toISOString(),
        lastSeenAt: t.lastSeenAt.toISOString(),
        hasCuratedTree: t.hasCuratedTree,
      })),
      total: stats.totalTopics,
      stats: {
        totalTopics: stats.totalTopics,
        totalGoals: stats.totalGoals,
        curatedTopics: stats.curatedTopics,
        uncuratedTopics: stats.uncuratedTopics,
      },
    })
  } catch (error) {
    logger.error('Failed to get topic analytics', error as Error, {
      path: '/api/analytics/topics',
    })

    return NextResponse.json({ error: 'Failed to get topic analytics' }, { status: 500 })
  }
}
