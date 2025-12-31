# Research: Study UI Improvements

**Feature**: 020-study-ui-improvements
**Date**: 2025-12-31

## Research Topics

### 1. Card Count Selector UX

**Decision**: Slider with increment of 5, range from 5 to total cards (rounded to nearest 5)

**Rationale**:

- Spec requires "5 to N in increments of 5"
- Slider is more intuitive than dropdown for ranges
- Round total up to nearest 5 for clean increments

**Edge Cases**:

- Total cards < 5: Show all cards, no selector
- Total cards = 5: Show "Study all 5 cards" without selector
- Node + children have 0 cards: Disable study button, show "No cards available"

### 2. Spacebar Flip Fix

**Decision**: Add global keydown listener with proper focus management

**Rationale**:

- Current implementation may be losing focus to other elements
- Need to ensure study card component has focus when visible
- Spacebar should only flip when in study mode (not when typing in other inputs)

**Implementation**:

```typescript
// In FlashcardMode.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !isInputFocused) {
      e.preventDefault()
      handleFlip()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [handleFlip])
```

### 3. 3D Flip Animation Fix

**Decision**: Use CSS `transform-style: preserve-3d` with proper backface visibility

**Rationale**:

- 3D card flip requires parent with `perspective` property
- Both faces need `backface-visibility: hidden`
- Rotation should be around Y-axis for horizontal flip

**CSS Requirements**:

```css
.card-container {
  perspective: 1000px;
}
.card {
  transform-style: preserve-3d;
  transition: transform 0.6s;
}
.card.flipped {
  transform: rotateY(180deg);
}
.card-face {
  backface-visibility: hidden;
}
.card-back {
  transform: rotateY(180deg);
}
```

### 4. Multiple Choice Submit Flow

**Decision**: Two-step selection → submission with visual feedback

**Rationale**:

- User selects answer (highlighted, not submitted)
- Submit button becomes enabled after selection
- On submit: evaluate, show correct/incorrect, update FSRS
- Matches common quiz patterns and prevents accidental submissions

**States**:

1. Initial: All options neutral, submit disabled
2. Selected: One option highlighted (blue border), submit enabled
3. Submitted: Selected option shows green (correct) or red (incorrect), correct answer always green

## Dependencies

| Dependency    | Version      | Usage                                     |
| ------------- | ------------ | ----------------------------------------- |
| framer-motion | (if present) | 3D flip animations, or use CSS transforms |
| drizzle-orm   | 0.45.1       | Database queries for node cards           |

## Integration Points

1. **Node Highlighting → Child Selection**
   - Modify `SkillTreeEditor.tsx` to track highlighted node
   - When node selected, recursively highlight all descendants

2. **FlashcardMode.tsx**
   - Add proper keyboard event handling
   - Fix 3D CSS transform properties

3. **MultipleChoiceMode.tsx**
   - Add explicit submit button
   - Separate selection state from submission state
