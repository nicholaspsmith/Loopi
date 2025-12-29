# Data Model: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29

## Overview

This feature requires **no database schema changes**. Distractors are generated on-demand and not persisted. The existing flashcard and FSRS infrastructure is sufficient.

## Entities

### Existing Entities (No Changes)

#### Flashcard

```typescript
// lib/db/drizzle-schema.ts - flashcards table
{
  id: uuid,
  userId: uuid,
  skillNodeId: uuid,
  question: text,
  answer: text,
  cardType: 'flashcard' | 'multiple_choice' | 'scenario',
  cardMetadata: jsonb,  // May contain pre-stored distractors (legacy)
  fsrsState: jsonb,     // FSRS algorithm state
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Note**: `cardMetadata.distractors` may exist from legacy card creation but will be ignored in favor of dynamic generation.

#### ReviewLog

```typescript
// lib/db/drizzle-schema.ts - review_logs table
{
  id: uuid,
  flashcardId: uuid,
  userId: uuid,
  rating: integer,      // 1-4 (Again, Hard, Good, Easy)
  reviewedAt: timestamp,
  scheduledDays: decimal,
  elapsedDays: decimal,
  state: integer        // FSRS state (0=New, 1=Learning, 2=Review, 3=Relearning)
}
```

### Runtime Entities (Not Persisted)

#### Distractor Response

```typescript
// lib/ai/distractor-generator.ts
interface DistractorResponse {
  distractors: string[] // Exactly 3 plausible incorrect options
}

interface DistractorGenerationResult {
  success: boolean
  distractors?: string[]
  error?: string
  generationTimeMs?: number
}
```

#### Study Card (Extended)

```typescript
// components/study/StudySessionProvider.tsx
interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  nodeId: string
  nodeTitle: string
  fsrsState: FSRSState

  // Dynamic generation (not stored)
  distractors?: string[] // Generated on-demand
  distractorsFailed?: boolean // Indicates fallback needed
}
```

#### Multiple Choice Answer

```typescript
// components/study/MultipleChoiceMode.tsx
interface MultipleChoiceAnswer {
  selectedOption: string
  isCorrect: boolean
  responseTimeMs: number // Time from question display to selection
  rating: 1 | 2 | 3 // Again=1, Hard=2, Good=3
}
```

## State Transitions

### Card Rating Flow

```
Question Displayed
       │
       ▼ (timer starts)
   User Selects Option
       │
       ├─── Incorrect ──────────────────────► Rating = 1 (Again)
       │
       └─── Correct ─┬── responseTime ≤ 10s ─► Rating = 3 (Good)
                     │
                     └── responseTime > 10s ─► Rating = 2 (Hard)
```

### Distractor Generation Flow

```
Study Session Starts (MC Mode)
       │
       ▼
   Load Next Card
       │
       ▼
   Generate Distractors (API call)
       │
       ├─── Success ──────► Display MC Question
       │
       └─── Failure ──────► Fallback to Flip-Reveal
                                    │
                                    ▼
                           Display FlashcardMode
```

## Validation Rules

### Distractor Quality (FR-003, FR-004)

1. Must return exactly 3 distractors
2. Each distractor must be non-empty string
3. No distractor should match correct answer (case-insensitive)
4. No duplicate distractors

```typescript
function validateDistractors(distractors: string[], correctAnswer: string): boolean {
  if (distractors.length !== 3) return false
  if (distractors.some((d) => !d.trim())) return false

  const normalizedAnswer = correctAnswer.toLowerCase().trim()
  const normalizedDistractors = distractors.map((d) => d.toLowerCase().trim())

  if (normalizedDistractors.includes(normalizedAnswer)) return false
  if (new Set(normalizedDistractors).size !== 3) return false

  return true
}
```

### Rating Validation (FR-007, FR-008)

```typescript
function calculateRating(isCorrect: boolean, responseTimeMs: number): 1 | 2 | 3 {
  if (!isCorrect) return 1 // Again

  const FAST_THRESHOLD_MS = 10_000 // 10 seconds
  return responseTimeMs <= FAST_THRESHOLD_MS ? 3 : 2 // Good or Hard
}
```

## Data Volume Assumptions

- **Cards per session**: 10-30 typical
- **Distractor generation**: 1-2 seconds per card
- **No persistence**: Zero storage growth from this feature
- **API calls**: ~1 per card in MC mode (not batched)

## Backward Compatibility

- Existing `cardMetadata.distractors` in database will be ignored
- Legacy cards can still use dynamic generation
- No migration required
