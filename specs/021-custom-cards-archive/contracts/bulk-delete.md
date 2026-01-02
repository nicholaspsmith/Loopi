# API Contract: Bulk Delete Goals

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Overview

Users can permanently delete multiple goals at once from the goals page. Deletion cascades to all related data (skill tree, nodes, flashcards, review logs).

## Endpoint: Bulk Delete Goals

```http
DELETE /api/goals/delete
Authorization: Bearer {token}
Content-Type: application/json

{
  "goalIds": ["goal-1", "goal-2", "goal-3"]
}
```

### Success Response (200 OK)

```json
{
  "deleted": 3,
  "goalIds": ["goal-1", "goal-2", "goal-3"],
  "limits": {
    "active": 2,
    "archived": 3,
    "total": 5
  }
}
```

### Validation Rules

| Field   | Constraint        | Error Message                                     |
| ------- | ----------------- | ------------------------------------------------- |
| goalIds | Array of UUIDs    | "Invalid goal ID format"                          |
| goalIds | 1-12 items        | "Select 1-12 goals to delete"                     |
| goalIds | All owned by user | "You don't have permission to delete these goals" |
| goalIds | All exist         | "Some goals not found"                            |

### Error Responses

```json
// 400 Bad Request - Validation Error
{
  "error": "Validation failed",
  "details": {
    "goalIds": "At least one goal must be selected"
  }
}

// 403 Forbidden - Not Owner
{
  "error": "You don't have permission to delete these goals"
}

// 404 Not Found - Goal Missing
{
  "error": "Some goals not found",
  "notFound": ["goal-2"]
}
```

## Implementation

**File**: `app/api/goals/delete/route.ts`

```typescript
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { bulkDeleteGoals, getGoalsByIds, getGoalCounts } from '@/lib/db/operations/goals'

const bulkDeleteSchema = z.object({
  goalIds: z.array(z.string().uuid()).min(1).max(12),
})

export async function DELETE(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = bulkDeleteSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { goalIds } = result.data

  // Verify goals exist
  const goals = await getGoalsByIds(goalIds)
  const foundIds = goals.map((g) => g.id)
  const notFound = goalIds.filter((id) => !foundIds.includes(id))

  if (notFound.length > 0) {
    return NextResponse.json({ error: 'Some goals not found', notFound }, { status: 404 })
  }

  // Verify ownership
  const notOwned = goals.filter((g) => g.userId !== session.user.id)
  if (notOwned.length > 0) {
    return NextResponse.json(
      { error: "You don't have permission to delete these goals" },
      { status: 403 }
    )
  }

  // Delete all goals (cascade handles related data)
  await bulkDeleteGoals(goalIds, session.user.id)
  const newCounts = await getGoalCounts(session.user.id)

  return NextResponse.json({
    deleted: goalIds.length,
    goalIds,
    limits: newCounts,
  })
}
```

## Database Operation

**File**: `lib/db/operations/goals.ts`

```typescript
export async function bulkDeleteGoals(goalIds: string[], userId: string): Promise<void> {
  const db = getDb()

  // Foreign keys with ON DELETE CASCADE handle:
  // - skill_trees -> skill_nodes -> flashcards
  // - review_logs (via flashcard cascade)
  await db
    .delete(learningGoals)
    .where(and(inArray(learningGoals.id, goalIds), eq(learningGoals.userId, userId)))

  console.log(`[Goals] Deleted ${goalIds.length} goals for user ${userId}`)
}
```

## Cascade Behavior

When a goal is deleted, the following data is automatically removed via database cascades:

```
LearningGoal (deleted)
  └── SkillTree (CASCADE)
        └── SkillNode (CASCADE)
              └── Flashcard (CASCADE)
                    └── ReviewLog (CASCADE)
                    └── Distractor (CASCADE)
```

## Testing Contract

```typescript
describe('Bulk Delete Goals', () => {
  it('deletes multiple goals in one request', async () => {
    // Given 3 goals owned by the user
    // When DELETE /api/goals/delete with goalIds array
    // Then all 3 goals are deleted and limits are returned
  })

  it('cascades deletion to related data', async () => {
    // Given a goal with skill tree, nodes, and flashcards
    // When goal is deleted
    // Then all related data is also deleted
  })

  it('rejects goals not owned by user', async () => {
    // Given a goal owned by another user
    // When DELETE /api/goals/delete includes that goal
    // Then returns 403 Forbidden
  })

  it('rejects non-existent goals', async () => {
    // Given a non-existent goal ID
    // When DELETE /api/goals/delete includes that ID
    // Then returns 404 with notFound list
  })

  it('can delete both active and archived goals', async () => {
    // Given 1 active goal and 1 archived goal
    // When DELETE /api/goals/delete with both IDs
    // Then both goals are deleted
  })

  it('returns updated goal counts after deletion', async () => {
    // Given goals to delete
    // When deleted successfully
    // Then response includes updated limits object
  })
})
```
