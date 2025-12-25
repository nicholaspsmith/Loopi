# Technical Research: Flashcard Deck Organization

**Feature Branch**: `012-flashcard-decks`
**Date**: 2025-12-24
**Context**: This research document supports the implementation plan at `specs/012-flashcard-decks/plan.md`

## Overview

This document provides technical decisions and research findings for implementing flashcard deck organization with AI-powered generation and live session updates. Each topic includes a clear decision, rationale, alternatives considered, and implementation notes specific to the memoryloop codebase.

---

## 1. Hybrid AI Deck Generation Architecture

### Decision

Use a two-stage pipeline: (1) LanceDB vector similarity search to retrieve top 30-50 candidate flashcards based on topic embedding, then (2) Claude API semantic re-ranking to filter and score candidates for final deck composition. Implement as a single API endpoint with streaming progress updates.

### Rationale

- **Efficiency**: Vector search is fast (milliseconds for 1000s of cards), LLM re-ranking is slower but only processes top candidates
- **Quality**: LLM provides semantic understanding that pure vector similarity misses (e.g., distinguishing "photosynthesis process" from "photosynthesis history")
- **Cost-effective**: Only sends 30-50 cards to Claude API instead of entire collection (typical cost: $0.001-0.003 per generation)
- **Existing infrastructure**: Codebase already has LanceDB vector search (`lib/db/operations/flashcards-lancedb.ts`) and Claude API integration (`lib/claude/client.ts`)
- **Scalability**: Works efficiently even with 500+ flashcards per user (vector search scales well, LLM processing is capped at 50 candidates)

### Alternatives Considered

1. **Pure vector search without LLM re-ranking**
   - Pros: Faster, simpler, no LLM cost
   - Cons: Lower quality (vector similarity can miss semantic nuances), no explanation of relevance
   - Rejected: FR-013 explicitly requires LLM + vector hybrid approach

2. **Pure LLM approach (send all flashcards to Claude)**
   - Pros: Best semantic understanding, can explain relevance
   - Cons: Expensive (context window costs scale linearly with cards), slow (10+ seconds for 500 cards), hits token limits
   - Rejected: Violates cost-effectiveness and performance goals (SC-006: <10s completion time)

3. **Multiple LLM passes (coarse filter → fine filter)**
   - Pros: Potentially higher quality
   - Cons: 2x LLM cost, slower, adds complexity
   - Rejected: Single LLM pass after vector search is sufficient for quality requirements (SC-003: 90% relevance)

4. **User-in-the-loop filtering (show all candidates, let user pick)**
   - Pros: Perfect precision, user control
   - Cons: Defeats purpose of AI automation, poor UX for large candidate sets
   - Rejected: FR-015 requires AI to suggest cards (user reviews final deck, not raw candidates)

### Implementation Notes

#### Two-Stage Pipeline Architecture

**Stage 1: Vector Similarity Search (LanceDB)**

```typescript
// lib/ai/deck-generation.ts

import { generateEmbedding } from '@/lib/embeddings/ollama'
import { getDbConnection } from '@/lib/db/client'

interface VectorSearchResult {
  flashcardId: string
  similarity: number // 0-1 score from LanceDB
}

/**
 * Stage 1: Vector search for candidate flashcards
 *
 * Generates embedding for topic, searches LanceDB for top K similar cards
 * Returns candidate flashcard IDs with similarity scores
 */
async function searchCandidateFlashcards(
  topic: string,
  userId: string,
  maxCandidates: number = 50
): Promise<VectorSearchResult[]> {
  // Generate embedding for topic (uses local Ollama, no API cost)
  const topicEmbedding = await generateEmbedding(topic)

  if (!topicEmbedding) {
    throw new Error('Failed to generate topic embedding')
  }

  // Query LanceDB for similar flashcards
  const db = await getDbConnection()
  const table = await db.openTable('flashcards')

  const results = await table
    .vectorSearch(topicEmbedding)
    .where(`userId = '${userId}'`)
    .limit(maxCandidates)
    .toArray()

  // LanceDB returns results with similarity scores
  return results.map((r: any) => ({
    flashcardId: r.id,
    similarity: r._distance, // Lower distance = higher similarity
  }))
}
```

**Stage 2: LLM Semantic Re-Ranking (Claude API)**

```typescript
import { getChatCompletion } from '@/lib/claude/client'
import { getFlashcardById } from '@/lib/db/operations/flashcards'

interface RankedFlashcard {
  flashcardId: string
  relevanceScore: number // 0-10 from Claude
  explanation: string
}

/**
 * Stage 2: LLM re-ranking and semantic filtering
 *
 * Sends candidate flashcards to Claude API for semantic analysis
 * Returns filtered and ranked flashcards with explanations
 */
async function rerankFlashcardsWithLLM(
  topic: string,
  candidateIds: string[],
  userApiKey?: string | null,
  minRelevanceScore: number = 6
): Promise<RankedFlashcard[]> {
  // Fetch full flashcard content from PostgreSQL
  const flashcards = await Promise.all(candidateIds.map((id) => getFlashcardById(id)))

  // Build prompt for Claude
  const flashcardContext = flashcards
    .map((card, idx) => {
      return `${idx + 1}. [ID: ${card!.id}]\n   Q: ${card!.question}\n   A: ${card!.answer.substring(0, 200)}...`
    })
    .join('\n\n')

  const systemPrompt = `You are a study deck curator. Analyze flashcards and rate their relevance to a given topic.
For each flashcard, provide:
1. Relevance score (0-10, where 10 = perfectly relevant, 0 = completely irrelevant)
2. Brief explanation (1 sentence)

Only include flashcards with score >= ${minRelevanceScore}.

Return JSON array: [{"id": "flashcard-id", "score": 8, "explanation": "..."}]`

  const userPrompt = `Topic: "${topic}"

Flashcards:
${flashcardContext}

Analyze and rank these flashcards by relevance to the topic.`

  // Call Claude API (or Ollama fallback)
  const response = await getChatCompletion({
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt,
    userApiKey,
  })

  // Parse JSON response
  const rankings = JSON.parse(response) as Array<{
    id: string
    score: number
    explanation: string
  }>

  // Filter by minimum score and return
  return rankings
    .filter((r) => r.score >= minRelevanceScore)
    .map((r) => ({
      flashcardId: r.id,
      relevanceScore: r.score,
      explanation: r.explanation,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by score descending
}
```

