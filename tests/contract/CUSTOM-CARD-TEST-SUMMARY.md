# Custom Card Creation Contract Test - Summary

## Test Created

**File**: `/Users/nick/Code/memoryloop/tests/contract/custom-card.test.ts`

## Purpose

This contract test validates the POST /api/flashcards/custom endpoint as specified in:

- `specs/021-custom-cards-archive/contracts/custom-cards.md`

## Test Coverage (14 test scenarios)

### Success Cases (7 tests)

1. ✅ Creates a card linked to the specified node (201)
2. ✅ Initializes card with New FSRS state (state: 0)
3. ✅ Increments node cardCount
4. ✅ Accepts question at minimum length (5 chars)
5. ✅ Accepts question at maximum length (1000 chars)
6. ✅ Accepts answer at minimum length (5 chars)
7. ✅ Accepts answer at maximum length (5000 chars)

### Error Cases (7 tests)

8. ✅ Rejects cards for nodes not owned by user (403)
9. ✅ Rejects non-existent node (404)
10. ✅ Validates question length - too short (400)
11. ✅ Validates question length - too long (400)
12. ✅ Validates answer length - too short (400)
13. ✅ Validates answer length - too long (400)
14. ✅ Rejects invalid node ID format (400)
15. ✅ Returns 401 for unauthenticated request

## Running the Tests

```bash
# Run all contract tests
npm run test:contract

# Run only custom card test
npm run test:contract tests/contract/custom-card.test.ts
```

## Current Status

**EXPECTED TO FAIL** - TDD approach

The test currently fails with:

```
Failed to resolve import "@/app/api/flashcards/custom/route"
```

This is expected because the implementation doesn't exist yet. Once implemented, all 14 tests should pass.

## Implementation Requirements

Based on the test, the implementation needs:

1. **Route Handler**: `app/api/flashcards/custom/route.ts`
   - POST handler with authentication
   - Zod validation schema
   - Ownership verification
   - Card creation
   - Node cardCount increment

2. **Validation Schema**:

   ```typescript
   z.object({
     nodeId: z.string().uuid(),
     question: z.string().min(5).max(1000),
     answer: z.string().min(5).max(5000),
   })
   ```

3. **Response Format** (201):

   ```json
   {
     "id": "uuid",
     "userId": "uuid",
     "skillNodeId": "uuid",
     "question": "string",
     "answer": "string",
     "cardType": "flashcard",
     "fsrsState": {
       "state": 0,
       "due": "ISO8601",
       "stability": 0,
       "difficulty": 0,
       "elapsedDays": 0,
       "scheduledDays": 0,
       "reps": 0,
       "lapses": 0
     },
     "createdAt": "ISO8601"
   }
   ```

4. **Error Responses**:
   - 400: Validation errors (with details)
   - 401: Unauthenticated
   - 403: User doesn't own node
   - 404: Node not found

## Test Infrastructure

### New Files Created

1. `/Users/nick/Code/memoryloop/tests/contract/custom-card.test.ts` - Test file
2. `/Users/nick/Code/memoryloop/vitest.contract.config.ts` - Contract test config
3. `/Users/nick/Code/memoryloop/tests/contract/custom-card.test.README.md` - Documentation

### Modified Files

1. `/Users/nick/Code/memoryloop/package.json` - Added `test:contract` script

## Test Data Architecture

The test creates a complete data hierarchy:

```
User 1 (testUser)
  └─ Goal 1
      └─ SkillTree 1
          └─ SkillNode 1 (testNode) ← Tests create cards here

User 2 (otherUser)
  └─ Goal 2
      └─ SkillTree 2
          └─ SkillNode 2 (otherNode) ← Used for permission tests
```

## Dependencies Used

- **Database Operations**:
  - `createUser()` - User setup
  - `createGoal()` - Goal creation
  - `createSkillTree()` - Tree creation
  - `createSkillNode()` - Node creation
  - `getSkillNodeById()` - Node verification
- **Testing Utilities**:
  - `testPOST()` - Route testing without server
  - `vi.mock()` - Auth mocking
  - `hashPassword()` - Test data setup

## Test Pattern

Follows the modern route-test-helper pattern (no server required):

- Mocks authentication
- Direct route handler invocation
- Comprehensive data setup
- Isolated test cases

## Next Steps

1. Implement the route handler
2. Run tests to verify implementation
3. All 14 tests should pass
4. Update this document with results

## References

- Contract Spec: `specs/021-custom-cards-archive/contracts/custom-cards.md`
- Example Pattern: `tests/contract/deck-crud.test.ts`
- Route Helper: `tests/helpers/route-test-helper.ts`
