# Implementation Plan: Flashcard Rating Labels Update

**Branch**: `003-flashcard-rating-labels` | **Date**: 2025-12-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-flashcard-rating-labels/spec.md`

## Summary

Update flashcard rating UI labels to use grammatically sensible language. Change the prompt from "How well did you know this?" to "How hard was this question?" and update button labels from "Again/Hard/Good/Easy" to "Very hard/Hard/Easy/Very Easy".

## Technical Context

**Language/Version**: TypeScript 5.x with React 18 (Next.js 16)
**Primary Dependencies**: React, Tailwind CSS
**Storage**: N/A (UI-only change, no data model changes)
**Testing**: Vitest with React Testing Library
**Target Platform**: Web (responsive)
**Project Type**: Web application (Next.js)
**Performance Goals**: N/A (simple label text change)
**Constraints**: N/A
**Scale/Scope**: 2 component files, 1 test file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status | Notes                                             |
| ---------------------- | ------ | ------------------------------------------------- |
| I. Documentation-First | PASS   | Spec complete with acceptance scenarios           |
| II. Test-First (TDD)   | PASS   | Tests exist, will update expectations             |
| III. Modularity        | PASS   | Changes isolated to RatingButtons + QuizInterface |
| IV. Simplicity (YAGNI) | PASS   | Minimal change, no new abstractions               |
| V. Observability       | PASS   | N/A for UI label change                           |
| VI. Atomic Commits     | PASS   | Single logical change                             |

**Gate Status**: PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/003-flashcard-rating-labels/
├── plan.md              # This file
├── spec.md              # Feature specification
└── checklists/
    └── requirements.md  # Validation checklist
```

### Source Code (repository root)

```text
components/quiz/
├── RatingButtons.tsx    # Primary: Update labels and prompt text
└── QuizInterface.tsx    # Secondary: Update undo toast label mapping

tests/unit/components/quiz/
└── QuizCard.test.tsx    # Update test expectations for new labels
```

**Structure Decision**: Existing Next.js web application structure. Changes are isolated to the quiz components directory.

## Implementation Details

### Files to Modify

#### 1. `components/quiz/RatingButtons.tsx`

**Changes Required**:

- Line 17-20: Update `ratings` array labels
  - `'Again'` → `'Very hard'`
  - `'Hard'` → `'Hard'` (no change)
  - `'Good'` → `'Easy'`
  - `'Easy'` → `'Very Easy'`
- Line 27: Update aria-label from "Rate your knowledge of this flashcard" to "Rate the difficulty of this question"
- Line 29-30: Update prompt text from "How well did you know this?" to "How hard was this question?"
- Line 38: Update aria-label pattern to use new terminology

#### 2. `components/quiz/QuizInterface.tsx`

**Changes Required**:

- Lines 619-625: Update undo toast label mapping
  - `'Again'` → `'Very hard'`
  - `'Hard'` → `'Hard'` (no change)
  - `'Good'` → `'Easy'`
  - `'Easy'` → `'Very Easy'`

#### 3. `tests/unit/components/quiz/QuizCard.test.tsx`

**Changes Required**:

- Update test descriptions and assertions to use new labels
- Line 128+: "when Again is clicked" → "when Very hard is clicked"
- Line 160+: "when Good is clicked" → "when Easy is clicked"
- Line 175+: "when Easy is clicked" → "when Very Easy is clicked"

### Label Mapping Reference

| FSRS Value | Old Label | New Label | Color (unchanged) |
| ---------- | --------- | --------- | ----------------- |
| 1          | Again     | Very hard | red               |
| 2          | Hard      | Hard      | orange            |
| 3          | Good      | Easy      | green             |
| 4          | Easy      | Very Easy | blue              |

## Core Implementation Steps

1. **Update RatingButtons component** (FR-001, FR-002, FR-004)
   - Modify prompt text
   - Modify button labels array
   - Update accessibility aria-labels

2. **Update QuizInterface undo toast** (FR-005)
   - Modify label mapping in undo snackbar

3. **Update test expectations**
   - Modify QuizCard.test.tsx to expect new labels

## Complexity Tracking

> No complexity violations - simple text replacement across 2 components and 1 test file.
