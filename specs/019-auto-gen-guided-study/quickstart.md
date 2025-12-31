# Quickstart: Auto-Generation & Guided Study Flow

**Feature**: 019-auto-gen-guided-study
**Date**: 2025-12-31

## Prerequisites

- Node.js 20+
- PostgreSQL running with memoryloop database
- Anthropic API key configured

## Quick Test Steps

### 1. Auto-Generation Test

```bash
# Create a goal and verify cards are auto-generated
npm run dev

# In browser:
# 1. Log in
# 2. Create new goal: "Learn TypeScript Basics"
# 3. Wait for skill tree generation (watch for progress indicator)
# 4. Check any node - should have 5 cards without manual generation
```

### 2. Guided Study Test

```bash
# Test the Study Now button and sequential flow
# 1. Navigate to goal page
# 2. Click green "Study Now" button with play icon
# 3. Complete cards in first node (rate all as "Good" or "Easy")
# 4. Should see "Continue to next node" option
# 5. Click Continue - should load next node's cards
# 6. Click "Return to goal page" - should return
# 7. Click "Study Now" again - should resume from where you left off
```

### 3. Tree Completion Test

```bash
# Test completion state
# 1. Complete all cards in all nodes (rate as Good/Easy to fast-track to Review state)
# 2. Navigate to goal page
# 3. Click "Study Now"
# 4. Should see "Tree Complete" message instead of study session
```

## Key File Locations

| Component             | File                                                  |
| --------------------- | ----------------------------------------------------- |
| Study Now Button      | `components/goals/StudyNowButton.tsx`                 |
| Guided Flow Logic     | `lib/study/guided-flow.ts`                            |
| Node Completion Check | `lib/study/node-completion.ts`                        |
| Next Node API         | `app/api/study/next-node/route.ts`                    |
| Progress API          | `app/api/goals/[goalId]/skill-tree/progress/route.ts` |
| Skill Tree Job        | `lib/jobs/handlers/skill-tree-job.ts`                 |
| Flashcard Job         | `lib/jobs/handlers/flashcard-job.ts`                  |

## Database Verification

```sql
-- Check auto-generated cards linked to nodes
SELECT sn.title, COUNT(f.id) as card_count
FROM skill_nodes sn
LEFT JOIN flashcards f ON f.skill_node_id = sn.id
WHERE sn.tree_id = 'your-tree-id'
GROUP BY sn.id, sn.title
ORDER BY sn.path;

-- Check node completion status
SELECT
  sn.title,
  sn.path,
  COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) as completed,
  COUNT(f.id) as total
FROM skill_nodes sn
LEFT JOIN flashcards f ON f.skill_node_id = sn.id
WHERE sn.tree_id = 'your-tree-id'
GROUP BY sn.id
ORDER BY sn.path;

-- Find first incomplete node
WITH node_completion AS (
  SELECT
    sn.id,
    sn.path,
    sn.title,
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) as completed_cards
  FROM skill_nodes sn
  LEFT JOIN flashcards f ON f.skill_node_id = sn.id
  WHERE sn.tree_id = 'your-tree-id'
  GROUP BY sn.id, sn.path, sn.title
)
SELECT * FROM node_completion
WHERE total_cards > 0 AND completed_cards < total_cards
ORDER BY path ASC
LIMIT 1;
```

## Common Issues

| Issue                     | Solution                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| Cards not generating      | Check job queue, verify API key, check `lib/jobs/handlers/skill-tree-job.ts` |
| Study Now not appearing   | Verify goal has skill tree, check component import                           |
| Wrong node order          | Verify path ordering in database query                                       |
| Node not marking complete | Check FSRS state >= 2 for all cards in node                                  |
| Infinite loading          | Check `/api/study/next-node` response, verify goal ownership                 |

## API Testing

```bash
# Get next incomplete node
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/study/next-node?goalId={goalId}"

# Get tree progress
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/goals/{goalId}/skill-tree/progress"

# Start guided study session
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"goalId": "{goalId}", "mode": "guided"}' \
  "http://localhost:3000/api/study/session"
```
