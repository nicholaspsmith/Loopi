# Tasks: Flashcard Rating Labels Update

**Input**: Design documents from `/specs/003-flashcard-rating-labels/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: This is a single user story feature. All tasks belong to User Story 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Improved Rating Experience (Priority: P1) 🎯 MVP

**Goal**: Update rating prompt and button labels to use grammatically sensible language

**Independent Test**: Review any flashcard and verify:

1. Prompt displays "How hard was this question?"
2. Buttons display "Very hard", "Hard", "Easy", "Very Easy"
3. Undo toast shows correct label names

### Implementation for User Story 1

- [x] T001 [P] [US1] Update button labels in `components/quiz/RatingButtons.tsx`: Change 'Again' to 'Very hard', 'Good' to 'Easy', 'Easy' to 'Very Easy'
- [x] T002 [P] [US1] Update prompt text in `components/quiz/RatingButtons.tsx`: Change "How well did you know this?" to "How hard was this question?"
- [x] T003 [P] [US1] Update aria-label for button group in `components/quiz/RatingButtons.tsx`: Change "Rate your knowledge of this flashcard" to "Rate the difficulty of this question"
- [x] T004 [P] [US1] Update individual button aria-labels in `components/quiz/RatingButtons.tsx` to use new terminology
- [x] T005 [US1] Update undo toast label mapping in `components/quiz/QuizInterface.tsx`: Change 'Again' to 'Very hard', 'Good' to 'Easy', 'Easy' to 'Very Easy'
- [x] T006 [US1] Update test expectations in `tests/unit/components/quiz/QuizCard.test.tsx` to expect new label text

**Checkpoint**: All rating labels should display correctly in the UI

---

## Phase 2: Polish & Verification

**Purpose**: Ensure all changes work correctly together

- [x] T007 Run test suite with `npm test` and verify all tests pass
- [x] T008 Manual verification: Review a flashcard and verify all labels display correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (User Story 1)**: No dependencies - can start immediately
- **Phase 2 (Polish)**: Depends on Phase 1 completion

### Within Phase 1

- T001-T004: All modify `RatingButtons.tsx` - can be done as a single edit
- T005: Modifies `QuizInterface.tsx` - independent of T001-T004
- T006: Modifies test file - should be done after T001-T004 to align expectations

### Parallel Opportunities

Tasks T001-T004 all modify the same file, so they should be executed together as one edit. T005 modifies a different file and can run in parallel.

```bash
# Parallel execution example:
# Thread 1: T001-T004 (RatingButtons.tsx)
# Thread 2: T005 (QuizInterface.tsx)
# Then: T006 (tests)
```

---

## Implementation Strategy

### Single Commit Approach (Recommended)

Since this is a simple text replacement feature:

1. Execute T001-T005 in parallel (component updates)
2. Execute T006 (test updates)
3. Execute T007-T008 (verification)
4. Commit all changes as a single atomic commit

---

## Label Mapping Reference

| FSRS Value | Old Label | New Label | Color (unchanged) |
| ---------- | --------- | --------- | ----------------- |
| 1          | Again     | Very hard | red               |
| 2          | Hard      | Hard      | orange            |
| 3          | Good      | Easy      | green             |
| 4          | Easy      | Very Easy | blue              |

---

## Notes

- All tasks marked [P] can theoretically run in parallel, but T001-T004 modify the same file
- No foundational phase needed - this is a simple text replacement
- Commit after verification adhering to .claude/rules.md
- FSRS rating values (1-4) remain unchanged
