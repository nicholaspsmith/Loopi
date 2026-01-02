import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { bulkDeleteGoals, getGoalsByIds, getGoalCounts } from '@/lib/db/operations/goals'
import * as logger from '@/lib/logger'

/**
 * Bulk Delete Goals Schema
 * Based on specs/021-custom-cards-archive/contracts/bulk-delete.md
 */
const bulkDeleteSchema = z.object({
  goalIds: z
    .array(z.string().uuid('Invalid goal ID format'))
    .min(1, 'At least one goal must be selected')
    .max(12, 'Maximum 12 goals can be deleted at once'),
})

/**
 * DELETE /api/goals/delete
 *
 * Permanently delete multiple goals at once.
 * Cascades to all related data (skill tree, nodes, flashcards, review logs).
 * Maps to contracts/bulk-delete.md
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Validate request body
    const validation = bulkDeleteSchema.safeParse(body)
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

    // Verify goals exist
    const goals = await getGoalsByIds(goalIds)
    const foundIds = goals.map((g) => g.id)
    const notFound = goalIds.filter((id) => !foundIds.includes(id))

    if (notFound.length > 0) {
      return NextResponse.json({ error: 'Some goals not found', notFound }, { status: 404 })
    }

    // Verify ownership
    const notOwned = goals.filter((g) => g.userId !== userId)
    if (notOwned.length > 0) {
      return NextResponse.json(
        { error: "You don't have permission to delete these goals" },
        { status: 403 }
      )
    }

    // Delete all goals (cascade handles related data)
    await bulkDeleteGoals(goalIds, userId)
    const newCounts = await getGoalCounts(userId)

    logger.info('Bulk deleted goals', {
      userId,
      count: goalIds.length,
      goalIds,
    })

    return NextResponse.json({
      deleted: goalIds.length,
      goalIds,
      limits: newCounts,
    })
  } catch (error) {
    logger.error('Failed to bulk delete goals', error as Error)
    return NextResponse.json(
      { error: 'Failed to delete goals', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
