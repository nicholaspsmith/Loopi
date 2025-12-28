# API Contract: Skill Tree

**Base Path**: `/api/goals/[goalId]/skill-tree`

## Endpoints

### Get Skill Tree

```
GET /api/goals/[goalId]/skill-tree
```

**Response**: `200 OK`

```typescript
{
  id: string
  goalId: string
  generatedBy: 'ai' | 'curated'
  curatedSourceId: string | null
  nodeCount: number
  maxDepth: number
  createdAt: string
  updatedAt: string
  regeneratedAt: string | null
  nodes: SkillNodeTree[] // Nested structure from root
}
```

**Errors**:

- `404`: Goal or skill tree not found

---

### Regenerate Skill Tree

```
POST /api/goals/[goalId]/skill-tree/regenerate
```

**Request Body**:

```typescript
{
  feedback?: string  // User feedback for regeneration
                     // e.g., "More detail on networking", "Simpler breakdown"
}
```

**Response**: `200 OK`

```typescript
{
  id: string
  nodeCount: number
  maxDepth: number
  regeneratedAt: string
  nodes: SkillNodeTree[]
}
```

**Notes**:

- Preserves goal but replaces entire tree structure
- Cards linked to old nodes are unlinked (skillNodeId set to null)
- User can re-link cards via card generation

**Errors**:

- `404`: Goal not found
- `500`: LLM generation failed (returns error, keeps old tree)

---

### Update Node

```
PATCH /api/goals/[goalId]/skill-tree/nodes/[nodeId]
```

**Request Body**:

```typescript
{
  title?: string
  description?: string
  isEnabled?: boolean
  sortOrder?: number
}
```

**Response**: `200 OK`

```typescript
{
  id: string
  title: string
  description: string | null
  isEnabled: boolean
  sortOrder: number
  updatedAt: string
}
```

**Notes**:

- Toggling `isEnabled` affects mastery calculations
- `sortOrder` changes reorder among siblings

---

### Bulk Update Nodes

```
PATCH /api/goals/[goalId]/skill-tree/nodes
```

**Request Body**:

```typescript
{
  updates: {
    nodeId: string
    isEnabled?: boolean
  }[]
}
```

**Response**: `200 OK`

```typescript
{
  updated: number
  nodes: {
    id: string
    isEnabled: boolean
  }
  ;[]
}
```

**Use Case**: Toggle multiple nodes at once (e.g., "enable all under Security")

---

## Skill Tree Generation

### Generate for New Goal

Skill tree generation happens during goal creation when `generateTree: true` (default).

**LLM Prompt Flow**:

1. User provides goal title (e.g., "Kubernetes Administration")
2. System calls Ollama with structured prompt (see research.md)
3. Response parsed and validated
4. Nodes inserted with materialized paths
5. Tree returned to client

**Timing**: Target < 30 seconds (SC-001)

---

## Types

### SkillNodeTree

```typescript
interface SkillNodeTree {
  id: string
  title: string
  description: string | null
  depth: number // 0=Goal, 1=Category, 2=Topic, 3=Subtopic
  path: string // "1", "1.2", "1.2.3"
  sortOrder: number
  isEnabled: boolean
  masteryPercentage: number
  cardCount: number
  children: SkillNodeTree[]
}
```

### SkillNodeFlat

```typescript
interface SkillNodeFlat {
  id: string
  treeId: string
  parentId: string | null
  title: string
  description: string | null
  depth: number
  path: string
  sortOrder: number
  isEnabled: boolean
  masteryPercentage: number
  cardCount: number
  createdAt: string
  updatedAt: string
}
```
