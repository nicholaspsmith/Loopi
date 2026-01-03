# API Contract: Duplicate Detection

**Feature**: 023-dedupe
**Date**: 2026-01-03

## Overview

Two new API endpoints for checking duplicates before creation. Both endpoints are user-authenticated and scope searches to the current user's content.

---

## POST /api/flashcards/check-duplicate

Check if a flashcard question is similar to existing flashcards.

### Request

```typescript
POST /api/flashcards/check-duplicate
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "question": string  // The flashcard question to check (required)
}
```

### Response

```typescript
// 200 OK
{
  "isDuplicate": boolean,      // True if similarity >= 85%
  "similarItems": [
    {
      "id": string,            // Flashcard UUID
      "score": number,         // 0.0 - 1.0 similarity score
      "displayText": string,   // The existing question text
      "type": "flashcard"
    }
  ],
  "topScore": number | null,   // Highest similarity score
  "checkSkipped": boolean,     // True if check was skipped
  "skipReason": string | null  // "content_too_short" | "service_unavailable"
}
```

### Error Responses

```typescript
// 400 Bad Request - Invalid input
{
  "error": "Question is required"
}

// 401 Unauthorized - No session
{
  "error": "Authentication required"
}

// 500 Internal Server Error - Embedding service failed
// Note: In practice, service failures return 200 with checkSkipped=true
{
  "error": "Internal server error"
}
```

### Examples

**No duplicate found:**

```json
// Request
{ "question": "What is the capital of France?" }

// Response
{
  "isDuplicate": false,
  "similarItems": [],
  "topScore": null,
  "checkSkipped": false,
  "skipReason": null
}
```

**Duplicate found:**

```json
// Request
{ "question": "Define photosynthesis" }

// Response
{
  "isDuplicate": true,
  "similarItems": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "score": 0.92,
      "displayText": "What is photosynthesis?",
      "type": "flashcard"
    }
  ],
  "topScore": 0.92,
  "checkSkipped": false,
  "skipReason": null
}
```

**Check skipped (content too short):**

```json
// Request
{ "question": "Yes?" }

// Response
{
  "isDuplicate": false,
  "similarItems": [],
  "topScore": null,
  "checkSkipped": true,
  "skipReason": "content_too_short"
}
```

---

## POST /api/goals/check-duplicate

Check if a goal title/description is similar to existing goals.

### Request

```typescript
POST /api/goals/check-duplicate
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "title": string,        // Goal title (required)
  "description": string   // Goal description (optional, empty string if not provided)
}
```

### Response

```typescript
// 200 OK
{
  "isDuplicate": boolean,
  "similarItems": [
    {
      "id": string,            // Goal UUID
      "score": number,
      "displayText": string,   // The existing goal title
      "type": "goal"
    }
  ],
  "topScore": number | null,
  "checkSkipped": boolean,
  "skipReason": string | null
}
```

### Examples

**Duplicate goal found:**

```json
// Request
{ "title": "Master Python development", "description": "Learn Python from basics to advanced" }

// Response
{
  "isDuplicate": true,
  "similarItems": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "score": 0.89,
      "displayText": "Learn Python programming",
      "type": "goal"
    }
  ],
  "topScore": 0.89,
  "checkSkipped": false,
  "skipReason": null
}
```

---

## Integration Points

### Flashcard Creation Flow

```
1. User enters flashcard question/answer
2. UI calls POST /api/flashcards/check-duplicate
3. If isDuplicate=true:
   a. Show DuplicateWarningModal with similarItems
   b. User clicks "Create Anyway" → proceed to step 4
   c. User clicks "Cancel" → abort
4. Call existing POST /api/flashcards (or /api/flashcards/custom)
```

### Goal Creation Flow

```
1. User enters goal title/description
2. UI calls POST /api/goals/check-duplicate
3. If isDuplicate=true:
   a. Show DuplicateWarningModal with similarItems
   b. User clicks "Proceed Anyway" → proceed to step 4
   c. User clicks "Cancel" → abort
4. Call existing POST /api/goals
```

### AI Batch Generation Flow

```
1. AI generates batch of flashcards
2. Server calls internal filterDuplicatesFromBatch()
3. Unique cards saved to database
4. Response includes: { created: N, duplicatesFiltered: M }
```

---

## Performance Requirements

| Metric              | Target  |
| ------------------- | ------- |
| Response time (p50) | < 300ms |
| Response time (p95) | < 500ms |
| Timeout             | 5000ms  |

---

## Test Scenarios

### Unit Tests

1. **T001**: Returns isDuplicate=false when no similar items exist
2. **T002**: Returns isDuplicate=true when similarity >= 0.85
3. **T003**: Returns isDuplicate=false when similarity < 0.85
4. **T004**: Returns checkSkipped=true when question < 10 chars
5. **T005**: Returns checkSkipped=true when embedding service fails
6. **T006**: Returns max 3 similar items sorted by score descending
7. **T007**: Only searches within current user's content

### Integration Tests

1. **T008**: Full flow - create flashcard, check duplicate, get match
2. **T009**: Full flow - create goal, check duplicate, get match
3. **T010**: Verify user isolation - user A's cards not returned for user B

### E2E Tests

1. **T011**: Create flashcard, attempt similar, see warning modal
2. **T012**: Click "Create Anyway" creates the card
3. **T013**: Click "Cancel" returns to form without creating
