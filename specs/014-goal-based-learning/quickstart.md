# Quickstart: Memoryloop v2 - Goal-Based Learning Platform

**Date**: 2025-12-27
**Purpose**: Get up and running quickly with the new goal-based learning system

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Ollama running locally with `llama3` or `mistral` model
- Existing Memoryloop installation

## Database Migration

### 1. Generate Migration

```bash
# Generate migration for new tables
npx drizzle-kit generate

# Review generated SQL in drizzle/ directory
```

### 2. Run Migration

```bash
# Apply migration
npx drizzle-kit migrate
```

### 3. Verify Tables

```bash
# Check new tables exist
psql $DATABASE_URL -c "\dt"

# Expected new tables:
# - learning_goals
# - skill_trees
# - skill_nodes
# - user_achievements
# - user_titles
# - topic_analytics
```

## Quick Test

### Create a Learning Goal

```bash
# Using the API
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "title": "Learn Kubernetes",
    "generateTree": true
  }'
```

Expected response:

```json
{
  "goal": {
    "id": "uuid",
    "title": "Learn Kubernetes",
    "status": "active",
    "masteryPercentage": 0
  },
  "skillTree": {
    "id": "uuid",
    "nodes": [
      {
        "title": "Core Concepts",
        "depth": 1,
        "children": [...]
      }
    ]
  }
}
```

### Generate Cards for a Node

```bash
curl -X POST http://localhost:3000/api/goals/{goalId}/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "nodeId": "node-uuid",
    "count": 5,
    "cardType": "flashcard"
  }'
```

### Start a Study Session

```bash
curl -X POST http://localhost:3000/api/study/session \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "goalId": "goal-uuid",
    "mode": "flashcard",
    "cardLimit": 10
  }'
```

## UI Navigation

After migration, the app navigation changes:

| Old Route | New Route           | Purpose                   |
| --------- | ------------------- | ------------------------- |
| `/chat`   | (removed)           | Replaced by goals         |
| `/quiz`   | `/goals/[id]/study` | Study within goal context |
| (new)     | `/goals`            | Goals dashboard           |
| (new)     | `/goals/new`        | Create new goal           |
| (new)     | `/goals/[id]`       | Goal detail + skill tree  |
| (new)     | `/progress`         | Mastery dashboard         |
| (new)     | `/achievements`     | Achievements page         |

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

### 2. Access the App

1. Navigate to `http://localhost:3000`
2. Log in with existing credentials
3. You'll be redirected to `/goals` (new home)
4. Click "Create Goal" to start

### 3. Test Study Flow

1. Create a goal with AI-generated skill tree
2. Select a node and generate cards
3. Review and approve cards
4. Start a study session in flashcard mode
5. Rate cards and see mastery update

## Key Files

### Database Schema

- `lib/db/drizzle-schema.ts` - All table definitions

### API Routes

- `app/api/goals/` - Goal CRUD
- `app/api/goals/[goalId]/skill-tree/` - Tree operations
- `app/api/goals/[goalId]/generate/` - Card generation
- `app/api/study/` - Study sessions
- `app/api/achievements/` - Achievements

### Components

- `components/goals/` - Goal management UI
- `components/skills/` - Skill tree visualization
- `components/study/` - Study mode interfaces
- `components/dashboard/` - Progress visualization

### Core Logic

- `lib/db/operations/goals.ts` - Goal database operations
- `lib/db/operations/skill-trees.ts` - Tree operations
- `lib/db/operations/skill-nodes.ts` - Node operations
- `lib/ai/skill-tree-generator.ts` - LLM tree generation
- `lib/ai/card-generator.ts` - Card generation (refactored)

## Ollama Configuration

Ensure Ollama is running with a capable model:

```bash
# Check Ollama status
ollama list

# Pull recommended model if needed
ollama pull llama3

# Or for smaller systems
ollama pull mistral
```

The app automatically detects the available model.

## Environment Variables

No new environment variables required. Existing `.env.local`:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Troubleshooting

### Skill Tree Generation Fails

1. Check Ollama is running: `ollama list`
2. Check logs for LLM errors
3. Try regenerating with feedback: "Simpler breakdown"

### Cards Not Appearing in Study

1. Verify cards are committed (not just generated)
2. Check cards are linked to skill node
3. Verify FSRS state was initialized

### Mastery Not Updating

1. Complete a full study session (don't abandon)
2. Check achievement triggers ran
3. Verify node cardCount > 0

## Next Steps

1. Complete all tasks in [tasks.md](./tasks.md)
2. Run test suite: `npm test`
3. Run E2E tests: `npm run test:e2e`
4. Review performance against success criteria (SC-001 through SC-009)
