# API Contract: Bulk Archive Goals

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Overview

Users can archive multiple goals at once from the goals page. Archived goals count against the 6 archived goal limit.

## Endpoint: Bulk Archive Goals

```http
POST /api/goals/archive
Authorization: Bearer {token}
Content-Type: application/json

{
  "goalIds": ["goal-1", "goal-2", "goal-3"]
}
```

### Success Response (200 OK)

```json
{
  "archived": 3,
  "goals": [
    { "id": "goal-1", "title": "Learn TypeScript", "archivedAt": "2025-12-31T12:00:00Z" },
    { "id": "goal-2", "title": "Master React", "archivedAt": "2025-12-31T12:00:00Z" },
    { "id": "goal-3", "title": "Study Algorithms", "archivedAt": "2025-12-31T12:00:00Z" }
  ],
  "limits": {
    "active": 3,
    "archived": 5,
    "total": 8
  }
}
```

### Validation Rules

| Field   | Constraint            | Error Message                                      |
| ------- | --------------------- | -------------------------------------------------- |
| goalIds | Array of UUIDs        | "Invalid goal ID format"                           |
| goalIds | 1-6 items             | "Select 1-6 goals to archive"                      |
| goalIds | All owned by user     | "You don't have permission to archive these goals" |
| goalIds | All active status     | "Some goals are already archived"                  |
| limits  | archived + count <= 6 | "Maximum 6 archived goals reached"                 |

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
  "error": "You don't have permission to archive these goals"
}

// 409 Conflict - Already Archived
{
  "error": "Some goals are already archived",
  "alreadyArchived": ["goal-2"]
}

// 422 Unprocessable Entity - Limit Exceeded
{
  "error": "Maximum 6 archived goals reached. Delete an archived goal first.",
  "code": "ARCHIVE_LIMIT_EXCEEDED",
  "limits": {
    "active": 3,
    "archived": 6,
    "total": 9
  },
  "requested": 2,
  "available": 0
}
```

## Implementation

**File**: `app/api/goals/archive/route.ts`

```typescript
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { bulkArchiveGoals, getGoalsByIds, getGoalCounts } from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'

const bulkArchiveSchema = z.object({
  goalIds: z.array(z.string().uuid()).min(1).max(6),
})

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = bulkArchiveSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { goalIds } = result.data

  // Get current counts
  const counts = await getGoalCounts(session.user.id)
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

  // Verify ownership and status
  const goals = await getGoalsByIds(goalIds)

  const notOwned = goals.filter((g) => g.userId !== session.user.id)
  if (notOwned.length > 0) {
    return NextResponse.json(
      { error: "You don't have permission to archive these goals" },
      { status: 403 }
    )
  }

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
  const archived = await bulkArchiveGoals(goalIds, session.user.id)
  const newCounts = await getGoalCounts(session.user.id)

  return NextResponse.json({
    archived: archived.length,
    goals: archived.map((g) => ({
      id: g.id,
      title: g.title,
      archivedAt: g.archivedAt,
    })),
    limits: newCounts,
  })
}
```

## Constants

**File**: `lib/constants/goals.ts`

```typescript
export const GOAL_LIMITS = {
  ACTIVE: 6,
  ARCHIVED: 6,
  TOTAL: 12,
} as const

export type GoalLimits = typeof GOAL_LIMITS
```

## Database Operations

**File**: `lib/db/operations/goals.ts`

```typescript
export interface GoalCounts {
  active: number
  archived: number
  total: number
}

export async function getGoalCounts(userId: string): Promise<GoalCounts> {
  const db = getDb()
  const goals = await db
    .select({ status: learningGoals.status })
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))

  const active = goals.filter((g) => g.status === 'active').length
  const archived = goals.filter((g) => g.status === 'archived').length

  return { active, archived, total: goals.length }
}

export async function bulkArchiveGoals(goalIds: string[], userId: string): Promise<LearningGoal[]> {
  const db = getDb()
  const now = new Date()

  const result = await db
    .update(learningGoals)
    .set({
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        inArray(learningGoals.id, goalIds),
        eq(learningGoals.userId, userId),
        eq(learningGoals.status, 'active')
      )
    )
    .returning()

  console.log(`[Goals] Archived ${result.length} goals for user ${userId}`)
  return result
}

export async function getGoalsByIds(goalIds: string[]): Promise<LearningGoal[]> {
  const db = getDb()
  return db.select().from(learningGoals).where(inArray(learningGoals.id, goalIds))
}
```

## Testing Contract

```typescript
describe('Bulk Archive Goals', () => {
  it('archives multiple goals in one request', async () => {
    // Given 3 active goals owned by the user
    // When POST /api/goals/archive with goalIds array
    // Then all 3 goals are archived and limits are returned
  })

  it('rejects when archive limit would be exceeded', async () => {
    // Given user has 5 archived goals
    // When POST /api/goals/archive with 2 goals
    // Then returns 422 with ARCHIVE_LIMIT_EXCEEDED
  })

  it('rejects goals not owned by user', async () => {
    // Given a goal owned by another user
    // When POST /api/goals/archive includes that goal
    // Then returns 403 Forbidden
  })

  it('rejects already archived goals', async () => {
    // Given an already archived goal
    // When POST /api/goals/archive includes that goal
    // Then returns 409 Conflict with alreadyArchived list
  })

  it('returns updated goal counts after archiving', async () => {
    // Given active goals
    // When archived successfully
    // Then response includes updated limits object
  })
})
```
