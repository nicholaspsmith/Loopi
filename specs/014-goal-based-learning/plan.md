# Implementation Plan: Memoryloop v2 - Goal-Based Learning Platform

**Branch**: `014-goal-based-learning` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-goal-based-learning/spec.md`

## Summary

Transform Memoryloop from a chat-based flashcard generator into a goal-based learning platform. Users define learning goals, the system generates AI-powered skill trees, and users study through multiple modes (flashcards, multiple choice, timed challenges) with mastery tracking and non-punishing gamification.

**Key Technical Approach:**

- Extend PostgreSQL schema with new tables for goals, skill trees, nodes, achievements
- Refactor LLM integration from chat-based to goal-scoped card generation
- Build new React components for skill tree visualization and multiple study modes
- Retain existing FSRS, auth, and deck infrastructure

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, Drizzle ORM 0.45.1, ts-fsrs 5.2.3
**Storage**: PostgreSQL (via postgres 3.4.7), LanceDB 0.22.3 (vector embeddings)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web (responsive), self-hosted
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Skill tree generation < 30s (SC-001), Card generation < 60s for 10 cards (SC-002)
**Constraints**: Local Ollama LLM, no external API dependencies for core features
**Scale/Scope**: Single user to small team, ~20 new components, 6 new database tables

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status     | Evidence                                                                         |
| ---------------------- | ---------- | -------------------------------------------------------------------------------- |
| I. Documentation-First | ✅ PASS    | Spec complete with 6 user stories, 32 FRs, 9 SCs                                 |
| II. Test-First (TDD)   | ✅ PASS    | Test Strategy section defines unit/integration/E2E breakdown                     |
| III. Modularity        | ✅ PASS    | User stories are independently testable (P1 can ship without P3)                 |
| IV. Simplicity (YAGNI) | ✅ PASS    | Curated trees, social features deferred to post-MVP                              |
| V. Observability       | ✅ PASS    | Logging Strategy section defines structured logs for LLM, sessions, achievements |
| VI. Atomic Commits     | ⚠️ PLANNED | Will follow .claude/rules.md during implementation                               |

**Gate Status: PASS** - All principles satisfied. Commit discipline will be enforced during implementation phase.

## Project Structure

### Documentation (this feature)

```text
specs/014-goal-based-learning/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output - technical decisions
├── data-model.md        # Phase 1 output - database schema
├── quickstart.md        # Phase 1 output - getting started
├── contracts/           # Phase 1 output - API contracts
│   ├── goals.md         #   Goal CRUD endpoints
│   ├── skill-tree.md    #   Skill tree operations
│   ├── cards.md         #   Card generation endpoints
│   ├── study.md         #   Study session endpoints
│   ├── achievements.md  #   Achievement & title endpoints
│   └── analytics.md     #   Analytics & dashboard endpoints
├── code-audit.md        # Codebase categorization (KEEP/MODIFY/REMOVE/NEW)
├── ui-wireframes.md     # UI designs and component hierarchy
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure (existing)
app/
├── (auth)/                    # Auth pages (KEEP)
├── (protected)/               # Protected routes
│   ├── goals/                 # NEW: Goal management
│   │   ├── page.tsx           # Goals dashboard
│   │   ├── new/page.tsx       # Create goal + skill tree
│   │   └── [goalId]/
│   │       ├── page.tsx       # Goal detail + tree view
│   │       ├── generate/page.tsx  # Card generation
│   │       └── study/page.tsx     # Study session
│   ├── progress/page.tsx      # NEW: Mastery dashboard
│   └── achievements/page.tsx  # NEW: Achievements page
├── api/
│   ├── goals/                 # NEW: Goal APIs
│   │   ├── route.ts           # List/create goals
│   │   └── [goalId]/
│   │       ├── route.ts       # Goal CRUD
│   │       ├── skill-tree/route.ts  # Tree operations
│   │       └── generate/route.ts    # Card generation
│   ├── study/                 # MODIFY: Add study modes
│   └── achievements/          # NEW: Achievement APIs

