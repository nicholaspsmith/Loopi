# Tasks: Study UI Improvements

**Input**: Design documents from `/specs/020-study-ui-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: E2E tests (Playwright) included per TDD constitution requirement.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project setup needed - this feature extends existing components

_All required infrastructure already exists. Proceed to Phase 2._

---

## Phase 2: Foundational (No Blocking Prerequisites)

**Purpose**: This feature is UI-focused with no new database schemas or shared infrastructure needed

**Analysis**: All 3 user stories modify different files and can proceed independently:

- US2: FlashcardMode.tsx
- US3: MultipleChoiceMode.tsx
- US1: SkillTreeEditor.tsx, NodeStudyModal.tsx (new), StudySummary.tsx (new)

**Checkpoint**: No foundational work required - user stories can start immediately in parallel

---

## Phase 3: User Story 2 - Fix Card Flip Interactions (Priority: P2)

**Goal**: Spacebar flips the flashcard with a proper 3D animation

**Independent Test**: Enter study mode, press spacebar, verify card flips with 3D animation

**Why First**: Simplest story, isolated to single file, establishes patterns for animations

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T001 [P] [US2] E2E test: spacebar flips flashcard in tests/e2e/study-ui.spec.ts
- [x] T002 [P] [US2] E2E test: 3D flip animation visible during flip in tests/e2e/study-ui.spec.ts

### Implementation for User Story 2

- [x] T003 [P] [US2] Add document-level keydown listener for spacebar in components/study/FlashcardMode.tsx
- [x] T004 [P] [US2] Implement input focus guard to prevent spacebar flip when typing in components/study/FlashcardMode.tsx
- [x] T005 [US2] Refactor card container with perspective CSS property (1000px) in components/study/FlashcardMode.tsx
- [x] T006 [US2] Add transform-style: preserve-3d and rotateY(180deg) flip animation in components/study/FlashcardMode.tsx
- [x] T007 [US2] Add backface-visibility: hidden to both card faces in components/study/FlashcardMode.tsx
- [x] T008 [US2] Test spacebar flip prevents default scroll and responds within 100ms in components/study/FlashcardMode.tsx

**Checkpoint**: Spacebar flips card with 3D animation. Verify in Safari for vendor prefix needs.

---

## Phase 4: User Story 3 - Multiple Choice Submit Button (Priority: P2)

**Goal**: Multiple choice requires explicit Submit click, then Next button after feedback

**Independent Test**: Answer MC question, verify no auto-submit, click Submit, see feedback, click Next

**Why Second**: Single file change, no dependencies on other stories

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US3] E2E test: selecting MC answer does not auto-submit in tests/e2e/study-ui.spec.ts
- [x] T010 [P] [US3] E2E test: Submit button enables after selection in tests/e2e/study-ui.spec.ts
- [x] T011 [P] [US3] E2E test: Next button appears after submission in tests/e2e/study-ui.spec.ts

### Implementation for User Story 3

- [x] T012 [US3] Add selectedOption state (separate from submission) in components/study/MultipleChoiceMode.tsx
- [x] T013 [US3] Add isSubmitted state to track submission status in components/study/MultipleChoiceMode.tsx
- [x] T014 [US3] Implement selection highlighting (blue border) without auto-submit in components/study/MultipleChoiceMode.tsx
- [x] T015 [US3] Add Submit button (disabled until selection, hidden after submission) in components/study/MultipleChoiceMode.tsx
- [x] T016 [US3] Implement submission handler showing correct (green) / incorrect (red) feedback in components/study/MultipleChoiceMode.tsx
- [x] T017 [US3] Add Next button (visible after submission) to proceed to next card in components/study/MultipleChoiceMode.tsx
- [x] T018 [US3] Remove existing auto-advance setTimeout logic in components/study/MultipleChoiceMode.tsx
- [x] T019 [US3] Disable option selection after submission (prevent re-selection) in components/study/MultipleChoiceMode.tsx

**Checkpoint**: MC answers require explicit Submit, show feedback, require Next to proceed. No accidental submissions.

---

## Phase 5: User Story 1 - Study Individual Node with Children (Priority: P2)

**Goal**: Highlight node + children, show study button, select card count, complete session with summary

**Independent Test**: Highlight node, click study button, select card count, study cards, see summary

**Why Third**: Most complex story, requires new components, benefits from patterns established in US2/US3

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US1] E2E test: clicking node highlights node and children in tests/e2e/study-ui.spec.ts
- [x] T021 [P] [US1] E2E test: study button appears on highlighted node in tests/e2e/study-ui.spec.ts
- [x] T022 [P] [US1] E2E test: card count modal shows slider with increments of 5 in tests/e2e/study-ui.spec.ts
- [x] T023 [P] [US1] E2E test: session summary shows after completing all cards in tests/e2e/study-ui.spec.ts

### Implementation for User Story 1

#### Node Highlighting in SkillTreeEditor

- [x] T024 [US1] Add highlightedNodeId state (separate from selectedNodeId) in components/skills/SkillTreeEditor.tsx
- [x] T025 [US1] Implement getDescendantIds helper using path matching (path LIKE 'node_path%') in components/skills/SkillTreeEditor.tsx
- [x] T026 [US1] Calculate totalCardCount for highlighted node + all descendants in components/skills/SkillTreeEditor.tsx
- [x] T027 [US1] Pass highlightedNodeId and descendantIds to SkillTree for visual highlighting in components/skills/SkillTreeEditor.tsx
- [x] T028 [US1] Add study button to highlighted node (right side, next to percent complete) in components/skills/SkillTreeEditor.tsx
- [x] T029 [US1] Show "Study N cards" on button, disable with tooltip if totalCardCount = 0 in components/skills/SkillTreeEditor.tsx

#### Node Study Modal (New Component)

- [x] T030 [US1] Create NodeStudyModal component with modal structure in components/study/NodeStudyModal.tsx
- [x] T031 [US1] Implement card count slider with increments of 5 in components/study/NodeStudyModal.tsx
- [x] T032 [US1] Add "All (N)" as final option where N = total cards in components/study/NodeStudyModal.tsx
- [x] T033 [US1] Handle edge case: if total < 5, show "Study all N cards" button directly in components/study/NodeStudyModal.tsx
- [x] T034 [US1] Add confirm button to start study session with selected count in components/study/NodeStudyModal.tsx

#### Session Summary (New Component)

- [x] T035 [US1] Create StudySummary component with session stats display in components/study/StudySummary.tsx
- [x] T036 [US1] Display cards completed (X/Y) and accuracy percentage in components/study/StudySummary.tsx
- [x] T037 [US1] Add "Done" button to return to skill tree view in components/study/StudySummary.tsx

#### Integration

- [x] T038 [US1] Wire NodeStudyModal open/close to study button click in components/skills/SkillTreeEditor.tsx
- [x] T039 [US1] Pass nodeId, includeChildren, cardLimit to POST /api/study/session when starting in components/skills/SkillTreeEditor.tsx
- [x] T040 [US1] Track correctCount/incorrectCount during session for summary stats in components/study/StudyMode.tsx
- [x] T041 [US1] Show StudySummary when all selected cards are completed in components/study/StudyMode.tsx

**Checkpoint**: Full node study flow works: highlight -> study button -> modal -> session -> summary -> return

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T042 [P] Test Safari vendor prefix needs for 3D transforms in components/study/FlashcardMode.tsx
- [x] T043 [P] Verify card ordering: node hierarchy (path ASC), then FSRS due-date within each node
- [x] T044 [P] Run quickstart.md validation scenarios for all 3 user stories
- [x] T045 Verify SC-001: Card flip responds within 100ms of spacebar press
- [x] T046 Verify SC-002: Users can highlight and begin targeted study in under 3 clicks
- [x] T047 Verify SC-003: Multiple choice answers are never auto-submitted

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A - no setup needed
- **Foundational (Phase 2)**: N/A - no foundational work needed
- **User Stories (Phase 3-5)**: Can all start immediately in parallel
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 2 (US2)**: No dependencies - isolated to FlashcardMode.tsx
- **User Story 3 (US3)**: No dependencies - isolated to MultipleChoiceMode.tsx
- **User Story 1 (US1)**: No dependencies on other stories (most complex, recommended last if sequential)

### Within Each User Story (TDD Order)

1. **Tests FIRST** - Write E2E tests, ensure they FAIL
2. Implementation tasks in order
3. Verify tests PASS after implementation
4. Story complete before moving to next (if sequential)

### Parallel Opportunities

- **All 3 user stories can run in parallel** (different files, no conflicts)
- Within US2: T001-T002 (tests) can run in parallel, then T003-T004 can run in parallel
- Within US3: T009-T011 (tests) can run in parallel
- Within US1: T020-T023 (tests) can run in parallel
- Within US1: T030-T034 can run in parallel with T035-T037 (different files)

---

## Parallel Example: All Stories in Parallel

```bash
# Launch all user stories simultaneously (if team capacity allows):
Agent A: User Story 2 (FlashcardMode.tsx) - 8 tasks (2 tests + 6 impl)
Agent B: User Story 3 (MultipleChoiceMode.tsx) - 11 tasks (3 tests + 8 impl)
Agent C: User Story 1 (SkillTreeEditor + new components) - 22 tasks (4 tests + 18 impl)
```

## Parallel Example: User Story 1 Internal Parallelism

```bash
# Within User Story 1, these can run in parallel:
Task: "Create NodeStudyModal component" in components/study/NodeStudyModal.tsx
Task: "Create StudySummary component" in components/study/StudySummary.tsx

