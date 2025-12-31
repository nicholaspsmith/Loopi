# Research: Auto-Generation & Guided Study Flow

**Feature**: 019-auto-gen-guided-study
**Date**: 2025-12-31

## Research Topics

### 1. Auto-Generation Trigger Point

**Decision**: Trigger flashcard generation as part of skill tree job completion

**Rationale**:

- Skill tree generation already runs as a background job (`skill_tree_generation`)
- After tree nodes are created, we can immediately queue flashcard generation jobs for each node
- This keeps generation async and doesn't block the UI
- Existing `flashcard_generation` job type can be reused with node context

**Alternatives Considered**:

- Synchronous generation during tree creation: Rejected - would make goal creation extremely slow (5 cards × 20+ nodes × Claude API calls)
- Separate "generate all cards" button: Rejected - adds friction, spec requires automatic generation
- Generate on first node view: Rejected - delays study start, doesn't meet "30 seconds to first study" goal

### 2. Node Completion Detection (FSRS State)

**Decision**: Node is complete when all cards have `state >= 2` (Review or Relearning state)

**Rationale**:

- FSRS states: 0=New, 1=Learning, 2=Review, 3=Relearning
- State 2 (Review) means the card has passed initial learning phase
- This aligns with the clarification: "all cards reach FSRS 'review' state"
- Relearning (3) should also count as "complete" since user is in maintenance mode

**Implementation**:

```typescript
// lib/study/node-completion.ts
function isNodeComplete(nodeId: string): boolean {
  const cards = await getCardsForNode(nodeId)
  return cards.every((card) => card.fsrsState.state >= 2)
}
```

**Alternatives Considered**:

- Check only state === 2: Rejected - excludes relearning cards
- Check due date is in future: Rejected - card could be due today but still complete
- Check retention rate threshold: Rejected - adds complexity, doesn't match spec

### 3. Depth-First Traversal Implementation

**Decision**: Use materialized path for efficient depth-first ordering

**Rationale**:

- Skill nodes already have `path` field (e.g., "1.2.3") stored as materialized path
- Sorting by path naturally gives depth-first order: "1" < "1.1" < "1.1.1" < "1.2" < "2"
- No recursive queries needed - single ORDER BY clause

**Implementation**:

```typescript
// Get nodes in depth-first order
const nodes = await db
  .select()
  .from(skillNodes)
  .where(eq(skillNodes.treeId, treeId))
  .orderBy(skillNodes.path)
```

**Alternatives Considered**:

- Recursive CTE: Rejected - more complex, slower for large trees
- Client-side tree traversal: Rejected - wasteful data transfer
- Pre-computed sort_order: Already exists but path is more reliable

## Dependencies

| Dependency  | Version | Usage                                           |
| ----------- | ------- | ----------------------------------------------- |
| ts-fsrs     | 5.2.3   | Card state checking (state >= 2 for completion) |
| drizzle-orm | 0.45.1  | Database queries for nodes, cards               |

## Integration Points

1. **Skill Tree Generation → Card Generation**
   - Modify `lib/jobs/handlers/skill-tree-job.ts` to queue flashcard jobs after tree creation
   - Each node gets a separate `flashcard_generation` job

2. **Study Session → Guided Flow**
   - Modify `app/api/study/session/route.ts` to accept `mode: 'guided'`
   - Returns cards for current incomplete node only

3. **Goal Page → Study Now Button**
   - Replace existing study link with prominent green button
   - Button navigates to `/goals/[goalId]/study?mode=guided`
