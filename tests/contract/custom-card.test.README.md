# Custom Card Creation Contract Test

## Overview

This contract test validates the API contract for custom flashcard creation as specified in:

- `specs/021-custom-cards-archive/contracts/custom-cards.md`

## Test File

`/Users/nick/Code/memoryloop/tests/contract/custom-card.test.ts`

## Running the Test

```bash
# Using the contract-specific config
npx vitest run --config vitest.contract.config.ts tests/contract/custom-card.test.ts
```

## Test Status

**EXPECTED TO FAIL** - This is a TDD (Test-Driven Development) test that will fail until the implementation is complete.

### Current Error

```
Failed to resolve import "@/app/api/flashcards/custom/route"
```

This error is expected because the route handler has not been implemented yet.

## Test Coverage

The test suite covers all scenarios from the API contract:

### Success Cases (201)

1. Creates a card linked to the specified node
2. Initializes card with New FSRS state (state: 0)
3. Increments node cardCount
4. Accepts question at minimum length (5 chars)
5. Accepts question at maximum length (1000 chars)
6. Accepts answer at minimum length (5 chars)
7. Accepts answer at maximum length (5000 chars)

### Error Cases

- **400 Bad Request**: Invalid validation
  - Question too short (<5 chars)
  - Question too long (>1000 chars)
  - Answer too short (<5 chars)
  - Answer too long (>5000 chars)
  - Invalid node ID format (not a UUID)

- **401 Unauthorized**: Unauthenticated request

- **403 Forbidden**: User doesn't own the node

- **404 Not Found**: Node doesn't exist

## Implementation Checklist

Once these are implemented, the tests should pass:

- [ ] Create route handler: `app/api/flashcards/custom/route.ts`
- [ ] Implement Zod validation schema
  - [ ] `nodeId`: UUID validation
  - [ ] `question`: 5-1000 characters
  - [ ] `answer`: 5-5000 characters
- [ ] Implement ownership verification using `getNodeWithGoal()`
- [ ] Implement card creation with FSRS initialization
- [ ] Implement node cardCount increment

## Test Data Setup

The test creates:

- 2 test users (for permission testing)
- 2 learning goals (one per user)
- 2 skill trees (one per user)
- 2 skill nodes (one per user)

This allows testing both positive cases (user owns node) and negative cases (user doesn't own node).

## Dependencies

- `@/lib/auth/helpers` - Password hashing
- `@/lib/db/operations/users` - User creation
- `@/lib/db/operations/goals` - Goal creation
- `@/lib/db/operations/skill-trees` - Tree creation
- `@/lib/db/operations/skill-nodes` - Node creation and updates
- `@/lib/db/client` - Database connection cleanup
- `@/tests/helpers/route-test-helper` - Route testing utilities
- `@/auth` - Authentication mocking

## Notes

- Uses route-test-helper pattern (no running server required)
- Mocks authentication using Vitest vi.mock()
- Tests are isolated and create their own test data
- Follows existing contract test patterns from deck-crud.test.ts
