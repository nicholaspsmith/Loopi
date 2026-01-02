# Goal Limits Contract Test Summary

## File Created

`/Users/nick/Code/memoryloop/tests/contract/goal-limits.test.ts`

## Purpose

Contract tests for goal creation and archiving limits per `specs/021-custom-cards-archive/spec.md`

## Test Coverage

### 1. getGoalCounts() Function Tests (4 tests)

- Returns zero counts for new user
- Counts active goals correctly
- Counts archived goals correctly
- Handles mixed active and archived goals

### 2. GOAL_LIMITS Constant Verification (2 tests)

- Verifies ACTIVE: 6, ARCHIVED: 6, TOTAL: 12
- Enforces total equals active plus archived

### 3. Goal Creation Under Limits - Success Cases (2 tests)

- Allows creating goals when under all limits
- Allows creating exactly 6 active goals

### 4. Goal Creation at Active Limit - Should Fail (1 test)

- `.fails` test: Should reject creating goal when active goals >= 6
- Error message: "Maximum 6 active goals reached. Archive or delete a goal to create a new one."
- **NOT YET IMPLEMENTED** - test is marked to fail

### 5. Goal Creation at Total Limit - Should Fail (1 test)

- `.fails` test: Should reject creating goal when total goals >= 12
- Error message: "Maximum 12 total goals reached. Delete a goal to continue."
- **NOT YET IMPLEMENTED** - test is marked to fail

### 6. Goal Archiving at Archived Limit - Should Fail (1 test)

- `.fails` test: Should reject archiving when archived goals >= 6
- Error message: "Maximum 6 archived goals reached. Delete an archived goal first."
- **NOT YET IMPLEMENTED** - test is marked to fail

### 7. Edge Cases (1 test)

- Allows creating new goal after archiving one (freeing active slot)

## Total Tests: 12

### Passing Tests: 9

Tests that verify current functionality (counting, constants, success cases, edge cases)

### Expected-to-Fail Tests: 3

Tests marked with `.fails` that verify limit enforcement is NOT yet implemented:

1. Active goal limit (>= 6)
2. Total goal limit (>= 12)
3. Archived goal limit (>= 6)

## Running the Tests

```bash
# Run with integration config (contract tests require database access)
npx vitest run tests/contract/goal-limits.test.ts --config vitest.integration.config.ts
```

## Implementation Status

These tests are written to FAIL initially (using `.fails` marker) because:

- The API endpoints do NOT yet enforce limits
- The database operations (`createGoal`, `archiveGoal`) do NOT check limits
- This is TDD - tests are written first to define the contract

## Next Steps

To make the failing tests pass:

1. Add limit checks to `createGoal()` in `/Users/nick/Code/memoryloop/lib/db/operations/goals.ts`
2. Add limit checks to `archiveGoal()` in the same file
3. Throw errors with appropriate messages when limits are exceeded
4. Remove `.fails` markers from the tests
5. Verify all tests pass

## Maps to Specification

- Feature: `specs/021-custom-cards-archive/spec.md`
- User Story 3: Goal Limits Enforcement (Priority: P1)
- Requirements: FR-005, FR-006, FR-007
