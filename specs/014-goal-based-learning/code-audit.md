# v2 Pivot Codebase Audit

**Created**: 2025-12-27
**Purpose**: Categorize existing code for the goal-based learning pivot

## Summary

| Category | Count | Description                                              |
| -------- | ----- | -------------------------------------------------------- |
| KEEP     | 42    | Auth, FSRS, LanceDB, PostgreSQL, core flashcard/deck ops |
| MODIFY   | 9     | UI components, API routes, navigation                    |
| REMOVE   | 16    | Chat interface, conversation/message handling            |
| NEW      | 18    | Goals, skill trees, analytics, new pages                 |

---

## KEEP (No Changes Needed)

### Authentication & User Management

- `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `app/api/auth/signup/route.ts` - User registration
- `app/api/auth/login/route.ts` - Auth logic
- `app/api/auth/forgot-password/route.ts` - Password recovery
- `app/api/auth/reset-password/route.ts` - Password reset
- `app/api/auth/verify-email/route.ts` - Email verification
- `app/(auth)/login/page.tsx` - Login UI
- `app/(auth)/signup/page.tsx` - Signup UI
- `components/auth/*` - Auth components
- `lib/auth/*` - Auth utilities
- `lib/db/operations/users.ts` - User CRUD
- `lib/db/operations/api-keys.ts` - API key management

### FSRS Spaced Repetition

- `lib/fsrs/scheduler.ts` - Core FSRS algorithm
- `lib/fsrs/utils.ts` - FSRS helpers
- `lib/fsrs/deck-scheduler.ts` - Deck scheduling
- `lib/db/operations/review-logs.ts` - Review history

### LanceDB Vector Operations

- `lib/db/schema.ts` - LanceDB initialization
- `lib/db/operations/flashcards-lancedb.ts` - Vector sync
- `lib/embeddings/ollama.ts` - Embedding generation

### PostgreSQL/Drizzle Setup

- `lib/db/client.ts` - DB connection
- `lib/db/pg-client.ts` - PostgreSQL client
- `lib/db/drizzle-schema.ts` - Schema definition
- `lib/db/operations/email-queue.ts` - Email delivery
- `lib/db/operations/password-reset-tokens.ts`
- `lib/db/operations/email-verification-tokens.ts`
- `lib/db/operations/security-logs.ts`
- `lib/db/operations/rate-limits.ts`

### Core Flashcard/Deck Operations

- `lib/db/operations/flashcards.ts` - Flashcard CRUD
- `lib/db/operations/decks.ts` - Deck management
- `lib/db/operations/deck-cards.ts` - Deck-card junction
- `app/api/decks/route.ts` - Deck API
- `app/api/decks/[deckId]/route.ts` - Individual deck ops
- `app/api/decks/[deckId]/cards/route.ts` - Deck cards

### Review & Study Session

- `app/api/quiz/due/route.ts` - Due cards
- `app/api/quiz/rate/route.ts` - Rating
- `app/api/quiz/history/route.ts` - History
- `app/api/quiz/stats/route.ts` - Statistics
- `app/api/study/deck-session/route.ts` - Session init
- `app/api/study/deck-session/changes/route.ts` - Session changes

---

## MODIFY (Adapt for New System)

### Flashcard Components

Add skill node linking:

- `components/flashcards/FlashcardPreview.tsx`
- `components/quiz/QuizCard.tsx`
- `components/quiz/QuizInterface.tsx`

### Quiz/Study Components

Add multiple study modes:

- `components/quiz/QuizProgress.tsx` - Show goal progress
- `components/study/DeckStudyInterface.tsx` - Rename to goal-study
- `components/quiz/RatingButtons.tsx` - Keep as-is

### Dashboard/Analytics

Goal-centric mastery visualization:

- `app/(protected)/layout.tsx` - Nav tabs
- `components/nav/Navigation.tsx` - Update links

---

## REMOVE (Deprecated)

### Chat Interface

- `app/(protected)/chat/page.tsx`
- `app/(protected)/chat/loading.tsx`
- `app/(protected)/chat/error.tsx`
- `components/chat/ChatInterface.tsx`
- `components/chat/MessageList.tsx`
- `components/chat/MessageInput.tsx`
- `components/chat/GenerateFlashcardsButton.tsx`
- `components/chat/FallbackNotice.tsx`
- `components/chat/Message.tsx`

### Message/Conversation Database

- `lib/db/operations/conversations.ts`
- `lib/db/operations/messages.ts`

### Chat API Routes

- `app/api/chat/conversations/route.ts`
- `app/api/chat/conversations/[conversationId]/messages/route.ts`

### Chat-Based Generation (refactor, not delete)

- `app/api/flashcards/generate/route.ts` - Refactor for goals
- `lib/claude/flashcard-generator.ts` - Adapt for goal context
- `lib/claude/rag.ts` - Remove
- `lib/claude/context.ts` - Remove

---

## NEW (Need to Build)

### Learning Goals System

**Database:**

- `learning_goals` table
- `goal_skill_trees` junction

**Files:**

- `lib/db/operations/goals.ts`
- `app/api/goals/route.ts`
- `app/api/goals/[goalId]/route.ts`
- `app/api/goals/[goalId]/progress/route.ts`

### Skill Tree System

**Database:**

- `skill_trees` table
- `skill_nodes` table

**Files:**

- `lib/db/operations/skill-trees.ts`
- `lib/db/operations/skill-nodes.ts`
- `app/api/goals/[goalId]/skill-tree/route.ts`
- `app/api/goals/[goalId]/skill-tree/generate/route.ts`

### Topic Analytics

**Database:**

- `topic_analytics` table

**Files:**

- `lib/db/operations/topic-analytics.ts`
- `app/api/analytics/topics/route.ts`

### New Pages

- `app/(protected)/goals/page.tsx` - Goals dashboard
- `app/(protected)/goals/new/page.tsx` - Create goal
- `app/(protected)/goals/[goalId]/page.tsx` - Goal detail with skill tree
- `app/(protected)/goals/[goalId]/study/page.tsx` - Goal-based study

### New Components

- `components/goals/GoalCard.tsx`
- `components/goals/GoalForm.tsx`
- `components/goals/GoalProgress.tsx`
- `components/skills/SkillTree.tsx`
- `components/skills/SkillNode.tsx`
- `components/skills/SkillTreeEditor.tsx`
- `components/dashboard/MasteryDashboard.tsx`
- `components/dashboard/ReviewForecast.tsx`
- `components/achievements/AchievementCard.tsx`
- `components/achievements/TitleBadge.tsx`

---

## Migration Strategy

**Phase 1**: Build new infrastructure in parallel

- Create new tables (goals, skill_trees, skill_nodes)
- Implement goal/skill APIs
- Keep chat system running

**Phase 2**: Redirect flows

- Update navigation to goals-first
- Refactor card generation for goals
- Update study sessions

**Phase 3**: Deprecate chat

- Migrate any chat-derived cards
- Remove chat components and routes
- Clean up database
