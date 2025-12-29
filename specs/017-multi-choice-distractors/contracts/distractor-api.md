# API Contract: Distractor Generation

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29

## Endpoints

### POST /api/study/distractors

Generate 3 plausible but incorrect distractors for a flashcard's correct answer.

#### Request

```typescript
interface GenerateDistractorsRequest {
  flashcardId: string // UUID of the flashcard
  question: string // The flashcard question (for context)
  answer: string // The correct answer
}
```

**Example**:

```json
{
  "flashcardId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What is the capital of France?",
  "answer": "Paris"
}
```

#### Response

**Success (200 OK)**:

```typescript
interface GenerateDistractorsResponse {
  distractors: [string, string, string] // Exactly 3 distractors
  generationTimeMs: number // Time taken to generate
}
```

**Example**:

```json
{
  "distractors": ["London", "Berlin", "Madrid"],
  "generationTimeMs": 1243
}
```

**Error (500 Internal Server Error)**:

```typescript
interface DistractorErrorResponse {
  error: string
  fallbackRequired: true
}
```

**Example**:

```json
{
  "error": "Claude API timeout",
  "fallbackRequired": true
}
```

#### Error Codes

| Status | Condition               | Client Action            |
| ------ | ----------------------- | ------------------------ |
| 200    | Success                 | Use distractors          |
| 400    | Missing required fields | Fix request              |
| 401    | Unauthorized            | Re-authenticate          |
| 500    | Generation failed       | Use flip-reveal fallback |
| 503    | Claude API unavailable  | Use flip-reveal fallback |

#### Rate Limiting

- No explicit rate limiting (relies on Claude API limits)
- Timeout: 5 seconds (fail fast for fallback)

---

### POST /api/study/rate (Modified)

Rate a flashcard with time-based scoring for multiple choice mode.

#### Request (Extended)

```typescript
interface RateCardRequest {
  flashcardId: string
  rating: 1 | 2 | 3 | 4 // FSRS rating
  responseTimeMs?: number // Required for MC mode
  studyMode?: 'flashcard' | 'multiple_choice'
}
```

**Multiple Choice Example**:

```json
{
  "flashcardId": "550e8400-e29b-41d4-a716-446655440000",
  "rating": 3,
  "responseTimeMs": 4500,
  "studyMode": "multiple_choice"
}
```

#### Response

Unchanged from existing implementation:

```typescript
interface RateCardResponse {
  success: boolean
  nextDue: string // ISO 8601 date
  newState: 'new' | 'learning' | 'review' | 'relearning'
  intervalDays: number
}
```

#### Time-Based Rating Logic (Server-Side)

When `studyMode === 'multiple_choice'`:

- Ignore client-provided `rating` for correct answers
- Calculate rating based on `responseTimeMs`:
  - ≤ 10,000ms → rating = 3 (Good)
  - > 10,000ms → rating = 2 (Hard)
- Incorrect answers always → rating = 1 (Again)

---

## Component Contracts

### MultipleChoiceMode Props

```typescript
interface MultipleChoiceModeProps {
  question: string
  answer: string
  distractors: string[] // Exactly 3 items
  cardNumber: number
  totalCards: number
  onRate: (rating: 1 | 2 | 3, responseTimeMs: number) => void
  onFallback?: () => void // Called if distractors invalid
}
```

### Distractor Generator Service

```typescript
// lib/ai/distractor-generator.ts

export interface DistractorGeneratorOptions {
  maxTokens?: number // Default: 256
  temperature?: number // Default: 0.9
  timeoutMs?: number // Default: 5000
}

export interface DistractorResult {
  success: boolean
  distractors?: [string, string, string]
  error?: string
  generationTimeMs: number
}

export async function generateDistractors(
  question: string,
  answer: string,
  options?: DistractorGeneratorOptions
): Promise<DistractorResult>
```

### Study Session Provider (Extended)

```typescript
interface StudySessionContextValue {
  // Existing
  cards: StudyCard[]
  currentCardIndex: number
  sessionId: string | null
  isLoading: boolean

  // New for MC mode
  currentDistractors: string[] | null
  distractorsLoading: boolean
  distractorsFailed: boolean

  // Actions
  startSession: (goalId: string, mode: StudyMode) => Promise<void>
  rateCard: (rating: number, responseTimeMs?: number) => Promise<void>
  nextCard: () => void
  completeSession: () => Promise<SessionSummary>
}
```

## Sequence Diagrams

### Happy Path: Multiple Choice Study

```
User              UI                Provider           API              Claude
  │                │                    │                │                  │
  │──Start MC──────►                    │                │                  │
  │                │──startSession()────►                │                  │
  │                │                    │──POST /session─►                  │
  │                │                    │◄───cards[]─────│                  │
  │                │                    │                │                  │
  │                │◄──card[0]──────────│                │                  │
  │                │                    │──POST /distract►                  │
  │                │                    │                │──generate()──────►
  │                │                    │                │◄──distractors[]──│
  │                │                    │◄──distractors──│                  │
  │                │◄──show MC Q────────│                │                  │
  │                │                    │                │                  │
  │──select opt────►                    │                │                  │
  │                │──rateCard(3,4500)──►                │                  │
  │                │                    │──POST /rate────►                  │
  │                │                    │◄──success──────│                  │
  │                │◄──next card────────│                │                  │
```

### Fallback Path: Distractor Generation Fails

```
User              UI                Provider           API              Claude
  │                │                    │                │                  │
  │                │◄──card[0]──────────│                │                  │
  │                │                    │──POST /distract►                  │
  │                │                    │                │──generate()──────►
  │                │                    │                │◄──TIMEOUT────────│
  │                │                    │◄──{error}──────│                  │
  │                │                    │                │                  │
  │                │◄──show Flashcard───│ (fallback)     │                  │
  │                │   mode + toast     │                │                  │
  │                │                    │                │                  │
  │──flip & rate───►                    │                │                  │
  │                │──rateCard(3)───────► (standard flow)│                  │
```
