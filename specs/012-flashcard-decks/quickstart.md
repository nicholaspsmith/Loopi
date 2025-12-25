# Quickstart: Flashcard Deck Integration

**Feature**: 012-flashcard-decks
**Created**: 2025-12-24
**References**: [spec.md](./spec.md), [plan.md](./plan.md), [data-model.md](./data-model.md)

## Overview

This guide provides step-by-step integration scenarios for the flashcard deck feature. Each scenario maps to a user story and demonstrates the complete flow from API calls to expected responses.

## Prerequisites

- Authenticated user session (NextAuth cookie)
- At least 5 existing flashcards in user's library
- PostgreSQL database with `decks` and `deck_cards` tables
- LanceDB with vector embeddings for flashcards (AI generation only)
- Claude API access (AI generation only)

## Scenario 1: Manual Deck Creation and Study

**User Story**: P1 - Manual Deck Creation and Study
**Goal**: Create a deck, add cards, and start a study session

### Step 1: Create New Deck

**Request**:
```http
POST /api/decks
Content-Type: application/json

{
  "name": "Spanish Verbs"
}
```

**Response** (201 Created):
```json
{
  "id": "deck-123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "name": "Spanish Verbs",
  "createdAt": "2025-12-24T10:00:00Z",
  "lastStudiedAt": null,
  "archived": false,
  "newCardsPerDayOverride": null,
  "cardsPerSessionOverride": null
}
```

### Step 2: Add Cards to Deck

**Request**:
```http
POST /api/decks/deck-123e4567-e89b-12d3-a456-426614174000/cards
Content-Type: application/json

{
  "flashcardIds": [
    "card-abc12345-e89b-12d3-a456-426614174000",
    "card-def67890-e89b-12d3-a456-426614174111",
    "card-ghi11111-e89b-12d3-a456-426614174222"
  ]
}
```

**Response** (200 OK):
```json
{
  "addedCount": 3,
  "cardCount": 3,
  "limit": 1000
}
```

### Step 3: Start Deck Study Session

**Request**:
```http
POST /api/study/deck-session
Content-Type: application/json

{
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "session-550e8400-e29b-41d4-a716-446655440000",
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000",
  "deckName": "Spanish Verbs",
  "dueCards": [
    {
      "id": "card-abc12345-e89b-12d3-a456-426614174000",
      "front": "hablar",
      "back": "to speak",
      "tags": ["verbs", "spanish"],
      "fsrs": {
        "state": "new",
        "dueDate": "2025-12-24T10:00:00Z"
      }
    },
    {
      "id": "card-def67890-e89b-12d3-a456-426614174111",
      "front": "comer",
      "back": "to eat",
      "tags": ["verbs", "spanish"],
      "fsrs": {
        "state": "review",
        "dueDate": "2025-12-24T09:30:00Z",
        "difficulty": 5.5,
        "stability": 7.2
      }
    }
  ],
  "totalDueCards": 2,
  "cardsPerSession": 20,
  "newCardsPerDay": 10,
  "appliedSettings": {
    "source": "global",
    "newCardsPerDay": 10,
    "cardsPerSession": 20
  }
}
```

### Step 4: User Studies Cards (Existing Flow)

User rates cards using existing study session UI. FSRS state updates globally.

---

## Scenario 2: AI-Powered Deck Generation

**User Story**: P3 - AI-Powered Deck Creation
**Goal**: Generate deck suggestions using hybrid AI approach

### Step 1: Request AI Deck Generation

**Request**:
```http
POST /api/decks-ai
Content-Type: application/json

{
  "topic": "cellular respiration and ATP production",
  "minCards": 5,
  "maxCards": 15,
  "vectorSearchLimit": 40
}
```

**Processing** (backend):
1. Generate vector embedding for topic using Nomic embed-text
2. Query LanceDB for top 40 semantically similar flashcards
3. Pass 40 candidates to Claude API with prompt:
   ```
   Filter and rank these flashcards by relevance to "cellular respiration and ATP production".
   Return 5-15 most relevant cards with explanations.
   ```
