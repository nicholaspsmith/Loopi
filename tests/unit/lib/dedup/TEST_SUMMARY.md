# Test Summary: Flashcard Duplicate Detection (TDD)

**Feature:** 023-dedupe - User Story 1 (Flashcard Duplicate Detection)
**Created:** 2026-01-03
**Status:** Tests written, awaiting implementation

## Overview

Three test files have been created following Test-Driven Development (TDD) principles. All tests currently FAIL with "not yet implemented" errors, which is the expected behavior before implementation.

## Test Files Created

### 1. Unit Test (T008)

**File:** `/Users/nick/Code/memoryloop/tests/unit/lib/dedup/flashcard-duplicate.test.ts`

**Tests the function:** `checkFlashcardDuplicate(question: string, userId: string)`

**Test Coverage:**

- Duplicate Detection (6 tests)
  - Returns isDuplicate=true when similarity > 0.85
  - Returns isDuplicate=false when no similar cards
  - Returns isDuplicate=false when similarity < 0.85
  - Returns up to 3 similar items sorted by score
  - Limits results to max 3 items
- Content Validation (4 tests)
  - Skips check for content < 10 chars
  - Skips check for whitespace-only content
  - Accepts exactly 10 characters
  - Trims content before length check
- Error Handling (4 tests)
  - Handles embedding generation failures
  - Handles LanceDB query failures
  - Handles PostgreSQL query failures
  - Handles empty embedding array
- User Scoping (1 test)
  - Passes userId to LanceDB search

**Total:** 15 test cases

### 2. Contract Test (T009)

**File:** `/Users/nick/Code/memoryloop/tests/contract/flashcard-duplicate.test.ts`

**Tests the endpoint:** `POST /api/flashcards/check-duplicate`

**Test Coverage:**

- Success Cases (4 tests)
  - Returns 200 with DuplicateCheckResult schema
  - Returns checkSkipped=true for very short questions
  - Returns similarItems with correct structure
  - Returns max 3 similar items
- Validation Errors (4 tests)
  - Returns 400 for missing question field
  - Returns 400 for empty question string
  - Returns 400 for non-string question
  - Returns 400 for whitespace-only question
- Authentication (1 test)
  - Returns 401 for unauthenticated requests
- Response Time Requirements (1 test)
  - Responds within 500ms (p95 requirement)
- User Scoping (1 test)
  - Only searches within authenticated user's flashcards
- Edge Cases (3 tests)
  - Handles very long questions
  - Handles special characters
  - Handles unicode characters

**Total:** 14 test cases

### 3. Integration Test (T010)

**File:** `/Users/nick/Code/memoryloop/tests/integration/lib/dedup/flashcard-duplicate.test.ts`

**Tests:** Full duplicate detection flow with real databases (PostgreSQL + LanceDB)

**Test Coverage:**

- Full Duplicate Detection Flow (3 tests)
  - Detects duplicate when similar flashcard exists
  - Returns no duplicates for unique content
  - Returns multiple similar items sorted by score
- User Isolation (1 test)
  - Does not return flashcards from other users
- Content Length Validation (3 tests)
  - Skips check for very short content
  - Accepts exactly 10 characters
  - Accepts normal-length questions
- Similarity Threshold (1 test)
  - Does not return items below 0.85 threshold
- Error Handling (1 test)
  - Handles flashcards without LanceDB sync
- Different Card Types (1 test)
  - Detects duplicates across different card types

**Total:** 10 test cases

## Running the Tests

```bash
# Unit tests (will fail until implementation)
npx vitest run tests/unit/lib/dedup/flashcard-duplicate.test.ts

# Contract tests (will fail until implementation)
npm run test:contract -- tests/contract/flashcard-duplicate.test.ts

# Integration tests (will fail until implementation)
npm run test:integration -- tests/integration/lib/dedup/flashcard-duplicate.test.ts
```

## Expected Behavior (TDD)

All tests currently fail with:

- Unit: `Error: Failed to resolve import "@/lib/dedup/similarity-check"`
- Contract: `Error: Failed to resolve import "@/app/api/flashcards/check-duplicate/route"`
- Integration: `Error: checkFlashcardDuplicate not yet implemented`

**This is expected!** These tests will pass once the implementation is complete.

## Implementation Checklist

To make these tests pass, implement:

1. [ ] `lib/dedup/similarity-check.ts` with `checkFlashcardDuplicate()` function
2. [ ] `app/api/flashcards/check-duplicate/route.ts` with POST handler
3. [ ] `lib/db/operations/flashcards.ts` - add `getFlashcardsByIds()` function

## Dependencies

The tests mock these external dependencies:

- `@/lib/embeddings` - Jina embeddings API
- `@/lib/db/operations/flashcards-lancedb` - LanceDB vector search
- `@/lib/db/operations/flashcards` - PostgreSQL flashcard queries
- `@/auth` - NextAuth session

## API Contract Validation

Contract tests ensure the endpoint follows the spec at:
`specs/023-dedupe/contracts/dedupe-api.md`

Request:

```typescript
POST /api/flashcards/check-duplicate
{ "question": string }
```

Response:

```typescript
{
  "isDuplicate": boolean,
  "similarItems": SimilarItem[],
  "topScore": number | null,
  "checkSkipped": boolean,
  "skipReason"?: string
}
```

## Next Steps

1. Implement `checkFlashcardDuplicate()` function
2. Implement POST `/api/flashcards/check-duplicate` endpoint
3. Run tests to verify they pass
4. Add E2E tests for UI workflow (optional)
