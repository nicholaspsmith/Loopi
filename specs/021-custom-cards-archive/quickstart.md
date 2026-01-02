# Quickstart: Custom Cards & Goal Management

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Prerequisites

- Node.js 20+
- PostgreSQL running (via Docker or local)
- Environment variables configured (`.env.local`)

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test                    # Unit tests
npm run test:integration    # Integration tests
npx playwright test         # E2E tests
```

## Feature Overview

### User Story 1: Custom Card Creation

**Location**: Skill tree node detail view
**Flow**: Node Detail -> "Add Custom Card" button -> Modal form -> Submit

**API Endpoint**:

```bash
POST /api/flashcards/custom
{
  "nodeId": "uuid",
  "question": "Your question (5-1000 chars)",
  "answer": "The answer (5-5000 chars)"
}
```

### User Story 2: Multi-Select Goal Management

**Location**: Goals page
**Flow**: Goals page -> Select goals via checkboxes -> Action bar appears -> Archive/Delete

**Archive API**:

```bash
POST /api/goals/archive
{
  "goalIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Delete API**:

```bash
DELETE /api/goals/delete
{
  "goalIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Restore API** (single goal):

```bash
POST /api/goals/restore
{
  "goalId": "uuid"
}
```

### User Story 3: Goal Limits

**Limits**:

- Maximum 6 active goals
- Maximum 6 archived goals
- Maximum 12 total goals

**Displayed on**: Goals page with indicator (e.g., "4/6 active goals")

## Key Files

### Custom Card Creation

| File                                   | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `app/api/flashcards/custom/route.ts`   | API endpoint                        |
| `components/goals/CustomCardForm.tsx`  | Form component                      |
| `components/goals/CustomCardModal.tsx` | Modal wrapper                       |
| `lib/db/operations/flashcards.ts`      | `createGoalFlashcard` (existing)    |
| `lib/db/operations/skill-nodes.ts`     | `incrementNodeCardCount` (existing) |

### Multi-Select Goal Management

| File                                 | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `app/api/goals/archive/route.ts`     | Bulk archive endpoint                                |
| `app/api/goals/delete/route.ts`      | Bulk delete endpoint                                 |
| `app/api/goals/restore/route.ts`     | Single goal restore endpoint                         |
| `app/(protected)/goals/page.tsx`     | Goals page with multi-select                         |
| `components/goals/GoalCard.tsx`      | Goal card with checkbox and Restore button           |
| `components/goals/GoalActionBar.tsx` | Floating action bar                                  |
| `components/goals/ConfirmDialog.tsx` | Confirmation modal                                   |
| `lib/db/operations/goals.ts`         | `bulkArchiveGoals`, `bulkDeleteGoals`, `restoreGoal` |

### Goal Limits

| File                                      | Purpose                      |
| ----------------------------------------- | ---------------------------- |
| `lib/constants/goals.ts`                  | `GOAL_LIMITS` constants      |
| `lib/db/operations/goals.ts`              | `getGoalCounts`              |
| `components/goals/GoalLimitIndicator.tsx` | Limit display component      |
| `app/api/goals/route.ts`                  | Limit check on goal creation |

## Testing

### Contract Tests

```bash
npm test -- tests/contract/custom-card.test.ts
npm test -- tests/contract/bulk-archive.test.ts
npm test -- tests/contract/bulk-delete.test.ts
npm test -- tests/contract/restore.test.ts
```

### Integration Tests

```bash
npm run test:integration -- tests/integration/goal-limits.test.ts
```

### E2E Tests

```bash
npx playwright test tests/e2e/custom-card.spec.ts
npx playwright test tests/e2e/goal-management.spec.ts
```

## Validation Rules

### Custom Card

- Question: 5-1000 characters
- Answer: 5-5000 characters
- Node must exist and belong to user's goal

### Bulk Archive

- 1-6 goals per request
- All goals must be owned by user
- All goals must be in "active" status
- archived_count + request_count <= 6

### Bulk Delete

- 1-12 goals per request
- All goals must exist
- All goals must be owned by user

### Restore Goal

- Goal must exist and be owned by user
- Goal must be in "archived" status
- active_count < 6 (else "Maximum 6 active goals reached")

### Goal Creation

- active_count < 6 (else "Maximum 6 active goals reached")
- total_count < 12 (else "Maximum 12 total goals reached")

## Common Issues

### "Maximum 6 active goals reached" error

User has 6 active goals. Must archive or delete a goal before creating a new one.

### "Maximum 6 archived goals reached" error

User has 6 archived goals. Must delete an archived goal before archiving another.

### "Cannot restore - Maximum 6 active goals reached" error

User has 6 active goals. Must archive or delete an active goal before restoring an archived goal.

### "Node not found" error

Ensure the nodeId exists and belongs to a goal owned by the authenticated user.

### Form not submitting

Check browser console for validation errors. Ensure question is 5+ chars.

## UI Components

### Goal Selection Flow

1. User hovers over goal card - checkbox appears
2. User clicks checkbox - goal is selected, action bar slides up
3. User selects more goals - count updates in action bar
4. User clicks "Archive" or "Delete" - confirmation modal appears
5. User confirms - operation executes, UI updates

### Limit Indicator

- Shows current count vs limit: "4/6 active goals"
- Changes color when approaching limit (5/6 = warning, 6/6 = error)
- Tooltip explains what happens when limit is reached

### Goal Restore Flow

1. User views archived goals section
2. Each archived goal shows "Restore" button (disabled if at active limit)
3. User clicks "Restore" - goal immediately moves to active list
4. Goal limit indicator updates to reflect new counts
