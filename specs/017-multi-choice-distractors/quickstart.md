# Quickstart: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29

## Overview

This feature enhances multiple choice study mode with:

1. **Dynamic distractor generation** - AI generates 3 plausible wrong answers per card
2. **Time-based rating** - Fast correct = Good, slow correct = Hard
3. **Graceful fallback** - Falls back to flip-reveal if generation fails

## Key Files

| File                                        | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `lib/ai/distractor-generator.ts`            | Core distractor generation service    |
| `app/api/study/distractors/route.ts`        | API endpoint for on-demand generation |
| `components/study/MultipleChoiceMode.tsx`   | UI component with timer               |
| `components/study/StudySessionProvider.tsx` | Session orchestration                 |

## Quick Implementation Guide

### 1. Create Distractor Generator

```typescript
// lib/ai/distractor-generator.ts
import { getChatCompletion } from '@/lib/claude/client'

const DISTRACTOR_PROMPT = `Generate 3 plausible but incorrect answer options...`

export async function generateDistractors(
  question: string,
  answer: string
): Promise<{ success: boolean; distractors?: string[]; error?: string }> {
  try {
    const response = await getChatCompletion(
      [{ role: 'user', content: buildPrompt(question, answer) }],
      { maxTokens: 256, temperature: 0.9 }
    )

    const parsed = JSON.parse(response)
    if (validateDistractors(parsed.distractors, answer)) {
      return { success: true, distractors: parsed.distractors }
    }
    return { success: false, error: 'Invalid distractor format' }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
```

### 2. Add API Endpoint

```typescript
// app/api/study/distractors/route.ts
import { generateDistractors } from '@/lib/ai/distractor-generator'

export async function POST(request: Request) {
  const { question, answer } = await request.json()

  const result = await generateDistractors(question, answer)

  if (result.success) {
    return Response.json({ distractors: result.distractors })
  }
  return Response.json({ error: result.error, fallbackRequired: true }, { status: 500 })
}
```

### 3. Modify MultipleChoiceMode

```typescript
// components/study/MultipleChoiceMode.tsx
function MultipleChoiceMode({ question, answer, distractors, onRate }) {
  const startTimeRef = useRef(Date.now())

  const handleSelect = (selected: string) => {
    const responseTimeMs = Date.now() - startTimeRef.current
    const isCorrect = selected === answer
    const rating = isCorrect ? (responseTimeMs <= 10000 ? 3 : 2) : 1

    onRate(rating, responseTimeMs)
  }

  // ... render options
}
```

### 4. Integrate in Session Provider

```typescript
// In StudySessionProvider.tsx
const fetchDistractors = async (card: StudyCard) => {
  try {
    const res = await fetch('/api/study/distractors', {
      method: 'POST',
      body: JSON.stringify({ question: card.question, answer: card.answer }),
    })
    const data = await res.json()
    return data.distractors ?? null
  } catch {
    return null // Trigger fallback
  }
}
```

## Testing Checklist

### Unit Tests

- [ ] `distractor-generator.test.ts` - Generation logic, validation, error handling
- [ ] Mock Claude API responses

### Integration Tests

- [ ] `multi-choice-rating.test.ts` - Time-based rating calculation
- [ ] Fallback to flip-reveal mode

### E2E Tests

- [ ] `multi-choice-session.spec.ts` - Full study session with MC mode
- [ ] Verify FSRS updates correctly

## Common Issues

### Distractors Not Appearing

1. Check Claude API key is set (`ANTHROPIC_API_KEY`)
2. Check network tab for `/api/study/distractors` response
3. Verify response has exactly 3 distractors

### Wrong Rating Applied

1. Verify timer starts on question display, not component mount
2. Check `responseTimeMs` is passed to `onRate`
3. Verify server-side rating calculation in `/api/study/rate`

### Fallback Not Triggering

1. Check error handling in `fetchDistractors`
2. Verify `distractorsFailed` state is set
3. Ensure `MixedMode` routes to `FlashcardMode` on failure

## Success Criteria Verification

| Criterion                | How to Verify                                        |
| ------------------------ | ---------------------------------------------------- |
| SC-001: < 2s display     | Measure time from answer submission to next question |
| SC-002: 90%+ quality     | Manual review of generated distractors               |
| SC-003: < 10min/20 cards | Time a complete session                              |
| SC-004: Correct FSRS     | Check `review_logs` table ratings                    |
| SC-005: < 1s fallback    | Simulate API failure, measure switch time            |
| SC-006: 80% variety      | Study same card twice, compare distractors           |
