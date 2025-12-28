# API Contract: Goals

**Base Path**: `/api/goals`

## Endpoints

### List Goals

```
GET /api/goals
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter by status: `active`, `paused`, `completed`, `archived`, `all` |
| limit | number | 20 | Max results |
| offset | number | 0 | Pagination offset |

**Response**: `200 OK`

```typescript
{
  goals: {
    id: string
    title: string
    description: string | null
    status: 'active' | 'paused' | 'completed' | 'archived'
    masteryPercentage: number
    totalTimeSeconds: number
    createdAt: string // ISO 8601
    updatedAt: string
    skillTree: {
      id: string
      nodeCount: number
      maxDepth: number
    } | null
  }[]
  total: number
  hasMore: boolean
}
```

---

### Create Goal

```
POST /api/goals
```

**Request Body**:

```typescript
{
  title: string          // Required, max 200 chars
  description?: string   // Optional
  generateTree?: boolean // Default: true
}
```

**Response**: `201 Created`

```typescript
{
  goal: {
    id: string
    title: string
    description: string | null
    status: 'active'
    masteryPercentage: 0
    createdAt: string
  }
  skillTree?: {
    id: string
    nodes: SkillNodeTree[] // Nested structure
  }
}
```

**Errors**:

- `400`: Invalid title (empty or too long)
- `500`: Skill tree generation failed (returns goal without tree)

---

### Get Goal

```
GET /api/goals/[goalId]
```

**Response**: `200 OK`

```typescript
{
  id: string
  title: string
  description: string | null
  status: 'active' | 'paused' | 'completed' | 'archived'
  masteryPercentage: number
  totalTimeSeconds: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
  archivedAt: string | null
  skillTree: {
    id: string
    generatedBy: 'ai' | 'curated'
    nodeCount: number
    maxDepth: number
    nodes: SkillNodeTree[] // Full nested structure
  } | null
  stats: {
    totalCards: number
    cardsDue: number
    retentionRate: number // 0-100
  }
}
```

**Errors**:

- `404`: Goal not found or not owned by user

---

### Update Goal

```
PATCH /api/goals/[goalId]
```

**Request Body**:

```typescript
{
  title?: string
  description?: string
  status?: 'active' | 'paused' | 'archived'
}
```

**Response**: `200 OK`

```typescript
{
  id: string
  title: string
  description: string | null
  status: string
  updatedAt: string
}
```

**Notes**:

- Cannot set status to `completed` directly (calculated from mastery)
- Setting to `archived` populates `archivedAt`

---

### Delete Goal

```
DELETE /api/goals/[goalId]
```

**Response**: `204 No Content`

**Notes**:

- Cascades to skill tree, nodes
- Flashcards are unlinked (skillNodeId set to null), not deleted

---

## Types

### SkillNodeTree (Nested)

```typescript
interface SkillNodeTree {
  id: string
  title: string
  description: string | null
  depth: number
  path: string
  sortOrder: number
  isEnabled: boolean
  masteryPercentage: number
  cardCount: number
  children: SkillNodeTree[]
}
```
