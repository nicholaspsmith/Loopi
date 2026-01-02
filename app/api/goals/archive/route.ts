import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { bulkArchiveGoals, getGoalsByIds, getGoalCounts } from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import * as logger from '@/lib/logger'

/**
 * Bulk Archive Goals Schema
 * Based on specs/021-custom-cards-archive/contracts/bulk-archive.md
 */
const bulkArchiveSchema = z.object({
  goalIds: z
    .array(z.string().uuid('Invalid goal ID format'))
    .min(1, 'At least one goal must be selected')
    .max(6, 'Maximum 6 goals can be archived at once'),
})

/**
 * POST /api/goals/archive
 *
 * Archive multiple goals at once.
 * Maps to contracts/bulk-archive.md
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Validate request body
    const validation = bulkArchiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { goalIds } = validation.data

    // Get current counts to check archive limit
    const counts = await getGoalCounts(userId)
    const available = GOAL_LIMITS.ARCHIVED - counts.archived

    if (goalIds.length > available) {
      return NextResponse.json(
        {
          error: 'Maximum 6 archived goals reached. Delete an archived goal first.',
          code: 'ARCHIVE_LIMIT_EXCEEDED',
          limits: counts,
          requested: goalIds.length,
          available,
        },
        { status: 422 }
      )
    }

    // Verify goals exist and get their current state
    const goals = await getGoalsByIds(goalIds)

    // Check for missing goals
    const foundIds = goals.map((g) => g.id)
    const notFound = goalIds.filter((id) => !foundIds.includes(id))
    if (notFound.length > 0) {
      return NextResponse.json({ error: 'Some goals not found', notFound }, { status: 404 })
    }

    // Verify ownership
    const notOwned = goals.filter((g) => g.userId !== userId)
    if (notOwned.length > 0) {
      return NextResponse.json(
        { error: "You don't have permission to archive these goals" },
        { status: 403 }
      )
    }

    // Check for already archived goals
    const alreadyArchived = goals.filter((g) => g.status === 'archived')
    if (alreadyArchived.length > 0) {
      return NextResponse.json(
        {
          error: 'Some goals are already archived',
          alreadyArchived: alreadyArchived.map((g) => g.id),
        },
        { status: 409 }
      )
    }

    // Archive all goals
    const archived = await bulkArchiveGoals(goalIds, userId)
    const newCounts = await getGoalCounts(userId)

    logger.info('Bulk archived goals', {
      userId,
      count: archived.length,
      goalIds: archived.map((g) => g.id),
    })

    return NextResponse.json({
      archived: archived.length,
      goals: archived.map((g) => ({
        id: g.id,
        title: g.title,
        archivedAt: g.archivedAt,
      })),
      limits: newCounts,
    })
  } catch (error) {
    logger.error('Failed to bulk archive goals', error as Error)
    return NextResponse.json(
      { error: 'Failed to archive goals', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