4. Claude returns filtered and re-ranked results

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "flashcardId": "card-aaa11111-e89b-12d3-a456-426614174000",
      "front": "What is the role of mitochondria in cellular respiration?",
      "back": "Mitochondria are the powerhouse of the cell, converting glucose into ATP through oxidative phosphorylation.",
      "tags": ["biology", "cellular-respiration"],
      "relevanceScore": 0.95,
      "relevanceReason": "Directly addresses cellular respiration and ATP production in mitochondria",
      "vectorSimilarity": 0.88
    },
    {
      "flashcardId": "card-bbb22222-e89b-12d3-a456-426614174111",
      "front": "What are the three stages of cellular respiration?",
      "back": "Glycolysis, Krebs cycle, and electron transport chain",
      "tags": ["biology", "cellular-respiration"],
      "relevanceScore": 0.92,
      "relevanceReason": "Covers the complete cellular respiration process",
      "vectorSimilarity": 0.85
    },
    {
      "flashcardId": "card-ccc33333-e89b-12d3-a456-426614174222",
      "front": "How many ATP molecules are produced per glucose molecule?",
      "back": "Approximately 36-38 ATP molecules (net gain)",
      "tags": ["biology", "atp"],
      "relevanceScore": 0.90,
      "relevanceReason": "Specifically addresses ATP production, the core of the topic",
      "vectorSimilarity": 0.82
    }
  ],
  "metadata": {
    "candidateCount": 38,
    "llmFiltered": true,
    "processingTimeMs": 4200,
    "warnings": [],
    "vectorSearchTimeMs": 800,
    "llmFilteringTimeMs": 3400
  }
}
```

### Step 2: User Reviews Suggestions (UI Flow)

User sees suggestions in `AIGenerationDialog.tsx`:
- Can accept or reject each card
- Can adjust selection before creating deck

### Step 3: Create Deck from Accepted Cards

**Request**:
```http
POST /api/decks
Content-Type: application/json

{
  "name": "Cellular Respiration"
}
```

Then add accepted cards:
```http
POST /api/decks/{deckId}/cards
Content-Type: application/json

{
  "flashcardIds": [
    "card-aaa11111-e89b-12d3-a456-426614174000",
    "card-bbb22222-e89b-12d3-a456-426614174111",
    "card-ccc33333-e89b-12d3-a456-426614174222"
  ]
}
```

---

## Scenario 3: Deck-Filtered Study with FSRS Overrides

**User Story**: P1/P2 - Deck-Filtered Study Sessions with Settings
**Goal**: Study from deck with deck-specific FSRS settings

### Step 1: Configure Deck-Specific Settings

**Request**:
```http
PATCH /api/decks/deck-123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "newCardsPerDayOverride": 15,
  "cardsPerSessionOverride": 25
}
```

**Response** (200 OK):
```json
{
  "id": "deck-123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-550e8400-e29b-41d4-a716-446655440000",
  "name": "Spanish Verbs",
  "createdAt": "2025-12-24T10:00:00Z",
  "lastStudiedAt": "2025-12-24T11:30:00Z",
  "archived": false,
  "newCardsPerDayOverride": 15,
  "cardsPerSessionOverride": 25
}
```

### Step 2: Start Session with Overrides

**Request**:
```http
POST /api/study/deck-session
Content-Type: application/json

{
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "session-abc12345-e29b-41d4-a716-446655440000",
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000",
  "deckName": "Spanish Verbs",
  "dueCards": [
    /* 25 cards max (deck override) */
  ],
  "totalDueCards": 30,
  "cardsPerSession": 25,
  "newCardsPerDay": 15,
  "appliedSettings": {
    "source": "deck-override",
    "newCardsPerDay": 15,
    "cardsPerSession": 25
  }
}
```

**Note**: User global settings are `newCardsPerDay: 10, cardsPerSession: 20`, but deck overrides take precedence (FR-029).

---

## Scenario 4: Live Session Updates

**User Story**: P2 - Live Session Updates
**Goal**: Handle concurrent deck edits during active study session

### Step 1: Start Study Session

**Request**:
```http
POST /api/study/deck-session
Content-Type: application/json

{
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000"
}
```

**Response**: Session started with 10 due cards.

### Step 2: Subscribe to Live Updates (SSE)

**Request**:
```http
GET /api/study/deck-session/session-abc12345-e29b-41d4-a716-446655440000/live-updates
```

**Response** (SSE stream):
```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

: connected

```

### Step 3: User Adds Card to Deck (Different Tab/Device)

**Request** (from another tab):
```http
POST /api/decks/deck-123e4567-e89b-12d3-a456-426614174000/cards
Content-Type: application/json

{
  "flashcardIds": ["card-new11111-e89b-12d3-a456-426614174000"]
}
```

### Step 4: Live Update Event Sent to Active Session

**SSE Event** (received by active session):
```
event: card-added
data: {"flashcardId":"card-new11111-e89b-12d3-a456-426614174000","dueDate":"2025-12-24T10:00:00Z","state":"new"}

