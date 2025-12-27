# API Contract: Card Generation

**Base Path**: `/api/goals/[goalId]/generate`

## Endpoints

### Generate Cards for Node

```
POST /api/goals/[goalId]/generate
```

**Request Body**:

```typescript
{
  nodeId: string          // Skill node to generate cards for
  count?: number          // Number of cards (default: 10, max: 20)
  cardType?: 'flashcard' | 'multiple_choice' | 'mixed'  // default: 'flashcard'
  feedback?: string       // Refinement feedback for regeneration
}
```

**Response**: `200 OK`

```typescript
{
  cards: GeneratedCard[]
  nodeId: string
  nodeTitle: string
  generatedAt: string
}
```

**Timing**: Target < 60 seconds for 10 cards (SC-002)

**Errors**:

- `400`: Invalid nodeId or count
- `404`: Goal or node not found
- `500`: LLM generation failed

---

### Commit Generated Cards

```
POST /api/goals/[goalId]/generate/commit
```

**Request Body**:

```typescript
{
  cards: {
    question: string
    answer: string
    cardType: 'flashcard' | 'multiple_choice'
    distractors?: string[]  // Required for multiple_choice
    approved: boolean       // Only commit approved cards
  }[]
  nodeId: string
  deckId?: string          // Optional, creates new deck if not provided
}
```

**Response**: `201 Created`

```typescript
{
  committed: number
  skipped: number
  deckId: string
  nodeId: string
  cards: {
    id: string
    question: string
    cardType: string
  }
  ;[]
}
```

**Notes**:

- Only commits cards with `approved: true`
- Creates FSRS state for each new card
- Links cards to skill node for mastery tracking
- Syncs to LanceDB for vector search
- Updates node's `cardCount`

---

### Refine Cards

```
POST /api/goals/[goalId]/generate/refine
```

**Request Body**:

```typescript
{
  nodeId: string
  cards: GeneratedCard[]   // Current cards to refine
  feedback: string         // User feedback
                          // e.g., "Make more practical", "Add code examples"
}
```

**Response**: `200 OK`

```typescript
{
  cards: GeneratedCard[]
  refinementApplied: string
}
```

**Notes**:

- Preserves context from original generation
- User can iterate multiple times before committing
- No database writes until commit

---

## Types

### GeneratedCard

Cards in preview state (not yet committed to database):

```typescript
interface GeneratedCard {
  tempId: string // Client-side ID for tracking
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[] // For multiple choice
  approved: boolean // User approval status
  edited: boolean // Whether user modified content
}
```

### CommittedCard

After commit, cards have full database structure:

```typescript
interface CommittedCard {
  id: string // Database UUID
  userId: string
  skillNodeId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  cardMetadata: {
    distractors?: string[]
  } | null
  fsrsState: FSRSState
  createdAt: string
}
```

---

## Generation Flow

```
User selects node "Pods"
        │
        ▼
POST /api/goals/{id}/generate
{ nodeId: "...", count: 10, cardType: "flashcard" }
        │
        ▼
┌───────────────────────┐
│   LLM Generation      │
│   (Ollama)            │
│   - Context: node     │
│   - Format: cards     │
└───────────────────────┘
        │
        ▼
Response: { cards: [...10 cards...] }
        │
        ▼
User reviews cards in UI
- Edit question/answer
- Approve/reject each
- Request refinement
        │
        ▼
POST /api/goals/{id}/generate/commit
{ cards: [...approved...], nodeId, deckId }
        │
        ▼
Cards saved to PostgreSQL + LanceDB
Node cardCount updated
```

---

## LLM Prompt Template

See [research.md](../research.md) for full prompt. Key elements:

```
Generate {count} flashcards for learning about: {nodeTitle}

Context: This is part of a learning path for {goalTitle}.
Parent topic: {parentNodeTitle}

Output JSON array:
[
  {
    "question": "What is...",
    "answer": "...",
    "distractors": ["wrong1", "wrong2", "wrong3"]  // if MC
  }
]

Rules:
- Questions should test understanding, not just recall
- Answers should be concise but complete
- For multiple choice, distractors should be plausible but clearly wrong
```
