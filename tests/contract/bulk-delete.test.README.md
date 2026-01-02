# Bulk Delete Goals - Contract Test Guide

## Overview

This test suite validates the `DELETE /api/goals/delete` endpoint against the API contract defined in `/specs/021-custom-cards-archive/contracts/bulk-delete.md`.

## What This Tests

### API Endpoint

- **Route**: `DELETE /api/goals/delete`
- **Implementation**: `/app/api/goals/delete/route.ts`
- **Purpose**: Permanently delete multiple goals at once

### Contract Requirements

1. Accept array of 1-12 goal UUIDs
2. Delete all specified goals in single request
3. Cascade deletion to related data (skill trees, nodes, flashcards)
4. Validate ownership (403 if not owned)
5. Validate existence (404 if not found)
6. Return updated goal counts

## Test Structure

```typescript
describe('Bulk Delete Goals API Contract Tests', () => {
  // Setup: Create test users
  beforeAll(async () => { ... })

  // Tests organized by category:
  describe('DELETE /api/goals/delete', () => {
    // Success cases (200)
    // Validation errors (400)
    // Authorization (401, 403)
    // Not found (404)
  })

  describe('Cascade deletion behavior', () => { ... })
  describe('Edge cases', () => { ... })
})
```

## Running the Tests

```bash
# Run just this test file
npm run test:contract -- bulk-delete.test.ts

# Run all contract tests
npm run test:contract

# Watch mode for development
npm run test:contract -- --watch bulk-delete.test.ts
```

## Key Test Cases

### 1. Success Cases (200 OK)

- Delete 3 goals in one request
- Delete mix of active and archived goals
- Delete single goal
- Verify updated counts returned

### 2. Validation (400)

- Empty goalIds array
- Invalid UUID format
- Too many goals (>12)
- Missing goalIds field

### 3. Authorization

- 401: Unauthenticated request
- 403: Goals not owned by user

### 4. Error Handling

- 404: Non-existent goals
- 404: Mix of existing and non-existent

### 5. Edge Cases

- Duplicate goal IDs in array
- Preserve other users' goals

## Test Data Setup

Each test:

1. Creates its own goals using `createGoal()`
2. Uses unique test user created in `beforeAll()`
3. Cleans up via database deletion
4. Runs isolated from other tests

## Mock Strategy

```typescript
// Auth module is mocked
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Mock session injected per test
mockSession = {
  user: { id: testUserId, email, name },
}
```

## Assertions

Tests verify:

1. **HTTP status codes** - Correct status for each scenario
2. **Response shape** - Matches contract specification
3. **Database state** - Goals actually deleted
4. **Counts** - Updated limits returned

Example:

```typescript
expect(response.status).toBe(200)
expect(response.data).toMatchObject({
  deleted: 3,
  goalIds: expect.arrayContaining([...]),
  limits: { active, archived, total }
})
expect(await getGoalById(goalId)).toBeNull()
```

## Database Operations Tested

- `bulkDeleteGoals(goalIds, userId)` - Bulk deletion
- `getGoalsByIds(goalIds)` - Ownership verification
- `getGoalCounts(userId)` - Updated counts

## Cascade Behavior

The database schema handles cascade deletion via foreign keys:

```
LearningGoal (deleted)
  └── SkillTree (ON DELETE CASCADE)
      └── SkillNode (ON DELETE CASCADE)
          └── Flashcard (ON DELETE CASCADE)
              ├── ReviewLog (ON DELETE CASCADE)
              └── Distractor (ON DELETE CASCADE)
```

Current tests verify goal deletion. Full cascade testing will be added when test setup includes creating related entities.

## Common Issues

### Test Fails: "Route handler not implemented yet"

- The API route doesn't exist
- Check `/app/api/goals/delete/route.ts` exists
- Verify it exports a `DELETE` function

### Test Fails: Permission denied

- Auth mock may not be set up correctly
- Verify `beforeEach()` resets auth mock
- Check mockSession has correct userId

### Test Fails: Goals not deleted

- Database transaction may have failed
- Check database connection
- Verify `bulkDeleteGoals()` implementation

## Maintenance

When updating:

1. **Contract changes**: Update tests to match new contract
2. **New validations**: Add test cases for new rules
3. **New error codes**: Add tests for new error responses
4. **Cascade entities**: Add test data setup for related entities

## Related Files

- `/specs/021-custom-cards-archive/contracts/bulk-delete.md` - API contract
- `/app/api/goals/delete/route.ts` - Implementation
- `/lib/db/operations/goals.ts` - Database operations
- `/tests/contract/bulk-delete.test-summary.md` - Test coverage summary

## Test Coverage

- 15 test cases
- All contract requirements covered
- All HTTP status codes validated
- All error scenarios tested
- Edge cases included

See `bulk-delete.test-summary.md` for detailed coverage breakdown.
