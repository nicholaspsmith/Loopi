# API Contract: Custom Card Creation

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Overview

Users can create custom flashcards within specific skill tree nodes.

## New Endpoint: Create Custom Card

```http
POST /api/flashcards/custom
Authorization: Bearer {token}
Content-Type: application/json

{
  "nodeId": "node-123",
  "question": "What is the purpose of a constructor?",
  "answer": "A constructor is a special method that initializes a new object instance."
}
```

### Success Response (201 Created)

```json
{
  "id": "card-789",
  "question": "What is the purpose of a constructor?",
  "answer": "A constructor is a special method that initializes a new object instance.",
  "skillNodeId": "node-123",
  "cardType": "flashcard",
  "fsrsState": {
    "state": 0,
    "due": "2025-12-31T12:00:00Z",
    "stability": 0,
    "difficulty": 0,
    "elapsedDays": 0,
    "scheduledDays": 0,
    "reps": 0,
    "lapses": 0,
    "learningSteps": 0
  },
  "createdAt": "2025-12-31T12:00:00Z"
}
```

### Validation Rules

| Field    | Constraint     | Error Message                        |
| -------- | -------------- | ------------------------------------ |
| question | 5-1000 chars   | "Question must be 5-1000 characters" |
| answer   | 5-5000 chars   | "Answer must be 5-5000 characters"   |
| nodeId   | Valid UUID     | "Invalid node ID"                    |
| nodeId   | Exists         | "Node not found"                     |
| nodeId   | User owns goal | "Access denied"                      |

### Error Responses

```json
// 400 Bad Request - Validation Error
{
  "error": "Validation failed",
  "details": {
    "question": "Question must be at least 5 characters"
  }
}

// 403 Forbidden - Not Owner
{
  "error": "You do not have permission to add cards to this node"
}

// 404 Not Found - Node Missing
{
  "error": "Node not found"
}
```

## Implementation

**File**: `app/api/flashcards/custom/route.ts`

```typescript
import { z } from 'zod'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { getNodeWithGoal } from '@/lib/db/operations/skill-nodes'
import { incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'
import { createInitialFsrsState } from '@/lib/fsrs/scheduler'

const customCardSchema = z.object({
  nodeId: z.string().uuid(),
  question: z.string().min(5).max(1000),
  answer: z.string().min(5).max(5000),
})

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const result = customCardSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { nodeId, question, answer } = result.data

  // Verify node exists and user owns the goal
  const node = await getNodeWithGoal(nodeId)
  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }
  if (node.goal.userId !== session.user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Create the card
  const card = await createFlashcard({
    userId: session.user.id,
    skillNodeId: nodeId,
    question,
    answer,
    cardType: 'flashcard',
    fsrsState: createInitialFsrsState(),
    status: 'active',
  })

  // Update node card count
  await incrementNodeCardCount(nodeId, 1)

  return NextResponse.json(card, { status: 201 })
}
```

## UI Component

**File**: `components/goals/CustomCardForm.tsx`

```typescript
interface CustomCardFormProps {
  nodeId: string
  onSuccess: (card: Flashcard) => void
  onCancel: () => void
}

function CustomCardForm({ nodeId, onSuccess, onCancel }: CustomCardFormProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/flashcards/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, question, answer }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create card')
      }

      const card = await response.json()
      onSuccess(card)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Enter your question..."
        minLength={5}
        maxLength={1000}
        required
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Enter the answer..."
        minLength={5}
        maxLength={5000}
        required
      />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Card'}
        </button>
      </div>
    </form>
  )
}
```

## Testing Contract

```typescript
describe('Custom Card Creation', () => {
  it('creates a card linked to the specified node', async () => {
    // Given a valid node owned by the user
    // When POST /api/flashcards/custom with question and answer
    // Then card is created with skillNodeId set
  })

  it('rejects cards for nodes not owned by user', async () => {
    // Given a node owned by another user
    // When POST /api/flashcards/custom
    // Then returns 403 Forbidden
  })

  it('validates question length (5-1000 chars)', async () => {
    // Given question with 3 chars
    // When POST /api/flashcards/custom
    // Then returns 400 with validation error
  })

  it('initializes card with New FSRS state', async () => {
    // Given valid card creation request
    // When card is created
    // Then fsrsState.state = 0 (New)
  })

  it('increments node cardCount', async () => {
    // Given a node with cardCount = 5
    // When custom card is created
    // Then node cardCount = 6
  })
})
```
