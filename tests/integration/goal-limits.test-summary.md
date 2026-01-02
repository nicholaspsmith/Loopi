# Goal Limits Integration Test Summary

## Test File

`/Users/nick/Code/memoryloop/tests/integration/goal-limits.test.ts`

## Overview

HTTP-level integration tests for goal limit enforcement per `specs/021-custom-cards-archive`.

## Goal Limits (from `/Users/nick/Code/memoryloop/lib/constants/goals.ts`)

- **ACTIVE**: 6 goals maximum
- **ARCHIVED**: 6 goals maximum
- **TOTAL**: 12 goals maximum (active + archived)

## Test Scenarios

### 1. Active Goal Limit (6 max)

- ✅ **PASSES** (Expected to FAIL until implementation): `should reject goal creation when user has 6 active goals (422)`
  - Creates 6 goals, attempts to create 7th
  - Expected: 422 status with error "Maximum 6 active goals reached"
  - Actual: Currently returns 201 (goal created successfully) ❌
- ✅ **PASSES**: `should allow goal creation when user has 5 active goals`
  - Creates 5 goals, creates 6th successfully
  - Expected: 201 status
  - Actual: 201 status ✅

### 2. Archived Goal Limit (6 max)

- ✅ **PASSES** (Expected to FAIL until implementation): `should reject archiving when user has 6 archived goals (422)`
  - Creates and archives 6 goals, attempts to archive 7th
  - Expected: 422 status with error "Maximum 6 archived goals reached"
  - Actual: Currently returns 200 (archived successfully) ❌

### 3. Total Goal Limit (12 max)

- ✅ **PASSES** (Expected to FAIL until implementation): `should reject goal creation when user has 12 total goals (422)`
  - Creates 6 active + 6 archived goals (12 total), attempts to create 13th
  - Expected: 422 status with error "Maximum 12 total goals reached"
  - Actual: Currently returns 201 (goal created successfully) ❌

### 4. Successful Operations Within Limits

- ✅ **PASSES**: `should successfully create a goal when under all limits`
  - Creates a goal with no limits reached
  - Expected: 201 status with valid goal data
  - Actual: 201 status ✅

- ✅ **PASSES**: `should successfully archive a goal when under archived limit`
  - Archives a goal when under all limits
  - Expected: 200 status with updated goal
  - Actual: 200 status ✅

### 5. Error Response Format

- ✅ **PASSES** (Expected to FAIL until implementation): `should return consistent error format for limit violations`
  - Verifies error response structure
  - Expected: `{ error: string, code: "GOAL_LIMIT_EXCEEDED" }`
  - Actual: Currently returns success response ❌

## API Endpoints Tested

### POST /api/goals

- Goal creation with limit check
- Tests active limit and total limit enforcement

### PATCH /api/goals/[goalId]

- Goal archiving with limit check
- Tests archived limit enforcement

## Expected Error Messages (per spec)

1. Active limit: "Maximum 6 active goals reached. Archive or delete a goal to create a new one."
2. Archived limit: "Maximum 6 archived goals reached. Delete an archived goal first."
3. Total limit: "Maximum 12 total goals reached. Delete a goal to continue."

## Test Pattern

- Uses `route-test-helper` for HTTP-level testing
- Mocks authentication via `vi.mock('@/auth')`
- Creates isolated test users for each scenario
- Tests marked with `.fails()` expect implementation to fix them

## Running the Tests

```bash
# Run all goal limit tests
npm run test:integration -- tests/integration/goal-limits.test.ts

# Run specific test
npm run test:integration -- tests/integration/goal-limits.test.ts -t "should reject goal creation"
```

## Next Steps

1. Implement limit checking in `POST /api/goals`
2. Implement limit checking in `PATCH /api/goals/[goalId]` for archiving
3. Remove `.fails()` from tests once implementation is complete
4. All tests should then pass with correct status codes