components/
├── goals/                     # NEW: Goal components
│   ├── GoalCard.tsx
│   ├── GoalForm.tsx
│   └── GoalProgress.tsx
├── skills/                    # NEW: Skill tree components
│   ├── SkillTree.tsx
│   ├── SkillNode.tsx
│   └── SkillTreeEditor.tsx
├── study/                     # MODIFY: Multiple modes
│   ├── StudyModeSelector.tsx
│   ├── FlashcardMode.tsx
│   ├── MultipleChoiceMode.tsx
│   └── TimedChallengeMode.tsx
├── dashboard/                 # NEW: Mastery visualization
│   ├── MasteryDashboard.tsx
│   └── ReviewForecast.tsx
└── achievements/              # NEW: Gamification
    ├── AchievementCard.tsx
    └── TitleBadge.tsx

lib/
├── db/
│   ├── drizzle-schema.ts      # MODIFY: Add new tables
│   └── operations/
│       ├── goals.ts           # NEW
│       ├── skill-trees.ts     # NEW
│       ├── skill-nodes.ts     # NEW
│       ├── achievements.ts    # NEW
│       └── topic-analytics.ts # NEW
├── ai/                        # MODIFY: Refactor for goals
│   ├── skill-tree-generator.ts   # NEW
│   └── card-generator.ts         # MODIFY: scope to nodes
└── fsrs/                      # KEEP: Existing FSRS