#### Combined Pipeline with Progress Streaming

```typescript
import { getUserApiKey } from '@/lib/db/operations/api-keys'

interface AIGenerationProgress {
  stage: 'vector_search' | 'llm_reranking' | 'complete'
  candidatesFound?: number
  rankedCount?: number
  results?: RankedFlashcard[]
}

/**
 * Full AI deck generation pipeline
 *
 * Combines vector search + LLM re-ranking with progress updates
 */
export async function generateDeckFromTopic(
  topic: string,
  userId: string,
  options: {
    maxCandidates?: number
    minRelevanceScore?: number
    onProgress?: (progress: AIGenerationProgress) => void
  } = {}
): Promise<RankedFlashcard[]> {
  const { maxCandidates = 50, minRelevanceScore = 6, onProgress } = options

  // Stage 1: Vector search
  onProgress?.({ stage: 'vector_search' })

  const candidates = await searchCandidateFlashcards(topic, userId, maxCandidates)

  if (candidates.length === 0) {
    throw new Error(
      'No matching flashcards found. Please create more flashcards related to this topic.'
    )
  }

  onProgress?.({ stage: 'vector_search', candidatesFound: candidates.length })

  // Stage 2: LLM re-ranking
  onProgress?.({ stage: 'llm_reranking' })

  const userApiKey = await getUserApiKey(userId)
  const candidateIds = candidates.map((c) => c.flashcardId)

  const rankedFlashcards = await rerankFlashcardsWithLLM(
    topic,
    candidateIds,
    userApiKey,
    minRelevanceScore
  )

  // Complete
  onProgress?.({
    stage: 'complete',
    rankedCount: rankedFlashcards.length,
    results: rankedFlashcards,
  })

  return rankedFlashcards
}
```

#### API Endpoint with SSE Progress Updates

```typescript
// app/api/decks-ai/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { generateDeckFromTopic } from '@/lib/ai/deck-generation'

const GenerateDeckSchema = z.object({
  topic: z.string().min(3).max(200),
  maxCandidates: z.number().int().min(10).max(100).optional().default(50),
  minRelevanceScore: z.number().int().min(0).max(10).optional().default(6),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = GenerateDeckSchema.parse(body)

    // Create SSE stream for progress updates
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const results = await generateDeckFromTopic(data.topic, session.user!.id, {
            maxCandidates: data.maxCandidates,
            minRelevanceScore: data.minRelevanceScore,
            onProgress: (progress) => {
              // Send progress via SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`)
              )
            },
          })

          // Send final results
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', results })}\n\n`)
          )

          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Generation failed',
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AIGeneration] Error:', error)
    return NextResponse.json({ error: 'Failed to generate deck' }, { status: 500 })
  }
}
```

#### Error Handling Strategy

**LanceDB Failures**:

```typescript
try {
  const candidates = await searchCandidateFlashcards(topic, userId)
} catch (error) {
  // Graceful degradation: Fall back to PostgreSQL full-text search
  console.error('[LanceDB] Vector search failed, falling back to SQL:', error)

  // Query flashcards with ILIKE on question/answer fields
  const fallbackCandidates = await db
    .select()
    .from(flashcards)
    .where(
      sql`${flashcards.userId} = ${userId} AND (
        ${flashcards.question} ILIKE ${`%${topic}%`} OR
        ${flashcards.answer} ILIKE ${`%${topic}%`}
      )`
    )
    .limit(50)

  return fallbackCandidates.map((f) => ({ flashcardId: f.id, similarity: 0.5 }))
}
```

**Claude API Failures**:

```typescript
try {
  const ranked = await rerankFlashcardsWithLLM(topic, candidateIds, userApiKey)
} catch (error) {
  // Graceful degradation: Return all candidates with equal scores
  console.error('[Claude] LLM re-ranking failed, using vector scores only:', error)

  return candidates.map((c) => ({
    flashcardId: c.flashcardId,
    relevanceScore: Math.round(c.similarity * 10), // Convert similarity to 0-10
    explanation: 'Ranked by vector similarity (LLM unavailable)',
  }))
}
```

#### Performance Optimization

- **Embedding cache**: Topic embeddings could be cached for repeat queries (not implemented initially per YAGNI)
- **Batch fetching**: Use Drizzle's `inArray()` to fetch all candidate flashcards in one query
- **Parallel execution**: Vector search and API key retrieval can run concurrently
- **Timeout handling**: Wrap entire pipeline in 10-second timeout (SC-006 requirement)

```typescript
import { withTimeout } from '@/lib/db/utils/timeout'

const GENERATION_TIMEOUT_MS = 10000 // 10 seconds

export async function generateDeckFromTopic(...) {
  return withTimeout(
    async () => {
      // ... pipeline implementation ...
    },
    GENERATION_TIMEOUT_MS,
    'ai_deck_generation'
  )
}
```

---

## 2. Deck-Filtered FSRS Scheduling

### Decision

Extend existing FSRS scheduler to accept optional `deckId` filter that pre-filters flashcards by deck membership before applying FSRS due date logic. Implement deck-specific overrides (`new_cards_per_day`, `cards_per_session`) that take precedence over global settings when set. Global FSRS state (stored in flashcards table) updates normally during deck sessions.

### Rationale

- **Maintains FSRS integrity**: Global FSRS state remains authoritative (studying a card in a deck updates its global review schedule)
- **Simple implementation**: Filtering by deck membership is a straightforward SQL JOIN before existing FSRS logic
- **Performance**: PostgreSQL join on indexed `deck_cards` table is fast (milliseconds for 1000 cards)
- **Flexible settings**: Users can have stricter/looser limits per deck without affecting global study habits
- **Existing patterns**: Codebase already uses FSRS via `ts-fsrs` library (`lib/db/operations/flashcards.ts`), just adds filtering layer

### Alternatives Considered

1. **Separate FSRS state per deck (deck-specific scheduling)**
   - Pros: Each deck has independent review schedule
   - Cons: Massively complex (duplicate FSRS state for every deck-card pair), violates FR-011 (global state must update)
   - Rejected: Spec explicitly requires global FSRS state (FR-011)

2. **Virtual deck filtering (filter after FSRS scheduling)**
   - Pros: Simpler, no changes to FSRS logic
   - Cons: Can't apply deck-specific settings correctly, inefficient (fetches all due cards then filters)
   - Rejected: Violates FR-028 (deck-specific overrides)

3. **Deck-specific FSRS parameters (difficulty/stability adjustments per deck)**
   - Pros: More granular control
   - Cons: Overly complex, no user demand, violates YAGNI
   - Rejected: Spec only requires per-deck limits (new cards, session size), not algorithm parameters

### Implementation Notes

#### Database Schema for Deck Overrides

```typescript
// lib/db/drizzle-schema.ts

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastStudiedAt: timestamp('last_studied_at'),
  archived: boolean('archived').notNull().default(false),

  // Deck-specific FSRS overrides (NULL = use global settings)
  newCardsPerDayOverride: integer('new_cards_per_day_override'), // FR-028
  cardsPerSessionOverride: integer('cards_per_session_override'), // FR-028
})

