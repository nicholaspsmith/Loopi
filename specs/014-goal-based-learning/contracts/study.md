# API Contract: Study Sessions

**Base Path**: `/api/study`

## Endpoints

### Start Study Session

```
POST /api/study/session
```

**Request Body**:

```typescript
{
  goalId: string
  mode: 'flashcard' | 'multiple_choice' | 'timed' | 'mixed'
  nodeId?: string       // Optional: limit to specific node and children
  cardLimit?: number    // Max cards (default: 20, max: 50)
}
```

**Response**: `200 OK`

```typescript
{
  sessionId: string     // Client-side session tracking
  mode: string
  cards: StudyCard[]
  timedSettings?: {
    durationSeconds: number  // For timed mode: 300 (5 min)
    pointsPerCard: number
  }
}
```

**Notes**:

- Cards selected using FSRS due date ordering
- `nodeId` filters to that subtree (uses path LIKE query)
- Returns cards with their current FSRS state

---

### Record Rating

```
POST /api/study/rate
```

**Request Body**:

```typescript
{
  cardId: string
  rating: 1 | 2 | 3 | 4  // Again, Hard, Good, Easy
  responseTimeMs?: number // For analytics
  mode: 'flashcard' | 'multiple_choice' | 'timed'
}
```

**Response**: `200 OK`

```typescript
{
  cardId: string
  nextDue: string // ISO 8601 timestamp
  newState: FSRSState
}
```

**Notes**:

- Creates reviewLog entry
- Updates flashcard.fsrsState
- Same as existing `/api/quiz/rate` but with mode tracking

---

### Complete Session

```
POST /api/study/session/complete
```

**Request Body**:

```typescript
{
  sessionId: string
  goalId: string
  mode: string
  durationSeconds: number
  ratings: { cardId: string; rating: number }[]
  timedScore?: {
    correct: number
    total: number
    bonusPoints: number
  }
}
```

**Response**: `200 OK`

```typescript
{
  summary: {
    cardsStudied: number
    averageRating: number
    timeSpent: number
    retentionRate: number
  }
  masteryUpdate: {
    nodeId: string
    oldMastery: number
    newMastery: number
  }[]
  achievements: UnlockedAchievement[]
  goalProgress: {
    oldMastery: number
    newMastery: number
  }
}
```

**Notes**:

- Updates goal.totalTimeSeconds
- Recalculates mastery for affected nodes
- Checks and triggers achievements
- Returns any newly unlocked achievements for celebration UI

---

## Types

### StudyCard

```typescript
interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[] // Shuffled for MC mode
  nodeId: string
  nodeTitle: string
  fsrsState: {
    state: 'New' | 'Learning' | 'Review' | 'Relearning'
    due: string
    stability: number
    difficulty: number
  }
}
```

### FSRSState

```typescript
interface FSRSState {
  state: 0 | 1 | 2 | 3 // New, Learning, Review, Relearning
  due: string // ISO 8601
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  lastReview: string | null
}
```

### UnlockedAchievement

```typescript
interface UnlockedAchievement {
  key: string
  title: string
  description: string
  icon: string // Emoji or icon name
  unlockedAt: string
}
```

---

## Study Mode Details

### Flashcard Mode

- Cards shown one at a time
- Flip to reveal answer
- Rate 1-4 after viewing
- No time pressure

### Multiple Choice Mode

- Question displayed with 4 options (1 correct + 3 distractors)
- User selects answer
- Correct = rating 3 (Good), Incorrect = rating 1 (Again)
- Shows correct answer after selection

### Timed Mode

- 5-minute challenge
- Mix of flashcards and MC
- Points: base 10 + speed bonus (faster = more points)
- Incorrect answers: 0 points, no penalty
- Final score displayed with achievements

### Mixed Mode

- Randomly alternates between flashcard and MC
- Same rating system as individual modes
- Good for variety and engagement

---

## Session State (Client-Side)

Per research.md, session state is managed in React, not persisted server-side:

```typescript
interface StudySession {
  sessionId: string
  goalId: string
  mode: 'flashcard' | 'multiple_choice' | 'timed' | 'mixed'
  cards: StudyCard[]
  currentIndex: number
  responses: {
    cardId: string
    rating: number
    timeMs: number
    correct?: boolean // For MC mode
  }[]
  startedAt: Date
  // Timed mode
  timeRemaining?: number
  score?: number
}
```

Ratings are sent individually via `/api/study/rate` for immediate FSRS updates.
Session summary sent via `/api/study/session/complete` at end.
