# Goal Limits E2E Test Implementation Guide

## Quick Start

The test file `/tests/e2e/goal-limits.spec.ts` is complete and ready to run. However, tests are currently **skipped in CI** until the UI implementation matches the test selectors.

## Prerequisites for Enabling Tests

Before removing `test.skip()` from the tests, ensure these components are implemented:

### 1. GoalLimitIndicator Component

**File**: `/components/goals/GoalLimitIndicator.tsx`

**Required Props**:

```typescript
interface GoalLimitIndicatorProps {
  counts: {
    active: number
    archived: number
    total: number
  }
}
```

**Required DOM Structure**:

- Container with `role="status"`
- Container with `aria-label` describing counts (e.g., "4 of 6 active goals, 2 of 6 archived goals")
- Text displaying "X/6 active" and "Y/6 archived"
- Visual state changes:
  - Normal (< 5): gray styling
  - Warning (= 5): yellow/warning styling
  - Error (≥ 6): red/error styling
- Tooltip with `role="tooltip"` on hover/focus

**Status**: ✓ Already implemented

### 2. Goals Page Integration

**File**: `/app/(protected)/goals/page.tsx`

**Required**:

- GoalLimitIndicator component rendered on page
- Counts fetched via `getGoalCounts(userId)`
- "New Goal" button with `href="/goals/new"` or matching text

**Status**: ✓ Already implemented

### 3. Goal Creation Form Error Handling

**File**: `/app/(protected)/goals/new/page.tsx` (or client component)

**Required**:

- Handle 422 responses from POST /api/goals
- Display error message from response.error
- Error message must be visible and styled (red background/text)
- Error must persist (not auto-dismiss)
- Consider using `role="alert"` for accessibility

**Current Status**: ⚠️ Needs implementation

**Example Implementation**:

```typescript
const [error, setError] = useState<string | null>(null)

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setError(null)

  const response = await fetch('/api/goals', {
    method: 'POST',
    body: JSON.stringify({ title, generateTree: true }),
  })

  if (!response.ok) {
    const data = await response.json()
    setError(data.error) // Display limit error
    return
  }

  // Success flow...
}

// In JSX:
{error && (
  <div
    role="alert"
    className="bg-red-50 text-red-700 p-4 rounded-lg"
  >
    {error}
  </div>
)}
```

## Enabling Tests

Once all prerequisites are met:

1. Remove skip conditions from test file:

   ```typescript
   // Before:
   test.skip(!!process.env.CI, 'Selectors need to be updated to match current UI')

   // After:
   // (remove the line entirely)
   ```

2. Run tests locally to verify:

   ```bash
   npx playwright test tests/e2e/goal-limits.spec.ts
   ```

3. Fix any selector mismatches

4. Enable in CI

## Troubleshooting

### Test: "displays indicator with correct format"

**Issue**: Indicator not found  
**Fix**: Ensure GoalLimitIndicator has `role="status"` and contains text matching `/\d+\/6\s+active/`

### Test: "shows tooltip on hover"

**Issue**: Tooltip not appearing  
**Fix**: Ensure tooltip has `role="tooltip"` and appears on both `mouseenter` and `focus` events

### Test: "shows error when submitting goal at active limit"

**Issue**: Error not displayed  
**Fix**: Implement error handling in goal creation form (see Prerequisites #3)

### Test: "error message is clearly visible"

**Issue**: Error found but styling not detected  
**Fix**: Add visual error styling with classes like `bg-red-50`, `text-red-600`, or use `role="alert"`

## Test Data Strategy

Tests use **mocked API responses** to avoid database dependencies:

```typescript
// Create goals page with 3 active, 1 archived
await mockGoalsAPI(page, 3, 1)

// Simulate limit error
await mockGoalCreationWithError(
  page,
  'ACTIVE_LIMIT_EXCEEDED',
  'Maximum 6 active goals reached. Archive or delete a goal to create a new one.'
)
```

This means tests will work even with empty database state.

## Next Steps

1. Implement error handling in goal creation form
2. Test manually with actual limit scenarios
3. Remove `test.skip()` conditions
4. Run full test suite: `npx playwright test tests/e2e/goal-limits.spec.ts`
5. Add to CI pipeline

## Related Documentation

- [Spec: 021-custom-cards-archive](/specs/021-custom-cards-archive/spec.md)
- [Test Coverage Doc](./goal-limits.test-coverage.md)
- [Contract Tests](/tests/contract/goal-limits.test.ts)
