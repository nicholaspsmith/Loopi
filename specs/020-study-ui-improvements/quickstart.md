# Quickstart: Study UI Improvements

**Feature**: 020-study-ui-improvements
**Date**: 2026-01-01

## Prerequisites

- Node.js 20+
- PostgreSQL running with memoryloop database
- Environment variables configured (see `.env.example`)

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Testing the Features

### 1. Test Node Highlighting & Study Button

1. Navigate to a learning goal with a skill tree
2. Click on any node in the skill tree
3. Verify:
   - Node and all children are visually highlighted
   - Study button appears showing "Study N cards"
   - If node has 0 cards, button shows "No cards available" (disabled)
4. Click the study button to open card count selector

### 2. Test Card Count Selector

1. After clicking study button, modal appears
2. Verify:
   - Slider shows increments of 5
   - Final option is "All (N)" where N = total cards
   - If total < 5, shows "Study all N cards" directly
3. Select a count and click "Start Study"

### 3. Test Spacebar Card Flip

1. Start a study session with flashcards
2. Press spacebar
3. Verify:
   - Card flips with 3D animation
   - Front content hides, back content shows
   - Animation takes ~600ms
4. Test that spacebar doesn't flip when:
   - Typing in a text input elsewhere
   - Card is already flipped

### 4. Test 3D Flip Animation

1. Watch the flip animation closely
2. Verify:
   - Card rotates around Y-axis (horizontal flip)
   - Both sides are visible during rotation
   - No "see-through" effect (backface hidden)
   - Animation is smooth (60fps)

### 5. Test Multiple Choice Submit Flow

1. Start a study session with multiple choice cards
2. Select an answer
3. Verify:
   - Answer is highlighted (blue) but NOT submitted
   - Submit button becomes enabled
4. Click Submit
5. Verify:
   - Correct answer shows green
   - Wrong answer (if selected) shows red
   - Submit button replaced by Next button
6. Click Next to proceed

### 6. Test Session Summary

1. Complete all cards in a targeted study session
2. Verify:
   - Summary screen appears
   - Shows "Cards completed: X/Y"
   - Shows accuracy percentage
   - Done button returns to skill tree

## Key Files

| File                                      | Purpose                         |
| ----------------------------------------- | ------------------------------- |
| `components/skills/SkillTreeEditor.tsx`   | Node highlighting, study button |
| `components/study/FlashcardMode.tsx`      | Spacebar flip, 3D animation     |
| `components/study/MultipleChoiceMode.tsx` | Submit/Next button flow         |
| `components/study/NodeStudyModal.tsx`     | Card count selector             |
| `components/study/StudySummary.tsx`       | Session completion summary      |

## Running Tests

```bash
# Unit tests
npm test

# E2E tests for this feature
npx playwright test tests/e2e/study-ui.spec.ts

# Run with UI for debugging
npx playwright test tests/e2e/study-ui.spec.ts --ui
```

## Common Issues

### Spacebar not flipping card

- Check browser console for focus events
- Ensure no input elements have focus
- Verify study mode component is mounted

### 3D animation not working

- Check browser support for CSS 3D transforms
- Safari may need `-webkit-` prefixes
- Verify `perspective` is set on parent container

### Cards not filtering to selected node

- Check that `skillNodeId` is set on flashcards
- Verify materialized `path` is correct in skill_nodes
- Check API response includes only relevant cards