# Then integration tasks after both complete
```

---

## Implementation Strategy

### TDD Workflow (Per User Story)

1. Write E2E tests for the story
2. Run tests - verify they FAIL (Red phase)
3. Implement features to make tests pass (Green phase)
4. Refactor if needed (Refactor phase)
5. Move to next story

### MVP First (Single Story)

1. Start with User Story 2 (simplest, 8 tasks)
2. Write tests T001-T002, verify FAIL
3. Implement T003-T008
4. **STOP and VALIDATE**: Verify tests PASS, spacebar flip works
5. Continue to User Story 3 or User Story 1

### Recommended Sequential Order

1. **User Story 2** (Phase 3): Simplest, establishes CSS animation patterns
2. **User Story 3** (Phase 4): Single file, state management patterns
3. **User Story 1** (Phase 5): Most complex, benefits from established patterns

### Parallel Team Strategy

With multiple developers:

- Developer A: User Story 2 -> Polish task T042, T045
- Developer B: User Story 3 -> Polish task T047
- Developer C: User Story 1 -> Polish tasks T043, T044, T046

---

## Summary

| Phase     | Description     | Task Count | Files Modified                                                                                         |
| --------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| 1         | Setup           | 0          | None                                                                                                   |
| 2         | Foundational    | 0          | None                                                                                                   |
| 3         | US2: Card Flip  | 8          | FlashcardMode.tsx, study-ui.spec.ts                                                                    |
| 4         | US3: MC Submit  | 11         | MultipleChoiceMode.tsx, study-ui.spec.ts                                                               |
| 5         | US1: Node Study | 22         | SkillTreeEditor.tsx, NodeStudyModal.tsx (new), StudySummary.tsx (new), StudyMode.tsx, study-ui.spec.ts |
| 6         | Polish          | 6          | Various                                                                                                |
| **Total** |                 | **47**     |                                                                                                        |

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **TDD mandatory**: Tests written and failing before implementation begins
- No new API endpoints needed - uses existing /api/study/session with nodeId and includeChildren
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
