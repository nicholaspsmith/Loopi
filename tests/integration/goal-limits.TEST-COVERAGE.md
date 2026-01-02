# Goal Limits Test Coverage

## Test File Location

`/Users/nick/Code/memoryloop/tests/integration/goal-limits.test.ts`

## Purpose

HTTP-level integration tests for goal limit enforcement as specified in:

- **Spec**: `specs/021-custom-cards-archive/spec.md`
- **User Story**: User Story 3 - Goal Limits Enforcement (Priority: P1)

## Test Coverage Summary

### Test Suites: 5

1. Active Goal Limit (6 max) - 2 tests
2. Archived Goal Limit (6 max) - 1 test
3. Total Goal Limit (12 max) - 1 test
4. Successful Operations Within Limits - 2 tests
5. Error Response Format - 1 test

### Total Tests: 7

- **Passing**: 7/7 (100%)
- **Tests with `.fails()` (TDD)**: 4/7
  - These are expected to fail assertions until limit enforcement is implemented
  - They currently pass because Vitest's `.fails()` expects the test to throw

## Test Scenarios Covered

### ✅ Active Limit Enforcement

- [x] Reject creation when at active limit (6) → 422 with specific error
- [x] Allow creation when below active limit (5) → 201 success

### ✅ Archived Limit Enforcement

- [x] Reject archiving when at archived limit (6) → 422 with specific error

### ✅ Total Limit Enforcement

- [x] Reject creation when at total limit (12) → 422 with specific error

### ✅ Success Paths

- [x] Create goal successfully when under all limits
- [x] Archive goal successfully when under archived limit

### ✅ Error Response Validation

- [x] Consistent error format: `{ error: string, code: "GOAL_LIMIT_EXCEEDED" }`

## API Endpoints Under Test

### `POST /api/goals`

**Tests**: 3

- Active limit check
- Total limit check
- Successful creation

**Expected Behaviors**:

- Returns 422 if user has 6 active goals
- Returns 422 if user has 12 total goals
- Returns 201 with goal data if under limits

### `PATCH /api/goals/[goalId]`

**Tests**: 2

- Archived limit check when changing status to 'archived'
- Successful archiving

**Expected Behaviors**:

- Returns 422 if user has 6 archived goals and tries to archive another
- Returns 200 with updated goal if under archived limit

## Test Implementation Details

### Authentication

- Uses `vi.mock('@/auth')` to mock authentication
- Each test creates isolated test users to avoid interference
- Mock session includes: `{ user: { id, email, name } }`

### Database Setup

- Initializes schema in `beforeAll` if needed
- Uses real PostgreSQL database (not mocked)
- Closes database connection in `afterAll`

### Test Isolation

- Each limit test creates a fresh test user
- Uses `Date.now()` for unique email addresses
- No test data cleanup needed (each user is independent)

### Assertions

Tests verify:

1. HTTP status codes (201, 200, 422)
2. Response body structure
3. Error message content
4. Error code consistency
5. Valid ISO date strings in responses

## Running the Tests

```bash
# Run all goal limit tests
npm run test:integration -- tests/integration/goal-limits.test.ts

# Run specific test suite
npm run test:integration -- tests/integration/goal-limits.test.ts -t "Active Goal Limit"

# Run specific test
npm run test:integration -- tests/integration/goal-limits.test.ts -t "should reject goal creation when user has 6"

# Watch mode
npm run test:integration -- tests/integration/goal-limits.test.ts --watch
```

## Test Data Patterns

### Goal Creation Payload

```typescript
{
  title: string,
  description?: string,
  generateTree: false  // Disabled for faster tests
}
```

### Goal Archiving Payload

```typescript
{
  status: 'archived'
}
```

### Expected Error Response

```typescript
{
  error: string,  // Human-readable error message
  code: 'GOAL_LIMIT_EXCEEDED'
}
```

## TDD Status

### Not Yet Implemented (`.fails()` tests)

These tests define expected behavior but limit enforcement is not implemented:

1. ❌ Active limit enforcement in `POST /api/goals`
2. ❌ Archived limit enforcement in `PATCH /api/goals/[goalId]`
3. ❌ Total limit enforcement in `POST /api/goals`
4. ❌ Error response format for limit violations

### Implementation Checklist

- [ ] Add `getGoalCounts(userId)` call in `POST /api/goals`
- [ ] Check active count < 6 before creating
- [ ] Check total count < 12 before creating
- [ ] Add `getGoalCounts(userId)` call in `PATCH /api/goals/[goalId]`
- [ ] Check archived count < 6 before archiving
- [ ] Return 422 with `GOAL_LIMIT_EXCEEDED` code
- [ ] Remove `.fails()` from tests

## Related Files

- **Spec**: `/Users/nick/Code/memoryloop/specs/021-custom-cards-archive/spec.md`
- **Constants**: `/Users/nick/Code/memoryloop/lib/constants/goals.ts`
- **API Routes**:
  - `/Users/nick/Code/memoryloop/app/api/goals/route.ts`
  - `/Users/nick/Code/memoryloop/app/api/goals/[goalId]/route.ts`
- **DB Operations**: `/Users/nick/Code/memoryloop/lib/db/operations/goals.ts`
- **Test Helper**: `/Users/nick/Code/memoryloop/tests/helpers/route-test-helper.ts`

## Success Criteria (from spec)

- **SC-003**: Goal limit enforcement prevents exceeding caps with 100% reliability

These tests ensure SC-003 is met once implementation is complete.