```

**Client Behavior**:
- If card is FSRS-due: Inject into session queue
- If card is not due: Ignore (won't appear in this session)

### Step 5: User Removes Card from Deck (Different Tab)

**Request**:
```http
DELETE /api/decks/deck-123e4567-e89b-12d3-a456-426614174000/cards
Content-Type: application/json

{
  "flashcardIds": ["card-def67890-e89b-12d3-a456-426614174111"]
}
```

**SSE Event** (received by active session):
```
event: card-removed
data: {"flashcardId":"card-def67890-e89b-12d3-a456-426614174111"}

```

**Client Behavior**:
- If card not yet reviewed: Skip when it comes up in queue
- If card currently being reviewed: Allow completion, then skip

---

## Error Scenarios

### Deck Limit Exceeded (100 Decks)

**Request**:
```http
POST /api/decks
Content-Type: application/json

{
  "name": "My 101st Deck"
}
```

**Response** (403 Forbidden):
```json
{
  "error": "Maximum deck limit reached (100 decks). Please delete unused decks before creating new ones."
}
```

### Card Limit Exceeded (1000 Cards/Deck)

**Request**:
```http
POST /api/decks/deck-123e4567-e89b-12d3-a456-426614174000/cards
Content-Type: application/json

{
  "flashcardIds": [
    /* 50 card IDs, but deck already has 980 cards */
  ]
}
```

**Response** (403 Forbidden):
```json
{
  "error": "Deck limit reached (1000 cards maximum). Please create a new deck or remove cards before adding more."
}
```

### Empty Deck Study Session

**Request**:
```http
POST /api/study/deck-session
Content-Type: application/json

{
  "deckId": "deck-empty-e89b-12d3-a456-426614174000"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Cannot start session: deck contains 0 cards. Please add cards to the deck first."
}
```

### No Due Cards in Deck

**Request**:
```http
POST /api/study/deck-session
Content-Type: application/json

{
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000"
}
```

**Response** (200 OK):
```json
{
  "sessionId": "session-550e8400-e29b-41d4-a716-446655440000",
  "deckId": "deck-123e4567-e89b-12d3-a456-426614174000",
  "deckName": "Spanish Verbs",
  "dueCards": [],
  "totalDueCards": 0,
  "nextDueCard": {
    "dueDate": "2025-12-25T09:00:00Z",
    "count": 3
  },
  "appliedSettings": {
    "source": "global",
    "newCardsPerDay": 10,
    "cardsPerSession": 20
  }
}
```

### AI Generation - Insufficient Cards

**Request**:
```http
POST /api/decks-ai
Content-Type: application/json

{
  "topic": "quantum chromodynamics",
  "minCards": 5,
  "maxCards": 15
}
```

**Response** (200 OK with warning):
```json
{
  "suggestions": [
    {
      "flashcardId": "card-aaa11111-e89b-12d3-a456-426614174000",
      "front": "What is quantum mechanics?",
      "back": "...",
      "relevanceScore": 0.65,
      "relevanceReason": "Tangentially related to quantum physics but not chromodynamics specifically"
    }
  ],
  "metadata": {
    "candidateCount": 2,
    "llmFiltered": true,
    "processingTimeMs": 1800,
    "warnings": [
      "Only 2 matching cards found. Consider creating more flashcards on this topic."
    ]
  }
}
```

### AI Generation - LanceDB Unavailable

**Response** (503 Service Unavailable):
```json
{
  "error": "Vector search service unavailable. Please try manual deck creation.",
  "fallback": "manual"
}
```

---

## Integration Checklist

Before implementing, ensure:

- [ ] PostgreSQL migration `0006_add_decks.sql` applied
- [ ] Drizzle schema updated with `decks` and `deck_cards` tables
- [ ] Session authentication working (NextAuth)
- [ ] Existing FSRS scheduler accessible for extension
- [ ] LanceDB connection configured (for AI generation)
- [ ] Claude API key configured (for AI generation)
- [ ] Vector embeddings exist for user flashcards (or on-demand generation ready)

## Testing Integration

**Unit Tests**:
- Deck creation with limit validation
- Card addition/removal with limit validation
- FSRS override precedence logic

**Contract Tests**:
- All API endpoints match OpenAPI specs
- Request/response schemas validated

**Integration Tests**:
- End-to-end deck creation → add cards → study flow
- AI generation pipeline (vector search → LLM filter)
- Live session updates with concurrent edits

**E2E Tests** (Playwright):
- User Story 1: Manual deck creation and study
- User Story 2: Deck editing
- User Story 3: AI deck generation
- User Story 4: Deck-filtered study sessions
