# API Contract: Restore Goal

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Overview

Users can restore an archived goal back to active status, provided they have fewer than 6 active goals.

## Endpoint: Restore Goal

```http
POST /api/goals/restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "goalId": "goal-123"
}
```

### Success Response (200 OK)

```json
{
  "restored": true,
  "goal": {
    "id": "goal-123",
    "title": "Learn TypeScript",
    "status": "active",
    "archivedAt": null
  },
  "limits": {
    "active": 4,
    "archived": 2,
    "total": 6
  }
}
```

### Validation Rules

| Field  | Constraint           | Error Message                                                     |
| ------ | -------------------- | ----------------------------------------------------------------- |
| goalId | Valid UUID           | "Invalid goal ID format"                                          |
| goalId | Exists               | "Goal not found"                                                  |
| goalId | Owned by user        | "You don't have permission to restore this goal"                  |
| goalId | Status is 'archived' | "Goal is not archived"                                            |
| limits | active_count < 6     | "Maximum 6 active goals reached. Archive or delete a goal first." |

### Error Responses

```json
// 400 Bad Request - Validation Error
{
  "error": "Validation failed",
  "details": {
    "goalId": "Invalid goal ID format"
  }
}

// 403 Forbidden - Not Owner
{
  "error": "You don't have permission to restore this goal"
}

// 404 Not Found - Goal Missing
{
  "error": "Goal not found"
}

// 409 Conflict - Not Archived
{
  "error": "Goal is not archived"
}

// 422 Unprocessable Entity - Limit Exceeded
{
  "error": "Maximum 6 active goals reached. Archive or delete a goal first.",
  "code": "ACTIVE_LIMIT_EXCEEDED",
  "limits": {
    "active": 6,
    "archived": 3,
    "total": 9
  }
}
```

## Implementation

**File**: `app/api/goals/restore/route.ts`

```typescript
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { restoreGoal, getGoalById, getGoalCounts } from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'

const restoreGoalSchema = z.object({
  goalId: z.string().uuid(),
})

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = restoreGoalSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { goalId } = result.data

  // Verify goal exists
  const goal = await getGoalById(goalId)
  if (!goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  }

  // Verify ownership
  if (goal.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You don't have permission to restore this goal" },
      { status: 403 }
    )
  }

  // Verify goal is archived
  if (goal.status !== 'archived') {
    return NextResponse.json({ error: 'Goal is not archived' }, { status: 409 })
  }

  // Check active limit
  const counts = await getGoalCounts(session.user.id)
  if (counts.active >= GOAL_LIMITS.ACTIVE) {
    return NextResponse.json(
      {
        error: 'Maximum 6 active goals reached. Archive or delete a goal first.',
        code: 'ACTIVE_LIMIT_EXCEEDED',
        limits: counts,
      },
      { status: 422 }
    )
  }

  // Restore the goal
  const restored = await restoreGoal(goalId, session.user.id)
  const newCounts = await getGoalCounts(session.user.id)

  return NextResponse.json({
    restored: true,
    goal: {
      id: restored.id,
      title: restored.title,
      status: restored.status,
      archivedAt: restored.archivedAt,
    },
    limits: newCounts,
  })
}
```

## Database Operation

**File**: `lib/db/operations/goals.ts`

```typescript
export async function restoreGoal(goalId: string, userId: string): Promise<LearningGoal> {
  const db = getDb()
  const now = new Date()

  const [result] = await db
    .update(learningGoals)
    .set({
      status: 'active',
      archivedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(learningGoals.id, goalId),
        eq(learningGoals.userId, userId),
        eq(learningGoals.status, 'archived')
      )
    )
    .returning()

  console.log(`[Goals] Restored goal ${goalId} for user ${userId}`)
  return result
}
```

## Testing Contract

```typescript
describe('Restore Goal', () => {
  it('restores an archived goal to active status', async () => {
    // Given an archived goal owned by the user
    // And user has fewer than 6 active goals
    // When POST /api/goals/restore with goalId
    // Then goal status is 'active' and archivedAt is null
  })

  it('rejects restore when at active goal limit', async () => {
    // Given user has 6 active goals
    // And an archived goal
    // When POST /api/goals/restore
    // Then returns 422 with ACTIVE_LIMIT_EXCEEDED
  })

  it('rejects goals not owned by user', async () => {
    // Given an archived goal owned by another user
    // When POST /api/goals/restore
    // Then returns 403 Forbidden
  })

  it('rejects non-archived goals', async () => {
    // Given an active goal
    // When POST /api/goals/restore
    // Then returns 409 Conflict with "Goal is not archived"
  })

  it('returns updated goal counts after restore', async () => {
    // Given a successful restore
    // Then response includes updated limits object
    // And active count is incremented by 1
    // And archived count is decremented by 1
  })
})
```
