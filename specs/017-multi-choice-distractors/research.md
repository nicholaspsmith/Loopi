# Research: Multi-Choice Study Mode with AI-Generated Distractors

**Feature**: 017-multi-choice-distractors
**Date**: 2025-12-29

## Research Topics

### 1. Distractor Generation Strategy

**Decision**: Use Claude API with structured prompt for on-demand distractor generation

**Rationale**:

- Claude already integrated in codebase (`lib/claude/client.ts`)
- Existing `buildMultipleChoicePrompt()` in `lib/ai/card-generator.ts` provides proven pattern
- Fresh generation each session ensures variety (FR-010)
- No storage overhead - ephemeral by design

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Pre-generate and cache | Violates FR-009 (on-demand); limits variety |
| Semantic similarity search | Requires embedding-based distractor corpus; complex |
| Template-based generation | Poor quality for diverse topics; not "plausible" |

**Prompt Design** (derived from existing `card-generator.ts:122-155`):

```
Generate 3 plausible but incorrect answer options for this flashcard:

Question: {question}
Correct Answer: {answer}

Requirements:
- Each distractor must be factually INCORRECT
- Each distractor must be PLAUSIBLE (related to the topic)
- Similar length to the correct answer
- No obviously absurd options
- Must be distinct from each other

Return JSON: { "distractors": ["option1", "option2", "option3"] }
```

### 2. Response Time Thresholds for FSRS Rating

**Decision**: Use 10-second threshold to distinguish "fast" vs "slow" correct answers

**Rationale**:

- Average reading + decision time for multiple choice is 5-8 seconds
- 10 seconds provides buffer for complex questions
- Aligns with common quiz application standards
- Simple single threshold avoids over-engineering

**Rating Mapping**:
| Response | Time | FSRS Rating |
|----------|------|-------------|
| Incorrect | Any | 1 (Again) |
| Correct | ≤ 10s | 3 (Good) |
| Correct | > 10s | 2 (Hard) |

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Per-question adaptive threshold | Over-engineering; no data to calibrate |
| Three-tier (Easy/Good/Hard) | User doesn't select Easy in MC mode |
| No time-based rating | Violates FR-007 clarification |

**Implementation Location**:

- Timer starts in `MultipleChoiceMode.tsx` on question display
- Timer stops on answer selection
- Rating logic in `app/api/study/rate/route.ts` or component

### 3. Batching vs Per-Card Generation

**Decision**: Generate distractors per-card on-demand (not batched)

**Rationale**:

- Session may end early; batching wastes API calls
- Per-card allows lazy loading as user progresses
- Simpler error handling (single failure = single fallback)
- 1-2s latency acceptable between cards

**Alternatives Considered**:
| Alternative | Why Rejected |
|-------------|--------------|
| Batch all at session start | High latency (20+ seconds), wasted calls on early exit |
| Prefetch next N cards | Complexity; marginal benefit for typical sessions |
| Background worker queue | Over-engineering for single-user sessions |

### 4. Fallback Strategy

**Decision**: Fall back to flip-reveal mode with visual indication

**Rationale**:

- User should never be blocked from studying
- Flip-reveal mode already exists (`FlashcardMode.tsx`)
- Clear indication prevents confusion
- Silent fallback maintains session flow

**Fallback Triggers**:

1. Claude API error (timeout, rate limit, service unavailable)
2. Invalid response format (malformed JSON, wrong distractor count)
3. Distractors too similar to correct answer (optional quality check)

**User Experience**:

- Show toast: "Showing as flashcard (distractors unavailable)"
- Render `FlashcardMode` instead of `MultipleChoiceMode`
- Continue with standard 1-4 rating buttons

**Implementation Location**:

- Try/catch in `distractor-generator.ts`
- Fallback routing in `StudySessionProvider.tsx` or `MixedMode.tsx`

### 5. Claude API Configuration

**Decision**: Use existing Claude client with adjusted parameters

**Current Configuration** (`lib/claude/client.ts`):

- Model: `claude-3-5-sonnet-20241022`
- Max tokens: 4096 (excessive for 3 distractors)

**Recommended for Distractor Generation**:

- Model: Same (quality important for plausibility)
- Max tokens: 256 (sufficient for JSON response)
- Temperature: 0.8-1.0 (variety in responses)
- Timeout: 5 seconds (fail fast for fallback)

### 6. Existing Code Integration Points

**Key Files to Modify**:

| File                                        | Change                                 |
| ------------------------------------------- | -------------------------------------- |
| `lib/ai/distractor-generator.ts`            | NEW - Core generation logic            |
| `components/study/MultipleChoiceMode.tsx`   | Add timer, receive distractors as prop |
| `components/study/StudySessionProvider.tsx` | Call distractor API, handle fallback   |
| `app/api/study/rate/route.ts`               | Time-based rating logic                |
| `app/api/study/distractors/route.ts`        | NEW - On-demand distractor endpoint    |

**Key Functions to Reuse**:

- `getChatCompletion()` from `lib/claude/client.ts`
- `shuffleArray()` from `MultipleChoiceMode.tsx` (move to utility)
- `scheduleCard()` from `lib/fsrs/scheduler.ts`

## Summary

All "NEEDS CLARIFICATION" items from Technical Context have been resolved:

- Distractor generation: Claude API with structured prompt
- Time threshold: 10 seconds for fast/slow distinction
- Batching: Per-card on-demand
- Fallback: Flip-reveal mode with toast notification
- API config: Existing client with reduced max_tokens

Ready to proceed to Phase 1: Design & Contracts.