tests/
├── unit/                      # Vitest unit tests
├── integration/               # Vitest integration tests
└── e2e/                       # Playwright E2E tests
```

**Structure Decision**: Extend existing Next.js App Router structure. New features added as parallel routes and components. Chat-related code deprecated but not removed until Phase 3 (post-MVP).

## Complexity Tracking

No constitution violations requiring justification. Feature adds complexity but:

- Each new component serves a single purpose (Modularity)
- No speculative features (Simplicity)
- All additions traced to specific FRs in spec

## Implementation Phases

### Phase 1: Core Infrastructure (P1 User Stories)

- Database schema for goals, skill trees, nodes
- Goal creation API with LLM skill tree generation
- Skill tree UI components
- Card generation scoped to nodes
- Basic study modes (flashcard, multiple choice)

### Phase 2: Visualization & Polish (P2 User Stories)

- Mastery dashboard with tree visualization
- Review forecast display
- Chat deprecation (remove routes, keep data for migration)

### Phase 3: Engagement (P3 User Stories)

- Achievements system
- Titles/ranks
- Topic analytics

See [tasks.md](./tasks.md) for detailed task breakdown (generated by `/speckit.tasks`).

## Core Implementation Steps

Detailed step-by-step implementation with artifact references.

### Step 1: Database Schema Extension

**Artifact**: [data-model.md](./data-model.md)

1. Add new tables to `lib/db/drizzle-schema.ts`:
   - `learningGoals` (see data-model.md §1)
   - `skillTrees` (see data-model.md §2)
   - `skillNodes` (see data-model.md §3)
   - `userAchievements` (see data-model.md §5)
   - `userTitles` (see data-model.md §6)
   - `topicAnalytics` (see data-model.md §7)
2. Extend `flashcards` table with `skillNodeId`, `cardType`, `cardMetadata` (see data-model.md §4)
3. Add Drizzle relations for convenient querying (see data-model.md §Drizzle Relations)
4. Generate and run migrations via `drizzle-kit`

### Step 2: Database Operations Layer

**Artifact**: [data-model.md](./data-model.md)

1. Create `lib/db/operations/goals.ts` - CRUD for learning goals
2. Create `lib/db/operations/skill-trees.ts` - Tree creation, regeneration
3. Create `lib/db/operations/skill-nodes.ts` - Node updates, mastery calculation
4. Create `lib/db/operations/achievements.ts` - Achievement checks, unlocks
5. Create `lib/db/operations/topic-analytics.ts` - Topic normalization, upserts

### Step 3: AI Integration - Skill Tree Generation

**Artifacts**: [research.md](./research.md) §2, [contracts/skill-tree.md](./contracts/skill-tree.md)

1. Create `lib/ai/skill-tree-generator.ts`:
   - Use prompt template from research.md §2
   - Implement JSON validation and retry logic
   - Parse nested structure into flat nodes with materialized paths
2. Integrate with Ollama using existing patterns from `lib/embeddings/ollama.ts`

### Step 4: AI Integration - Card Generation Refactor

**Artifacts**: [research.md](./research.md) §4, [contracts/cards.md](./contracts/cards.md)

1. Refactor `lib/ai/card-generator.ts` (from `lib/claude/flashcard-generator.ts`):
   - Accept `nodeId` parameter for scoped generation
   - Support `cardType` parameter (flashcard, multiple_choice)
   - Generate distractors for MC cards (see research.md §4)
2. Add refinement flow with feedback parameter

### Step 5: Goal & Skill Tree APIs

**Artifacts**: [contracts/goals.md](./contracts/goals.md), [contracts/skill-tree.md](./contracts/skill-tree.md)

1. Create `app/api/goals/route.ts` - List/create goals
2. Create `app/api/goals/[goalId]/route.ts` - Get/update/delete goal
3. Create `app/api/goals/[goalId]/skill-tree/route.ts` - Get tree
4. Create `app/api/goals/[goalId]/skill-tree/regenerate/route.ts` - Regenerate with feedback
5. Create `app/api/goals/[goalId]/skill-tree/nodes/[nodeId]/route.ts` - Update node

### Step 6: Card Generation APIs

**Artifact**: [contracts/cards.md](./contracts/cards.md)

1. Create `app/api/goals/[goalId]/generate/route.ts` - Generate cards for node
2. Create `app/api/goals/[goalId]/generate/commit/route.ts` - Commit approved cards
3. Create `app/api/goals/[goalId]/generate/refine/route.ts` - Refine with feedback

### Step 7: Study Session APIs

**Artifact**: [contracts/study.md](./contracts/study.md)

1. Create `app/api/study/session/route.ts` - Start session
2. Modify `app/api/study/rate/route.ts` - Add mode tracking (existing: `app/api/quiz/rate`)
3. Create `app/api/study/session/complete/route.ts` - Complete session, trigger achievements

### Step 8: Achievement & Analytics APIs

**Artifacts**: [contracts/achievements.md](./contracts/achievements.md), [contracts/analytics.md](./contracts/analytics.md)

1. Create `app/api/achievements/route.ts` - Get user achievements
2. Create `app/api/achievements/definitions/route.ts` - Get all definitions
3. Create `app/api/analytics/dashboard/route.ts` - Dashboard stats
4. Create `app/api/analytics/topics/route.ts` - Topic trends (admin)

### Step 9: UI Components - Goals & Skills

**Artifact**: [ui-wireframes.md](./ui-wireframes.md)

1. Create `components/goals/GoalCard.tsx` - Goal summary card
2. Create `components/goals/GoalForm.tsx` - Create/edit goal form
3. Create `components/goals/GoalProgress.tsx` - Progress visualization
4. Create `components/skills/SkillTree.tsx` - Tree visualization
5. Create `components/skills/SkillNode.tsx` - Individual node
6. Create `components/skills/SkillTreeEditor.tsx` - Enable/disable nodes

### Step 10: UI Components - Study Modes

**Artifacts**: [ui-wireframes.md](./ui-wireframes.md), [contracts/study.md](./contracts/study.md)

1. Create `components/study/StudyModeSelector.tsx` - Mode selection
2. Create `components/study/FlashcardMode.tsx` - Flip-to-reveal
3. Create `components/study/MultipleChoiceMode.tsx` - 4-option quiz
4. Create `components/study/TimedChallengeMode.tsx` - Countdown + scoring
5. Create `components/study/MixedMode.tsx` - Random format selection

### Step 11: Pages

**Artifact**: [ui-wireframes.md](./ui-wireframes.md)

1. Create `app/(protected)/goals/page.tsx` - Goals dashboard
2. Create `app/(protected)/goals/new/page.tsx` - Create goal flow
3. Create `app/(protected)/goals/[goalId]/page.tsx` - Goal detail + tree
4. Create `app/(protected)/goals/[goalId]/generate/page.tsx` - Card generation
5. Create `app/(protected)/goals/[goalId]/study/page.tsx` - Study session
6. Create `app/(protected)/progress/page.tsx` - Mastery dashboard
7. Create `app/(protected)/achievements/page.tsx` - Achievements page

### Step 12: Navigation & Deprecation

**Artifact**: [code-audit.md](./code-audit.md)

1. Update `app/(protected)/layout.tsx` - New nav structure
2. Update `components/nav/Navigation.tsx` - Goals-first links
3. Redirect `/chat` to `/goals` (or remove)
4. Redirect `/quiz` to goal-based study

## Test Strategy

Tests written before implementation per TDD principle (Constitution II).

### Unit Tests (Vitest)

Location: `tests/unit/`

| Module                             | Test Focus                              |
| ---------------------------------- | --------------------------------------- |
| `lib/db/operations/goals.ts`       | CRUD operations, status transitions     |
| `lib/db/operations/skill-nodes.ts` | Path generation, mastery calculation    |
| `lib/ai/skill-tree-generator.ts`   | JSON parsing, validation, retry logic   |
| `lib/ai/card-generator.ts`         | Card format, distractor generation      |
| Mastery algorithm                  | Weighted average from research.md §3    |
| Topic normalization                | Normalization rules from research.md §7 |

### Integration Tests (Vitest)

Location: `tests/integration/`

| Flow                 | Test Focus                                     |
| -------------------- | ---------------------------------------------- |
| Goal creation        | API → DB → Skill tree generation               |
| Card generation      | API → LLM → DB → LanceDB sync                  |
| Study session        | Start → Rate cards → Complete → Mastery update |
| Achievement triggers | Session complete → Check conditions → Unlock   |

### E2E Tests (Playwright)

Location: `tests/e2e/`

| User Flow                   | Acceptance Criteria              |
| --------------------------- | -------------------------------- |
| Create goal with skill tree | SC-001: < 30 seconds             |
| Generate 10 cards           | SC-002: < 60 seconds             |
| Complete study session      | SC-003: 20 cards in < 10 minutes |
| View mastery dashboard      | SC-007: Accurate within 1%       |

## Logging Strategy

Structured logging for observability per Constitution principle V.

### LLM Calls

```typescript
logger.info('skill_tree_generation', {
  goalId,
  topic,
  model,
  durationMs,
  nodeCount,
  success,
})
logger.info('card_generation', {
  nodeId,
  cardType,
  count,
  durationMs,
  success,
})
```

### Study Sessions

```typescript
logger.info('study_session_start', {
  userId,
  goalId,
  mode,
  cardCount,
})
logger.info('study_session_complete', {
  userId,
  goalId,
  mode,
  durationMs,
  averageRating,
  masteryDelta,
})
```

### Achievement Triggers

```typescript
logger.info('achievement_unlocked', {
  userId,
  achievementKey,
  metadata,
})
logger.info('title_upgraded', {
  userId,
  oldTitle,
  newTitle,
})
```

## Metrics Collection Strategy

The following success criteria require manual or analytics-based validation:

| Criterion                   | Measurement Approach                                                       |
| --------------------------- | -------------------------------------------------------------------------- |
| SC-004 (80% return rate)    | Analytics: track goal_created → first_study_session within 7 days          |
| SC-005 (85% retention)      | Dashboard displays this; validated by E2E test (mastery-dashboard.spec.ts) |
| SC-006 (70% card quality)   | Post-MVP: add thumbs up/down rating on generated cards                     |
| SC-008 (zero guilt reports) | User interviews during beta testing; no implementation required            |

**Note**: SC-001, SC-002, SC-003, SC-007, SC-009 have explicit E2E tests in tasks.md.
