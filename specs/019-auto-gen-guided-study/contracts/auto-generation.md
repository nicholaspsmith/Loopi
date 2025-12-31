# API Contract: Auto-Generation

**Feature**: 019-auto-gen-guided-study
**Date**: 2025-12-31

## Overview

When a skill tree is generated, flashcards are automatically queued for generation on each node.

## Modified: Skill Tree Job Handler

**File**: `lib/jobs/handlers/skill-tree-job.ts`

After successful tree creation, queue flashcard generation jobs:

```typescript
// After tree nodes are created
for (const node of createdNodes) {
  await createJob({
    type: 'flashcard_generation',
    userId: job.userId,
    payload: {
      nodeId: node.id,
      nodeTitle: node.title,
      nodeDescription: node.description,
      maxCards: 5, // Free tier limit
    },
    priority: 0,
  })
}
```

## Modified: Flashcard Job Handler

**File**: `lib/jobs/handlers/flashcard-job.ts`

Accept node-based generation (in addition to existing message-based):

```typescript
interface FlashcardJobPayload {
  // Existing: message-based
  messageId?: string
  content?: string

  // New: node-based
  nodeId?: string
  nodeTitle?: string
  nodeDescription?: string
  maxCards?: number
}

async function handleFlashcardJob(job: BackgroundJob): Promise<void> {
  const payload = job.payload as FlashcardJobPayload

  if (payload.nodeId) {
    // Node-based generation
    const content = buildNodeContent(payload.nodeTitle, payload.nodeDescription)
    const cards = await generateFlashcardsFromContent(content, payload.maxCards || 5)
    await saveCardsToNode(cards, payload.nodeId, job.userId)
  } else if (payload.messageId) {
    // Existing message-based flow
    // ... existing implementation
  }
}

function buildNodeContent(title: string, description?: string): string {
  return `Topic: ${title}\n\n${description || `Learn about ${title}`}`
}
```

## New: Node Card Count Update

**File**: `lib/db/operations/skill-nodes.ts`

```typescript
export async function incrementNodeCardCount(nodeId: string, count: number): Promise<void> {
  await db
    .update(skillNodes)
    .set({
      cardCount: sql`${skillNodes.cardCount} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(skillNodes.id, nodeId))
}
```

## Response: Job Status

Existing job status endpoint works unchanged:

```http
GET /api/jobs/:jobId

Response (during generation):
{
  "id": "job-123",
  "type": "flashcard_generation",
  "status": "processing",
  "payload": { "nodeId": "node-456", ... }
}

Response (completed):
{
  "id": "job-123",
  "type": "flashcard_generation",
  "status": "completed",
  "result": { "cardsGenerated": 5 }
}
```

## Error Handling

| Scenario                     | Behavior                                  |
| ---------------------------- | ----------------------------------------- |
| Node content too short       | Generate fewer cards, log warning         |
| API rate limit               | Retry with exponential backoff (existing) |
| Node deleted before job runs | Job fails gracefully, no cards created    |
| Tree job fails mid-creation  | No flashcard jobs queued (atomic)         |

## Testing Contract

```typescript
describe('Auto-Generation', () => {
  it('queues flashcard jobs after skill tree creation', async () => {
    // Given a skill tree generation job
    // When the job completes successfully
    // Then flashcard_generation jobs are queued for each node
  })

  it('generates 5 cards per node for free tier', async () => {
    // Given a node flashcard generation job
    // When the job runs
    // Then exactly 5 cards are created with skillNodeId set
  })

  it('updates node cardCount after generation', async () => {
    // Given cards generated for a node
    // When generation completes
    // Then node.cardCount equals number of cards created
  })
})
```
