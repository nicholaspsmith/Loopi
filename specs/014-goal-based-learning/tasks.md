# Tasks: Memoryloop v2 - Goal-Based Learning Platform

**Input**: Design documents from `/specs/014-goal-based-learning/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Test Strategy in plan.md (TDD approach)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6) this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Pages**: `app/(protected)/` or `app/api/`
- **Components**: `components/`
- **Database**: `lib/db/`
- **AI**: `lib/ai/`
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup

**Purpose**: Project initialization and schema preparation

- [x] T001 Add learningGoals table to lib/db/drizzle-schema.ts (see data-model.md §1)
- [x] T002 [P] Add skillTrees table to lib/db/drizzle-schema.ts (see data-model.md §2)
- [x] T003 [P] Add skillNodes table to lib/db/drizzle-schema.ts (see data-model.md §3)
- [x] T004 [P] Add userAchievements table to lib/db/drizzle-schema.ts (see data-model.md §5)
- [x] T005 [P] Add userTitles table to lib/db/drizzle-schema.ts (see data-model.md §6)
- [x] T006 [P] Add topicAnalytics table to lib/db/drizzle-schema.ts (see data-model.md §7)
- [x] T007 Extend flashcards table with skillNodeId, cardType, cardMetadata in lib/db/drizzle-schema.ts (see data-model.md §4)
- [x] T008 Add Drizzle relations for new tables in lib/db/drizzle-schema.ts (see data-model.md §Drizzle Relations)
- [x] T009 Add type exports for new entities in lib/db/drizzle-schema.ts
- [x] T010 Generate database migration with `npx drizzle-kit generate`
- [x] T011 Run database migration with `npx drizzle-kit migrate`
- [x] T011.1 Install canvas-confetti dependency: `npm install canvas-confetti @types/canvas-confetti`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database operations and AI integration that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T012 Create lib/db/operations/goals.ts with CRUD operations (create, getById, getByUserId, update, delete)
- [x] T013 [P] Create lib/db/operations/skill-trees.ts with create, getByGoalId, update operations
- [x] T014 [P] Create lib/db/operations/skill-nodes.ts with CRUD and mastery calculation utilities
- [x] T015 [P] Create lib/ai/skill-tree-generator.ts with Ollama integration and JSON validation (see research.md §2)
- [x] T016 [P] Create lib/ai/card-generator.ts for node-scoped generation with Ollama integration (new file using lib/embeddings/ollama.ts patterns)
- [x] T017 Add mastery calculation algorithm to lib/db/operations/skill-nodes.ts (see research.md §3)
- [x] T018 Add topic normalization utility to lib/db/operations/topic-analytics.ts (see research.md §7)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create Learning Goal with Skill Tree (Priority: P1) MVP

**Goal**: Users can create learning goals and receive AI-generated skill trees

**Independent Test**: Create goal "Learn Kubernetes" and verify hierarchical tree displays with categories

### Tests for User Story 1

- [x] T019 [P] [US1] Unit test for goals operations in tests/unit/goals.test.ts
- [x] T020 [P] [US1] Unit test for skill tree generator in tests/unit/skill-tree-generator.test.ts
- [x] T021 [P] [US1] Integration test for goal creation flow in tests/integration/goal-creation.test.ts

### Implementation for User Story 1

- [x] T022 [US1] Create app/api/goals/route.ts with GET (list) and POST (create) handlers per contracts/goals.md
- [x] T023 [US1] Create app/api/goals/[goalId]/route.ts with GET, PATCH, DELETE handlers per contracts/goals.md
- [x] T024 [US1] Create app/api/goals/[goalId]/skill-tree/route.ts with GET handler per contracts/skill-tree.md
- [x] T025 [US1] Create app/api/goals/[goalId]/skill-tree/regenerate/route.ts with POST handler per contracts/skill-tree.md
- [x] T026 [US1] Create app/api/goals/[goalId]/skill-tree/nodes/[nodeId]/route.ts with PATCH handler per contracts/skill-tree.md
- [x] T027 [P] [US1] Create components/goals/GoalCard.tsx for goal summary display
- [x] T028 [P] [US1] Create components/goals/GoalForm.tsx for goal creation/editing
- [x] T029 [P] [US1] Create components/goals/GoalProgress.tsx for mastery progress bar
- [x] T030 [P] [US1] Create components/skills/SkillNode.tsx for individual node rendering
- [x] T031 [US1] Create components/skills/SkillTree.tsx for hierarchical tree visualization (depends on T030)
- [x] T032 [US1] Create components/skills/SkillTreeEditor.tsx for enable/disable node checkboxes
- [x] T033 [US1] Create app/(protected)/goals/page.tsx as goals dashboard (replaces home)
- [x] T034 [US1] Create app/(protected)/goals/new/page.tsx for goal creation flow with tree generation
- [x] T035 [US1] Create app/(protected)/goals/[goalId]/page.tsx for goal detail with skill tree view
- [x] T036 [US1] Add structured logging for skill_tree_generation per Logging Strategy in plan.md

**Checkpoint**: User Story 1 complete - can create goals and view skill trees

---

## Phase 4: User Story 2 - Generate Cards for Skill Tree Node (Priority: P1)

**Goal**: Users can generate flashcards scoped to specific skill tree nodes

**Independent Test**: Select node "Pods", generate 10 cards, verify they appear linked to node

### Tests for User Story 2

- [x] T037 [P] [US2] Unit test for card generator in tests/unit/card-generator.test.ts
- [x] T038 [P] [US2] Integration test for card generation flow in tests/integration/card-generation.test.ts

### Implementation for User Story 2

- [x] T039 [US2] Create app/api/goals/[goalId]/generate/route.ts with POST handler per contracts/cards.md
- [x] T040 [US2] Create app/api/goals/[goalId]/generate/commit/route.ts with POST handler per contracts/cards.md
- [x] T041 [US2] Create app/api/goals/[goalId]/generate/refine/route.ts with POST handler per contracts/cards.md
- [x] T042 [P] [US2] Create components/cards/CardPreview.tsx for generated card preview with edit/approve
- [x] T043 [P] [US2] Create components/cards/CardEditor.tsx for inline card editing
- [x] T044 [US2] Create app/(protected)/goals/[goalId]/generate/page.tsx for card generation UI
- [x] T045 [US2] Add LanceDB sync for new cards in lib/db/operations/flashcards-lancedb.ts
- [x] T046 [US2] Add structured logging for card_generation per Logging Strategy in plan.md

**Checkpoint**: User Story 2 complete - can generate and commit cards to nodes

---

## Phase 5: User Story 3 - Study with Multiple Modes (Priority: P1)

**Goal**: Users can study cards in flashcard, multiple choice, timed, and mixed modes

**Independent Test**: Start study session, switch between modes, verify FSRS updates after ratings

### Tests for User Story 3

- [x] T047 [P] [US3] Unit test for study session logic in tests/unit/study-session.test.ts
- [x] T048 [P] [US3] Integration test for study flow in tests/integration/study-session.test.ts
- [x] T049 [P] [US3] E2E test for complete study session in tests/e2e/study-session.spec.ts

### Implementation for User Story 3

- [x] T050 [US3] Create app/api/study/session/route.ts with POST handler per contracts/study.md
- [x] T051 [US3] Modify app/api/quiz/rate/route.ts to add mode tracking (or create app/api/study/rate/route.ts)
- [x] T052 [US3] Create app/api/study/session/complete/route.ts with POST handler per contracts/study.md
- [x] T053 [P] [US3] Create components/study/StudyModeSelector.tsx for mode selection UI
- [x] T054 [P] [US3] Create components/study/FlashcardMode.tsx with flip-to-reveal interaction
- [x] T055 [P] [US3] Create components/study/MultipleChoiceMode.tsx with 4-option quiz
- [x] T056 [P] [US3] Create components/study/TimedChallengeMode.tsx with countdown and scoring
- [x] T057 [US3] Create components/study/MixedMode.tsx combining all formats randomly
- [x] T058 [US3] Create components/study/StudySessionProvider.tsx for React Context session state (see research.md §5)
- [x] T059 [US3] Create app/(protected)/goals/[goalId]/study/page.tsx for study session UI
- [x] T060 [US3] Add structured logging for study_session_start and study_session_complete per Logging Strategy

**Checkpoint**: User Story 3 complete - can study with all four modes

---

## Phase 6: User Story 4 - View Mastery Dashboard (Priority: P2)

**Goal**: Users can view mastery progress, due cards, and time invested across goals

**Independent Test**: Study for a week, verify dashboard shows accurate mastery percentages

### Tests for User Story 4

- [x] T061 [P] [US4] Unit test for dashboard stats calculation in tests/unit/dashboard-stats.test.ts
- [x] T062 [P] [US4] E2E test for mastery dashboard accuracy in tests/e2e/mastery-dashboard.spec.ts (SC-007)

### Implementation for User Story 4

- [x] T063 [US4] Create app/api/analytics/dashboard/route.ts with GET handler per contracts/analytics.md
- [x] T064 [P] [US4] Create components/dashboard/MasteryDashboard.tsx for skill tree mastery visualization
- [x] T065 [P] [US4] Create components/dashboard/ReviewForecast.tsx for upcoming reviews display
- [x] T066 [P] [US4] Create components/dashboard/GoalStats.tsx for time invested and retention rate
- [x] T067 [US4] Create app/(protected)/progress/page.tsx for mastery dashboard page

**Checkpoint**: User Story 4 complete - can view learning progress

---

## Phase 7: User Story 5 - Earn Achievements and Titles (Priority: P3)

**Goal**: Users earn achievements and titles based on mastery milestones (non-punishing)

**Independent Test**: Master 50 cards, verify achievement unlocks with celebration

### Tests for User Story 5

- [x] T068 [P] [US5] Unit test for achievement trigger logic in tests/unit/achievements.test.ts
- [x] T069 [P] [US5] Integration test for achievement unlock flow in tests/integration/achievements.test.ts

### Implementation for User Story 5

- [x] T070 [US5] Create lib/db/operations/achievements.ts with check and unlock functions (see research.md §6)
- [x] T071 [US5] Create lib/db/operations/user-titles.ts with title ladder logic
- [x] T072 [US5] Create app/api/achievements/route.ts with GET handler per contracts/achievements.md
- [x] T073 [US5] Create app/api/achievements/definitions/route.ts with GET handler per contracts/achievements.md
- [x] T074 [P] [US5] Create components/achievements/AchievementCard.tsx for achievement display
- [x] T075 [P] [US5] Create components/achievements/TitleBadge.tsx for current title display
- [x] T076 [P] [US5] Create components/achievements/CelebrationOverlay.tsx with confetti animation
- [x] T077 [US5] Create app/(protected)/achievements/page.tsx for achievements page
- [x] T078 [US5] Integrate achievement checks into app/api/study/session/complete/route.ts
- [x] T079 [US5] Add structured logging for achievement_unlocked and title_upgraded per Logging Strategy

**Checkpoint**: User Story 5 complete - gamification working

---

## Phase 8: User Story 6 - Track Popular Topics for Curated Trees (Priority: P3)

**Goal**: System tracks topic popularity for future curated tree creation

**Independent Test**: Have multiple users create "AWS" goals, verify analytics show high demand

### Tests for User Story 6

- [x] T080 [P] [US6] Unit test for topic normalization in tests/unit/topic-analytics.test.ts

### Implementation for User Story 6

- [x] T081 [US6] Complete lib/db/operations/topic-analytics.ts with upsert and ranking queries
- [x] T082 [US6] Create app/api/analytics/topics/route.ts with GET handler per contracts/analytics.md
- [x] T083 [US6] Integrate topic recording into goal creation flow in app/api/goals/route.ts

**Checkpoint**: User Story 6 complete - topic analytics working

---

## Phase 9: Polish & Navigation Update

**Purpose**: Navigation updates, deprecation, and cross-cutting concerns

- [x] T084 Update app/(protected)/layout.tsx with new navigation structure (Goals, Progress, Achievements)
- [x] T085 Update components/nav/Navigation.tsx with goals-first links
- [x] T086 Add redirect from /chat to /goals in app/(protected)/chat/page.tsx (or remove entirely)
- [x] T087 Redirect /quiz to goal-based study in app/(protected)/quiz/page.tsx
- [x] T088 [P] E2E test for goal creation performance in tests/e2e/goal-creation.spec.ts (SC-001: < 30s)
- [x] T089 [P] E2E test for card generation performance in tests/e2e/card-generation.spec.ts (SC-002: < 60s)
- [x] T090 Run quickstart.md validation - verify all documented flows work
- [x] T091 Final code cleanup and removal of unused chat-related imports

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T011) - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1-US3 (P1): Core functionality, complete in order
  - US4 (P2): Can start after US3 complete
  - US5-US6 (P3): Can start after US4 complete, or in parallel
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after US1 (needs goals and skill trees to exist)
- **User Story 3 (P1)**: Can start after US2 (needs cards to study)
- **User Story 4 (P2)**: Can start after US3 (needs study data for dashboard)
- **User Story 5 (P3)**: Can start after US3 (achievements trigger on study completion)
- **User Story 6 (P3)**: Can start after US1 (tracks goal creation topics)

### Within Each User Story

- Tests written FIRST (TDD per Constitution II)
- API routes before UI components
- Components before pages
- Core implementation before integration

### Parallel Opportunities

- T001-T009: All schema tasks can run in parallel
- T012-T018: All foundational operations can run in parallel
- Component tasks marked [P] within each story can run in parallel
- US5 and US6 can run in parallel after US4

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all schema tasks together:
Task: "Add learningGoals table to lib/db/drizzle-schema.ts"
Task: "Add skillTrees table to lib/db/drizzle-schema.ts"
Task: "Add skillNodes table to lib/db/drizzle-schema.ts"
Task: "Add userAchievements table to lib/db/drizzle-schema.ts"
Task: "Add userTitles table to lib/db/drizzle-schema.ts"
Task: "Add topicAnalytics table to lib/db/drizzle-schema.ts"
```