export const deckCards = pgTable('deck_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => decks.id, { onDelete: 'cascade' }),
  flashcardId: uuid('flashcard_id')
    .notNull()
    .references(() => flashcards.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').notNull().defaultNow(),
})
```

#### Deck-Filtered FSRS Scheduler

```typescript
// lib/fsrs/deck-scheduler.ts

import { getDueFlashcards } from '@/lib/db/operations/flashcards'
import { getDb } from '@/lib/db/pg-client'
import { decks, deckCards, flashcards } from '@/lib/db/drizzle-schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Flashcard } from '@/lib/db/operations/flashcards'

interface DeckSessionSettings {
  newCardsPerDay?: number
  cardsPerSession?: number
}

interface DeckSchedulerOptions {
  deckId?: string // Optional deck filter
  settings?: DeckSessionSettings // Global settings
}

/**
 * Get due flashcards with optional deck filtering
 *
 * Applies FSRS scheduling within deck context:
 * 1. Filter flashcards by deck membership (if deckId provided)
 * 2. Apply deck-specific overrides if configured
 * 3. Return FSRS-scheduled cards for session
 */
export async function getDueFlashcardsForSession(
  userId: string,
  options: DeckSchedulerOptions = {}
): Promise<{
  dueCards: Flashcard[]
  settings: DeckSessionSettings
}> {
  const { deckId, settings: globalSettings } = options

  let dueCards: Flashcard[]
  let effectiveSettings: DeckSessionSettings = {
    newCardsPerDay: globalSettings?.newCardsPerDay ?? 20,
    cardsPerSession: globalSettings?.cardsPerSession ?? 50,
  }

  if (deckId) {
    // Deck-filtered session (FR-008, FR-009, FR-010)
    const db = getDb()

    // Fetch deck to get overrides (FR-028, FR-029)
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .limit(1)

    if (!deck) {
      throw new Error(`Deck ${deckId} not found or access denied`)
    }

    // Apply deck-specific overrides (FR-029: deck settings override global)
    if (deck.newCardsPerDayOverride !== null) {
      effectiveSettings.newCardsPerDay = deck.newCardsPerDayOverride
    }
    if (deck.cardsPerSessionOverride !== null) {
      effectiveSettings.cardsPerSession = deck.cardsPerSessionOverride
    }

    // Fetch flashcards that belong to this deck
    const deckFlashcards = await db
      .select({ flashcard: flashcards })
      .from(deckCards)
      .innerJoin(flashcards, eq(deckCards.flashcardId, flashcards.id))
      .where(eq(deckCards.deckId, deckId))

    const flashcardIds = deckFlashcards.map((df) => df.flashcard.id)

    // Get ALL due cards for user (existing function handles FSRS filtering)
    const allDueCards = await getDueFlashcards(userId)

    // Filter to only cards in this deck (FR-010)
    dueCards = allDueCards.filter((card) => flashcardIds.includes(card.id))
  } else {
    // Global session (no deck filter)
    dueCards = await getDueFlashcards(userId)
  }

  // Apply new cards per day limit
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Count new cards already seen today (State.New = 0 in FSRS)
  const newCardsToday = dueCards.filter((card) => {
    const isNew = card.fsrsState.state === 0 // State.New
    const reviewedToday =
      card.fsrsState.last_review && new Date(card.fsrsState.last_review) >= todayStart
    return isNew && reviewedToday
  }).length

  const remainingNewCards = Math.max(0, effectiveSettings.newCardsPerDay! - newCardsToday)

  // Separate new cards and review cards
  const newCards = dueCards.filter((c) => c.fsrsState.state === 0)
  const reviewCards = dueCards.filter((c) => c.fsrsState.state !== 0)

  // Apply limits: new cards up to daily limit, review cards fill remaining session
  const sessionNewCards = newCards.slice(0, remainingNewCards)
  const sessionReviewCards = reviewCards.slice(
    0,
    effectiveSettings.cardsPerSession! - sessionNewCards.length
  )

  const finalCards = [...sessionNewCards, ...sessionReviewCards]

  // Sort by FSRS priority (most overdue first)
  finalCards.sort((a, b) => {
    const dueA = new Date(a.fsrsState.due).getTime()
    const dueB = new Date(b.fsrsState.due).getTime()
    return dueA - dueB
  })

  return {
    dueCards: finalCards,
    settings: effectiveSettings,
  }
}
```

#### API Endpoint for Deck Sessions

```typescript
// app/api/study/deck-session/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getDueFlashcardsForSession } from '@/lib/fsrs/deck-scheduler'

const StartDeckSessionSchema = z.object({
  deckId: z.string().uuid(),
  settings: z
    .object({
      newCardsPerDay: z.number().int().min(0).max(100).optional(),
      cardsPerSession: z.number().int().min(1).max(200).optional(),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = StartDeckSessionSchema.parse(body)

    // Get due cards for deck with FSRS scheduling
    const { dueCards, settings } = await getDueFlashcardsForSession(session.user.id, {
      deckId: data.deckId,
      settings: data.settings,
    })

    if (dueCards.length === 0) {
      // Calculate next due date from deck flashcards
      const allDeckCards = await getDueFlashcardsForDeck(session.user.id, { deckId })
      const nextDue =
        allDeckCards.length > 0
          ? allDeckCards.sort((a, b) => a.fsrsState.due.getTime() - b.fsrsState.due.getTime())[0]
          : null

      return NextResponse.json({
        success: true,
        message: 'No cards due in this deck',
        dueCards: [],
        nextDueCard: nextDue
          ? {
              dueDate: nextDue.fsrsState.due.toISOString(),
              count: 1,
            }
          : null,
      })
    }

    return NextResponse.json({
      success: true,
      dueCards,
      count: dueCards.length,
      settings,
    })
  } catch (error) {
    console.error('[DeckSession] Error:', error)
    return NextResponse.json({ error: 'Failed to start deck session' }, { status: 500 })
  }
}
```

#### Global FSRS State Updates (FR-011)

**Critical**: When users rate cards during deck sessions, the global FSRS state MUST update normally.

```typescript
// app/api/quiz/rate/route.ts (existing endpoint, no changes needed)

import { updateFlashcardFSRSState } from '@/lib/db/operations/flashcards'
import { fsrs, Rating, type Card } from 'ts-fsrs'

// This endpoint already updates global FSRS state
// Deck sessions use the same endpoint, so FR-011 is automatically satisfied

export async function POST(request: NextRequest) {
  // ... authentication, validation ...

  const flashcard = await getFlashcardById(flashcardId)
  const f = fsrs()

  // Calculate next FSRS state based on rating
  const schedulingCards = f.repeat(flashcard.fsrsState, now)
  const nextCard = schedulingCards[rating].card

  // Update flashcard's FSRS state (global, not deck-specific)
  await updateFlashcardFSRSState(flashcardId, nextCard)

  // ... create review log ...
}
```

**Key Point**: Deck filtering only affects which cards enter the session queue. Once a card is rated, it updates the same global `flashcards.fsrs_state` field regardless of whether it came from a deck session or global session. This ensures FR-011 compliance.

#### Handling "New Cards Per Day" with Deck Overrides

**Scenario**: User has global limit of 20 new cards/day, but sets Deck A to 30 new cards/day and Deck B to 10 new cards/day.

**Behavior** (FR-027, FR-029):

- **Deck A session**: Can see up to 30 new cards from Deck A (deck override takes precedence)
- **Deck B session**: Can see up to 10 new cards from Deck B (deck override takes precedence)
- **Global session**: Can see up to 20 new cards across all flashcards (global limit)
- **Independence**: Studying 10 new cards in Deck A does NOT affect Deck B's limit (each deck tracks independently)

**Implementation**:

```typescript
// Count new cards reviewed TODAY in THIS DECK (not globally)
const newCardsReviewedTodayInDeck = await db
  .select({ count: sql`COUNT(*)` })
  .from(reviewLogs)
  .innerJoin(deckCards, eq(reviewLogs.flashcardId, deckCards.flashcardId))
  .where(
    and(
      eq(deckCards.deckId, deckId),
      eq(reviewLogs.userId, userId),
      eq(reviewLogs.state, 0), // State.New
      gte(reviewLogs.createdAt, todayStart)
    )
  )

const remaining = effectiveSettings.newCardsPerDay! - newCardsReviewedTodayInDeck
```

**Alternative Interpretation** (if global limit should apply across all decks):

- Track new cards globally per day
- Deck overrides only affect cards_per_session
- Rejected: Spec says deck-specific overrides (FR-028) implies independent tracking

---

## 3. Live Session Updates

### Decision

Use **polling** (not Server-Sent Events) for live deck updates during active study sessions. Client polls `GET /api/study/deck-session/{sessionId}/changes` every 5 seconds to detect added/removed cards. Added cards that meet FSRS due criteria are appended to the session queue. Removed cards are marked as skipped if not yet reviewed.

### Rationale

- **Simplicity**: Polling is easier to implement and debug than SSE connection management
- **Next.js compatibility**: Works reliably in all deployment environments (Vercel, self-hosted, Docker)
- **Battery efficiency**: 5-second polling interval is acceptable for desktop/laptop study sessions
- **No connection state**: No need to manage long-lived SSE connections, reconnection logic, or heartbeats
- **Matches use case**: Study sessions typically last 10-30 minutes with infrequent concurrent edits (rare edge case)
- **Performance**: Polling overhead is negligible (lightweight JSON response, cached database queries)

### Alternatives Considered

1. **Server-Sent Events (SSE)**
   - Pros: Real-time updates (sub-second latency), efficient for high-frequency changes
   - Cons: Complex connection management, reconnection logic, doesn't work behind some proxies, overkill for infrequent updates
   - Rejected: Complexity not justified for rare edge case (SC-011 only requires 5-second latency)

2. **WebSockets**
   - Pros: True bidirectional real-time communication
   - Cons: Massive overkill (don't need server → client push beyond deck changes), adds infrastructure complexity, harder to deploy
   - Rejected: WebSockets are for chat/gaming, not study session sync

3. **No live updates (reload page to see changes)**
   - Pros: Simplest implementation
   - Cons: Violates FR-030, FR-031 (explicit requirement for live updates)
   - Rejected: Spec requires live updates

4. **Database triggers + pub/sub (PostgreSQL NOTIFY/LISTEN)**
   - Pros: Event-driven architecture, no polling overhead
   - Cons: Requires persistent database connections, complex setup, doesn't scale across multiple Next.js instances
   - Rejected: Over-engineering for single-user study sessions

### Implementation Notes

#### Session State Tracking

```typescript
// lib/study/session-manager.ts

import { getDb } from '@/lib/db/pg-client'
import { studySessions, sessionCards } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'

export interface StudySession {
  id: string
  userId: string
  deckId: string | null // NULL for global sessions
  startedAt: Date
  lastActivityAt: Date
  completedCardIds: string[] // Cards already reviewed in this session
  skippedCardIds: string[] // Cards skipped (removed mid-session)
}

/**
 * Create a new study session
 */
export async function createStudySession(
  userId: string,
  deckId: string | null,
  cardIds: string[]
): Promise<StudySession> {
  const db = getDb()

  const [session] = await db
    .insert(studySessions)
    .values({
      id: uuidv4(),
      userId,
      deckId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .returning()

  // Insert session cards
  await db.insert(sessionCards).values(
    cardIds.map((cardId) => ({
      sessionId: session.id,
      flashcardId: cardId,
      status: 'pending' as const, // 'pending' | 'reviewed' | 'skipped'
    }))
  )

  return {
    id: session.id,
    userId: session.userId,
    deckId: session.deckId,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    completedCardIds: [],
    skippedCardIds: [],
  }
}
```

#### Polling Endpoint for Deck Changes

```typescript
// app/api/study/deck-session/[sessionId]/changes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDb } from '@/lib/db/pg-client'
import { studySessions, sessionCards, deckCards } from '@/lib/db/drizzle-schema'
import { eq, and, notInArray } from 'drizzle-orm'
import { getDueFlashcardsForSession } from '@/lib/fsrs/deck-scheduler'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const db = getDb()

    // Fetch session details
    const [studySession] = await db
      .select()
      .from(studySessions)
      .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, session.user.id)))
      .limit(1)

    if (!studySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Only check for changes if this is a deck session
    if (!studySession.deckId) {
      return NextResponse.json({
        hasChanges: false,
        addedCards: [],
        removedCards: [],
      })
    }

    // Get current cards in session
    const currentSessionCards = await db
      .select()
      .from(sessionCards)
      .where(eq(sessionCards.sessionId, sessionId))

    const sessionCardIds = currentSessionCards.map((sc) => sc.flashcardId)
    const reviewedCardIds = currentSessionCards
      .filter((sc) => sc.status === 'reviewed')
      .map((sc) => sc.flashcardId)

    // Get current cards in deck (may have changed since session started)
    const currentDeckCards = await db
      .select()
      .from(deckCards)
      .where(eq(deckCards.deckId, studySession.deckId))

    const deckCardIds = currentDeckCards.map((dc) => dc.flashcardId)

    // Detect changes
    const addedCardIds = deckCardIds.filter((id) => !sessionCardIds.includes(id))
    const removedCardIds = sessionCardIds.filter((id) => !deckCardIds.includes(id))

    // For added cards: only include if they're FSRS-due and not already reviewed
    let dueAddedCards: Flashcard[] = []

    if (addedCardIds.length > 0) {
      const { dueCards } = await getDueFlashcardsForSession(session.user.id, {
        deckId: studySession.deckId,
      })

      dueAddedCards = dueCards.filter((card) => addedCardIds.includes(card.id))
    }

    // For removed cards: mark as skipped if not yet reviewed (FR-031)
    const skippedCardIds = removedCardIds.filter((id) => !reviewedCardIds.includes(id))

    if (skippedCardIds.length > 0) {
      await db
        .update(sessionCards)
        .set({ status: 'skipped' })
        .where(
          and(
            eq(sessionCards.sessionId, sessionId),
            notInArray(sessionCards.flashcardId, skippedCardIds)
          )
        )
    }

    // Add new cards to session
    if (dueAddedCards.length > 0) {
      await db.insert(sessionCards).values(
        dueAddedCards.map((card) => ({
          sessionId,
          flashcardId: card.id,
          status: 'pending' as const,
        }))
      )
    }

    return NextResponse.json({
      hasChanges: dueAddedCards.length > 0 || skippedCardIds.length > 0,
      addedCards: dueAddedCards,
      skippedCardIds,
    })
  } catch (error) {
    console.error('[SessionChanges] Error:', error)
    return NextResponse.json({ error: 'Failed to check for changes' }, { status: 500 })
  }
}
```

#### Client-Side Polling Implementation

```typescript
// components/study/DeckSessionSync.tsx