## Parallel Example: User Story 3 Components

```bash
# Launch all study mode components together:
Task: "Create components/study/StudyModeSelector.tsx"
Task: "Create components/study/FlashcardMode.tsx"
Task: "Create components/study/MultipleChoiceMode.tsx"
Task: "Create components/study/TimedChallengeMode.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T011)
2. Complete Phase 2: Foundational (T012-T018) - CRITICAL
3. Complete Phase 3: User Story 1 (T019-T036)
4. **STOP and VALIDATE**: Test goal creation and skill tree generation
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → Test independently → Deploy (Card Generation)
4. Add User Story 3 → Test independently → Deploy (Study Modes)
5. Add User Story 4 → Test independently → Deploy (Dashboard)
6. Add User Stories 5+6 → Test → Deploy (Gamification + Analytics)

### Suggested MVP Scope

**Minimum viable product includes**:

- Phase 1: Setup (12 tasks)
- Phase 2: Foundational (7 tasks)
- Phase 3: User Story 1 (18 tasks)

**Total MVP tasks**: 37 tasks

---

## Summary

| Phase     | User Story              | Priority | Task Count | Parallel Tasks |
| --------- | ----------------------- | -------- | ---------- | -------------- |
| 1         | Setup                   | -        | 12         | 6              |
| 2         | Foundational            | -        | 7          | 4              |
| 3         | US1: Goals + Skill Tree | P1       | 18         | 7              |
| 4         | US2: Card Generation    | P1       | 10         | 2              |
| 5         | US3: Study Modes        | P1       | 14         | 6              |
| 6         | US4: Mastery Dashboard  | P2       | 7          | 4              |
| 7         | US5: Achievements       | P3       | 12         | 4              |
| 8         | US6: Topic Analytics    | P3       | 4          | 1              |
| 9         | Polish                  | -        | 8          | 2              |
| **Total** |                         |          | **92**     | **36**         |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