'use client'

import { useEffect, useState } from 'react'
import type { Flashcard } from '@/lib/db/operations/flashcards'

interface DeckSessionSyncProps {
  sessionId: string
  onCardsAdded: (cards: Flashcard[]) => void
  onCardsSkipped: (cardIds: string[]) => void
}

export function DeckSessionSync({
  sessionId,
  onCardsAdded,
  onCardsSkipped,
}: DeckSessionSyncProps) {
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  useEffect(() => {
    // Poll every 5 seconds (SC-011: updates within 5 seconds)
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/study/deck-session/${sessionId}/changes`
        )

        if (!response.ok) {
          console.error('[SessionSync] Poll failed:', response.statusText)
          return
        }

        const data = await response.json()

        if (data.hasChanges) {
          if (data.addedCards.length > 0) {
            onCardsAdded(data.addedCards)
          }

          if (data.skippedCardIds.length > 0) {
            onCardsSkipped(data.skippedCardIds)
          }

          setLastCheck(new Date())
        }
      } catch (error) {
        console.error('[SessionSync] Poll error:', error)
      }
    }, 5000) // 5 seconds

    return () => clearInterval(interval)
  }, [sessionId, onCardsAdded, onCardsSkipped])

  return (
    <div className="text-xs text-gray-500">
      Last synced: {lastCheck.toLocaleTimeString()}
    </div>
  )
}
```

#### Usage in Study Session Page

```typescript
// app/study/[sessionId]/page.tsx

'use client'

import { useState } from 'react'
import { DeckSessionSync } from '@/components/study/DeckSessionSync'
import type { Flashcard } from '@/lib/db/operations/flashcards'

export default function StudySessionPage({ params }: { params: { sessionId: string } }) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleCardsAdded = (newCards: Flashcard[]) => {
    // Append to end of queue (FR-030)
    setCards(prev => [...prev, ...newCards])

    // Show notification
    toast.success(`${newCards.length} new card(s) added to session`)
  }

  const handleCardsSkipped = (skippedIds: string[]) => {
    // Remove from queue (FR-031)
    setCards(prev => prev.filter(card => !skippedIds.includes(card.id)))

    // Show notification
    toast.info(`${skippedIds.length} card(s) removed from session`)
  }

  return (
    <div>
      <DeckSessionSync
        sessionId={params.sessionId}
        onCardsAdded={handleCardsAdded}
        onCardsSkipped={handleCardsSkipped}
      />

      {/* Quiz interface */}
      <QuizCard card={cards[currentIndex]} />
    </div>
  )
}
```

#### Race Condition Handling

**Scenario**: User adds Card X to deck in Tab A while reviewing Card X in Tab B's session.

**Solution**: Session card status prevents double-review:

```typescript
// When rating a card, check if it's still in session
const sessionCard = await db
  .select()
  .from(sessionCards)
  .where(
    and(
      eq(sessionCards.sessionId, sessionId),
      eq(sessionCards.flashcardId, flashcardId),
      eq(sessionCards.status, 'pending')
    )
  )
  .limit(1)

if (!sessionCard[0]) {
  return NextResponse.json(
    {
      error: 'Card no longer available in session',
    },
    { status: 409 }
  )
}

// Proceed with rating...
```

**Scenario**: User removes Card Y from deck while it's the current card in session.

**Solution**: Allow completion of current card (FR-031):

```typescript
// Next poll detects removal, marks as skipped
// But if user already started rating it, rating succeeds
// (sessionCards.status === 'pending' allows rating)
// Subsequent cards are skipped
```

---

## 4. Hard Limit Enforcement

### Decision

Enforce limits at **both database and application layers**:

- **Database constraints**: `CHECK` constraint on decks table for 100-deck limit (validates on INSERT)
- **Application validation**: Check card count before adding to deck (prevents exceeding 1000-card limit)
- **Batch operations**: Pre-validate batch size, reject entire batch if any operation would exceed limits
- **AI generation**: Truncate results to fit within 1000-card limit, show warning if suggestions exceed limit

### Rationale

- **Defense in depth**: Database constraints prevent limit violations even if application logic has bugs
- **Performance**: Application-layer validation avoids expensive database rollbacks
- **User feedback**: Application can provide helpful error messages ("X/1000 cards, cannot add Y more")
- **Batch safety**: All-or-nothing validation prevents partial batch application
- **AI UX**: Truncating AI results (instead of failing) provides better experience ("Generated 75 cards, capped at deck limit")

### Alternatives Considered

1. **Database constraints only**
   - Pros: Foolproof enforcement
   - Cons: Poor error messages, doesn't handle batch operations gracefully
   - Rejected: Need application-layer validation for UX

2. **Application validation only**
   - Pros: Better error messages, flexible
   - Cons: Can be bypassed by bugs or direct database access
   - Rejected: Not safe enough, database constraints are free insurance

3. **Soft limits with warnings (no enforcement)**
   - Pros: More flexible, degrades gracefully
   - Cons: Violates spec (FR-032, FR-033 require hard limits)
   - Rejected: Spec explicitly requires enforcement

4. **Separate limits for manual vs AI operations**
   - Pros: AI could suggest more cards than manual limit
   - Cons: Confusing UX, not in spec
   - Rejected: Single limit is simpler

### Implementation Notes

#### Database Constraints

```sql
-- drizzle/0006_add_decks.sql

-- Decks table with 100-deck limit per user
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_studied_at TIMESTAMP,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  new_cards_per_day_override INTEGER,
  cards_per_session_override INTEGER,

  -- Enforce 100-deck limit per user (FR-033)
  CONSTRAINT max_decks_per_user CHECK (
    (SELECT COUNT(*) FROM decks WHERE user_id = decks.user_id AND archived = FALSE) <= 100
  )
);

-- Deck cards join table
CREATE TABLE deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Prevent duplicate cards in same deck
  UNIQUE(deck_id, flashcard_id)
);

-- Indexes for performance
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX idx_deck_cards_flashcard_id ON deck_cards(flashcard_id);
```

**Note on CHECK constraint**: PostgreSQL `CHECK` constraints are validated on INSERT/UPDATE. The subquery counts all decks for the user and rejects INSERT if it would exceed 100. This works for single-row INSERTs but may have performance implications for batch operations (triggers full table scan). For production, consider using a database trigger instead:

```sql
CREATE OR REPLACE FUNCTION check_deck_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM decks WHERE user_id = NEW.user_id AND archived = FALSE) > 100 THEN
    RAISE EXCEPTION 'Maximum deck limit exceeded (100 decks per user)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_deck_limit
AFTER INSERT ON decks
FOR EACH ROW
EXECUTE FUNCTION check_deck_limit();
```

#### Application-Layer Validation

```typescript
// lib/validation/deck-limits.ts

import { getDb } from '@/lib/db/pg-client'
import { decks, deckCards } from '@/lib/db/drizzle-schema'
import { eq, and, sql } from 'drizzle-orm'

const MAX_DECKS_PER_USER = 100 // FR-033
const MAX_CARDS_PER_DECK = 1000 // FR-032

export class DeckLimitError extends Error {
  constructor(
    message: string,
    public readonly code: 'MAX_DECKS' | 'MAX_CARDS',
    public readonly current: number,
    public readonly limit: number
  ) {
    super(message)
    this.name = 'DeckLimitError'
  }
}

/**
 * Validate user hasn't exceeded deck limit (FR-033, FR-034)
 */
export async function validateDeckLimit(userId: string): Promise<void> {
  const db = getDb()

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.archived, false)))

  const deckCount = Number(result.count)

  if (deckCount >= MAX_DECKS_PER_USER) {
    throw new DeckLimitError(
      `Maximum deck limit reached (${MAX_DECKS_PER_USER} decks). Please delete unused decks before creating new ones.`,
      'MAX_DECKS',
      deckCount,
      MAX_DECKS_PER_USER
    )
  }
}

/**
 * Validate deck hasn't exceeded card limit (FR-032, FR-034)
 *
 * @param cardIdsToAdd - IDs of cards being added (for batch validation)
 */
export async function validateDeckCardLimit(deckId: string, cardIdsToAdd: string[]): Promise<void> {
  const db = getDb()

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  const currentCount = Number(result.count)
  const newTotal = currentCount + cardIdsToAdd.length

  if (newTotal > MAX_CARDS_PER_DECK) {
    throw new DeckLimitError(
      `Deck limit reached (${currentCount}/${MAX_CARDS_PER_DECK} cards). Cannot add ${cardIdsToAdd.length} more card(s). Please remove cards or create a new deck.`,
      'MAX_CARDS',
      currentCount,
      MAX_CARDS_PER_DECK
    )
  }
}

/**
 * Get current usage stats for UI display (FR-035)
 */
export async function getDeckUsageStats(
  userId: string,
  deckId?: string
): Promise<{
  deckCount: number
  maxDecks: number
  cardCount?: number // Only if deckId provided
  maxCards?: number
}> {
  const db = getDb()

  const [deckResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.archived, false)))

  let cardCount: number | undefined

  if (deckId) {
    const [cardResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(deckCards)
      .where(eq(deckCards.deckId, deckId))

    cardCount = Number(cardResult.count)
  }

  return {
    deckCount: Number(deckResult.count),
    maxDecks: MAX_DECKS_PER_USER,
    cardCount,
    maxCards: deckId ? MAX_CARDS_PER_DECK : undefined,
  }
}
```

#### API Endpoint with Limit Validation

```typescript
// app/api/decks/route.ts (POST - Create deck)

import { validateDeckLimit, DeckLimitError } from '@/lib/validation/deck-limits'
import { createDeck } from '@/lib/db/operations/decks'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = CreateDeckSchema.parse(body)

    // Validate 100-deck limit (FR-033)
    await validateDeckLimit(session.user.id)

    const deck = await createDeck({
      userId: session.user.id,
      name: data.name,
    })

    return NextResponse.json({ success: true, deck }, { status: 201 })
  } catch (error) {
    if (error instanceof DeckLimitError) {
      // User-friendly limit error (FR-034)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          current: error.current,
          limit: error.limit,
        },
        { status: 409 }
      )
    }

    // ... other error handling ...
  }
}
```

```typescript
// app/api/decks/[deckId]/cards/route.ts (POST - Add cards)

import { validateDeckCardLimit, DeckLimitError } from '@/lib/validation/deck-limits'
import { addCardsToDeck } from '@/lib/db/operations/deck-cards'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params
    const body = await request.json()
    const data = AddCardsSchema.parse(body)

    // Validate 1000-card limit BEFORE adding (FR-032)
    await validateDeckCardLimit(deckId, data.flashcardIds)

    // Batch add cards
    await addCardsToDeck(deckId, data.flashcardIds)

    return NextResponse.json({
      success: true,
      addedCount: data.flashcardIds.length,
    })
  } catch (error) {
    if (error instanceof DeckLimitError) {
      // User-friendly limit error (FR-034)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          current: error.current,
          limit: error.limit,
        },
        { status: 409 }
      )
    }

    // ... other error handling ...
  }
}
```

#### Batch Operation Handling

**All-or-nothing validation**: Reject entire batch if any card would exceed limit.

```typescript
// Batch validation prevents partial failures
const cardsToAdd = [id1, id2, id3, ..., id50]

try {
  await validateDeckCardLimit(deckId, cardsToAdd)
  // Only proceed if ALL cards can be added
  await addCardsToDeck(deckId, cardsToAdd)
} catch (error) {
  if (error instanceof DeckLimitError) {
    // Show: "Cannot add 50 cards (current: 980/1000)"
    // User can retry with smaller batch
  }
}
```

#### AI Generation Limit Handling

**Truncate results to fit limit, warn user**:

```typescript
// lib/ai/deck-generation.ts

export async function generateDeckFromTopic(...): Promise<{
  flashcards: RankedFlashcard[]
  truncated: boolean
  originalCount: number
}> {
  // ... vector search + LLM re-ranking ...

  const rankedFlashcards = await rerankFlashcardsWithLLM(...)

  // Check if results exceed deck limit
  const maxCards = MAX_CARDS_PER_DECK // 1000
  const truncated = rankedFlashcards.length > maxCards

  return {
    flashcards: rankedFlashcards.slice(0, maxCards),
    truncated,
    originalCount: rankedFlashcards.length,
  }
}
```

**UI handling**:

```typescript
// components/decks/AIGenerationDialog.tsx

if (results.truncated) {
  toast.warning(
    `AI generated ${results.originalCount} suggestions, but only showing top ${results.flashcards.length} (deck limit)`
  )
}
```

#### UI Components for Limit Display

```typescript
// components/decks/DeckUsageIndicator.tsx

'use client'

import { useEffect, useState } from 'react'

export function DeckUsageIndicator({ userId, deckId }: {
  userId: string
  deckId?: string
}) {
  const [stats, setStats] = useState<UsageStats | null>(null)

  useEffect(() => {
    fetch(`/api/decks/usage?deckId=${deckId || ''}`)
      .then(res => res.json())
      .then(setStats)
  }, [deckId])

  if (!stats) return null

  const deckPercentage = (stats.deckCount / stats.maxDecks) * 100
  const isNearDeckLimit = deckPercentage >= 90

  return (
    <div className="space-y-2 text-sm">
      <div>
        <div className="flex justify-between mb-1">
          <span>Decks</span>
          <span className={isNearDeckLimit ? 'text-red-600' : ''}>
            {stats.deckCount} / {stats.maxDecks}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${isNearDeckLimit ? 'bg-red-600' : 'bg-blue-600'}`}
            style={{ width: `${deckPercentage}%` }}
          />
        </div>
      </div>

      {stats.cardCount !== undefined && (
        <div>
          <div className="flex justify-between mb-1">
            <span>Cards in deck</span>
            <span className={stats.cardCount >= 900 ? 'text-red-600' : ''}>
              {stats.cardCount} / {stats.maxCards}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${stats.cardCount >= 900 ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${(stats.cardCount / stats.maxCards!) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 5. PostgreSQL Many-to-Many Performance

### Decision

Use standard many-to-many pattern with `deck_cards` join table, indexed on both `deck_id` and `flashcard_id`. For deck card counts, use denormalized counter cache in `decks` table (updated via triggers) to avoid slow `COUNT(*)` queries. Queries for 1000 cards per deck perform in <50ms with proper indexes.

### Rationale

- **Standard pattern**: Many-to-many via join table is well-understood and supported by Drizzle ORM
- **Index performance**: PostgreSQL B-tree indexes make JOIN queries fast (O(log n) lookup)
- **Counter cache**: Denormalized `card_count` column avoids expensive aggregation queries
- **Proven scalability**: 100 decks × 1000 cards = 100k rows in join table is trivial for PostgreSQL
- **Drizzle support**: ORM handles JOINs naturally, no need for raw SQL

### Alternatives Considered

1. **Array column (PostgreSQL array of flashcard IDs in decks table)**
   - Pros: Single-table query, simpler schema
   - Cons: Poor for membership queries ("which decks contain card X?"), no foreign key constraints, hard to maintain
   - Rejected: Violates normalization, hard to enforce limit of 1000 cards

2. **JSONB column (store card metadata in deck)**
   - Pros: Flexible, can store additional per-card data
   - Cons: Same problems as array, plus even worse query performance
   - Rejected: Anti-pattern for relational data

3. **Materialized view for card counts**
   - Pros: Fast reads, database-maintained
   - Cons: Refresh overhead, complexity
   - Rejected: Trigger-maintained counter is simpler

4. **No denormalization (always COUNT(\*) on read)**
   - Pros: Simpler, always accurate
   - Cons: Slow for deck list queries (N+1 COUNT queries)
   - Rejected: Poor UX for deck list page

### Implementation Notes

#### Optimized Schema with Counter Cache

```typescript
// lib/db/drizzle-schema.ts

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),

  // Counter cache for performance (updated via trigger)
  cardCount: integer('card_count').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastStudiedAt: timestamp('last_studied_at'),
  archived: boolean('archived').notNull().default(false),
  newCardsPerDayOverride: integer('new_cards_per_day_override'),
  cardsPerSessionOverride: integer('cards_per_session_override'),
})

export const deckCards = pgTable(
  'deck_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    flashcardId: uuid('flashcard_id')
      .notNull()
      .references(() => flashcards.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint prevents duplicate cards in same deck
    uniqueDeckCard: uniqueIndex('idx_deck_card_unique').on(table.deckId, table.flashcardId),

    // Indexes for fast JOINs
    deckIdIndex: index('idx_deck_cards_deck_id').on(table.deckId),
    flashcardIdIndex: index('idx_deck_cards_flashcard_id').on(table.flashcardId),
  })
)
```

#### Database Trigger for Counter Cache

```sql
-- drizzle/0006_add_decks.sql

-- Function to update deck card count
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count on insert
    UPDATE decks SET card_count = card_count + 1 WHERE id = NEW.deck_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count on delete
    UPDATE decks SET card_count = card_count - 1 WHERE id = OLD.deck_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on deck_cards table
CREATE TRIGGER maintain_deck_card_count
AFTER INSERT OR DELETE ON deck_cards
FOR EACH ROW
EXECUTE FUNCTION update_deck_card_count();
```

#### Efficient Query Patterns

**List all decks with card counts (fast)**:

```typescript
// lib/db/operations/decks.ts

export async function getDecksByUserId(userId: string): Promise<Deck[]> {
  const db = getDb()

  // card_count is denormalized, no JOIN needed
  const decks = await db
    .select()
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.archived, false)))
    .orderBy(decks.lastStudiedAt)

  return decks // Each deck has .cardCount populated
}
```

**Get all cards in a deck (indexed JOIN)**:

```typescript
export async function getDeckCards(deckId: string): Promise<Flashcard[]> {
  const db = getDb()

  // Indexed JOIN on deck_cards.deck_id and flashcards.id
  const results = await db
    .select({ flashcard: flashcards })
    .from(deckCards)
    .innerJoin(flashcards, eq(deckCards.flashcardId, flashcards.id))
    .where(eq(deckCards.deckId, deckId))
    .orderBy(deckCards.addedAt)

  return results.map((r) => r.flashcard)
}
```

**Find which decks contain a specific flashcard**:

```typescript
export async function getDecksContainingCard(flashcardId: string, userId: string): Promise<Deck[]> {
  const db = getDb()

  // Indexed JOIN on deck_cards.flashcard_id
  const results = await db
    .select({ deck: decks })
    .from(deckCards)
    .innerJoin(decks, eq(deckCards.deckId, decks.id))
    .where(and(eq(deckCards.flashcardId, flashcardId), eq(decks.userId, userId)))

  return results.map((r) => r.deck)
}
```

#### Performance Benchmarks

**Expected query performance** (PostgreSQL on commodity hardware):

- **List 100 decks with card counts**: ~10ms (single table scan with index on user_id)
- **Get 1000 cards from deck**: ~50ms (indexed JOIN on deck_id)
- **Add 50 cards to deck (batch)**: ~100ms (50 INSERTs + 50 trigger updates)
- **Find decks containing card**: ~5ms (indexed lookup on flashcard_id)

**Index usage verification**:

```sql
-- Verify index is used for deck card list
EXPLAIN ANALYZE
SELECT flashcards.*
FROM deck_cards
INNER JOIN flashcards ON deck_cards.flashcard_id = flashcards.id
WHERE deck_cards.deck_id = '...';

-- Should show: Index Scan using idx_deck_cards_deck_id
```

#### Handling Cascade Deletes

**Delete deck → cascade to deck_cards**:

```typescript
// Foreign key ON DELETE CASCADE handles cleanup
await db.delete(decks).where(eq(decks.id, deckId))
// deck_cards rows automatically deleted
// No orphaned deck_cards records
```

**Delete flashcard → cascade to deck_cards**:

```typescript
// Foreign key ON DELETE CASCADE handles cleanup
// Trigger updates deck.card_count
await db.delete(flashcards).where(eq(flashcards.id, flashcardId))
// deck_cards rows automatically deleted
// All affected decks have card_count decremented by trigger
```

#### Batch Operation Optimization

**Batch add cards** (avoid N+1 queries):

```typescript
export async function addCardsToDeck(deckId: string, flashcardIds: string[]): Promise<void> {
  const db = getDb()

  // Single batch INSERT (not N separate INSERTs)
  await db.insert(deckCards).values(
    flashcardIds.map((flashcardId) => ({
      deckId,
      flashcardId,
      addedAt: new Date(),
    }))
  )

  // Trigger automatically updates deck.card_count
  // No manual COUNT(*) needed
}
```

**Batch remove cards**:

```typescript
export async function removeCardsFromDeck(deckId: string, flashcardIds: string[]): Promise<void> {
  const db = getDb()

  // Single batch DELETE
  await db
    .delete(deckCards)
    .where(and(eq(deckCards.deckId, deckId), inArray(deckCards.flashcardId, flashcardIds)))

  // Trigger automatically updates deck.card_count
}
```

---

## Summary

This research provides concrete implementation guidance for the flashcard deck organization feature:

1. **Hybrid AI Generation** uses two-stage pipeline (vector search → LLM re-ranking) with SSE progress updates, balancing quality and cost
2. **Deck-Filtered FSRS** extends existing scheduler with JOIN-based filtering, supports deck-specific overrides while maintaining global FSRS state
3. **Live Session Updates** uses 5-second polling (not SSE) for simplicity, handles added/removed cards gracefully
4. **Hard Limit Enforcement** uses database constraints + application validation for defense-in-depth, provides user-friendly error messages
5. **Many-to-Many Performance** uses denormalized counter cache and proper indexes for fast queries even with 100k relationships

All decisions align with project constitution's principles of simplicity, performance, and test-driven development while meeting all functional requirements (FR-001 through FR-035).
