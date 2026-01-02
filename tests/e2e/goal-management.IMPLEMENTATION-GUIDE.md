# Goal Management E2E Tests - Implementation Guide

## Quick Start

The E2E tests are already written and ready to use. They're currently skipped in CI but can be run locally during development.

### Running Tests Locally

```bash
# Run all goal-management tests
npx playwright test goal-management

# Run with UI mode (recommended for development)
npx playwright test goal-management --ui

# Run specific test group
npx playwright test goal-management -g "Multi-Select Archive"

# Debug a failing test
npx playwright test goal-management -g "can enter selection mode" --debug
```

## Test Structure

### 32 Tests Across 5 Categories

1. **T031 - Multi-Select Archive Flow** (9 tests)
   - Selection mode entry/exit
   - Multi-select functionality
   - Archive confirmation workflow
   - Tab switching

2. **T032 - Multi-Select Delete Flow** (6 tests)
   - Delete confirmation with warnings
   - Success/error handling
   - Cross-tab functionality

3. **T033 - Goal Restore Flow** (8 tests)
   - Restore button states
   - Limit enforcement
   - Loading states
   - Selection mode interaction

4. **UI State and Interactions** (6 tests)
   - Tab switching behavior
   - Toast notifications
   - Card click behavior
   - Loading state protection

5. **Accessibility** (3 tests)
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

## Enabling Tests in CI

Once the UI is fully implemented, enable CI tests by removing the skip:

```typescript
// BEFORE:
test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

// AFTER:
// Just remove the line entirely
```

## Test Data

All tests use API mocking with these helpers:

```typescript
// Mock X active goals and Y archived goals
await mockGoalsListAPI(page, 3, 2) // 3 active, 2 archived

// Mock successful archive operation
await mockBulkArchiveAPI(page, true)

// Mock failed delete operation
await mockBulkDeleteAPI(page, false)

// Mock restore at limit
await mockRestoreAPI(page, false)
```

## Key Test IDs

Ensure your UI components use these data-testid attributes:

### Goals Page

- `goals-content` - Main container
- `goals-tab-active` - Active tab button
- `goals-tab-archived` - Archived tab button
- `selection-toggle` - Select/Cancel button

### Goal Cards

- `goal-card-{goalId}` - Individual cards
- `goal-checkbox-{goalId}` - Selection checkboxes
- `restore-button-{goalId}` - Restore button (archived only)

### Action Bar

- `goal-action-bar` - Floating bar container
- `archive-selected` - Archive button
- `delete-selected` - Delete button
- `clear-selection` - Clear (X) button
- `selected-count` - Selection count text

### Confirmation Dialog

- `confirm-dialog` - Dialog container
- `confirm-dialog-backdrop` - Backdrop with role="dialog"
- `confirm-dialog-title` - Title text
- `confirm-dialog-message` - Message text
- `confirm-dialog-confirm` - Confirm button
- `confirm-dialog-cancel` - Cancel button

### Toast

- `toast-message` - Toast container

## Common Issues and Solutions

### Issue: Tests fail with "element not visible"

**Solution**: Check timeout values and network idle state

```typescript
await page.waitForLoadState('networkidle')
await expect(element).toBeVisible({ timeout: 5000 })
```

### Issue: API mocks not working

**Solution**: Ensure route is set up before navigation

```typescript
// CORRECT ORDER:
await mockGoalsListAPI(page, 3, 1)
await page.goto('/goals')

// WRONG:
await page.goto('/goals')
await mockGoalsListAPI(page, 3, 1) // Too late!
```

### Issue: Selection not clearing on tab switch

**Solution**: Add useEffect in GoalsPageContent:

```typescript
useEffect(() => {
  setSelectedGoalIds(new Set())
  setSelectionMode(false)
}, [activeTab])
```

### Issue: Escape key not working

**Solution**: Ensure keyboard listener is attached:

```typescript
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedGoalIds.size > 0) {
      setSelectedGoalIds(new Set())
      setSelectionMode(false)
    }
  }
  document.addEventListener('keydown', handleEscape)
  return () => document.removeEventListener('keydown', handleEscape)
}, [selectedGoalIds.size])
```

## Test Coverage Verification

Run this to see coverage:

```bash
npx playwright test goal-management --list
```

Should show:

- 9 tests for archive flow
- 6 tests for delete flow
- 8 tests for restore flow
- 6 tests for UI interactions
- 3 tests for accessibility

Total: 32 tests

## Debugging Tips

### 1. Use UI Mode

```bash
npx playwright test goal-management --ui
```

Benefits:

- Step through each action
- See network requests
- Inspect element locators
- View screenshots

### 2. Add Console Logs

Tests already include networkidle waits, but you can add:

```typescript
await page.waitForLoadState('networkidle')
console.log('Current URL:', page.url())
console.log('Action bar visible:', await actionBar.isVisible())
```

### 3. Take Screenshots

```typescript
await page.screenshot({ path: 'debug-screenshot.png' })
```

### 4. Slow Down Actions

```typescript
// In playwright.config.ts
use: {
  launchOptions: {
    slowMo: 1000 // Wait 1s between actions
  }
}
```

## API Contract Requirements

Tests expect these endpoints to exist:

### POST /api/goals/archive

```typescript
// Request
{ goalIds: string[] }

// Success Response (200)
{ archived: number, goalIds: string[] }

// Error Response (422)
{ error: string, code: 'ARCHIVED_LIMIT_EXCEEDED' }
```

### DELETE /api/goals/delete

```typescript
// Request
{ goalIds: string[] }

// Success Response (200)
{ deleted: number, goalIds: string[] }

// Error Response (500)
{ error: string }
```

### POST /api/goals/restore

```typescript
// Request
{ goalId: string }

// Success Response (200)
{ goal: Goal }

// Error Response (422)
{
  error: 'Maximum 6 active goals reached',
  code: 'ACTIVE_LIMIT_EXCEEDED'
}
```

## Next Steps

1. **Implement UI components** with the test IDs listed above
2. **Run tests locally** to verify implementation
3. **Fix any failing tests** using the debugging tips
4. **Enable CI tests** by removing test.skip lines
5. **Add to PR** and verify tests pass in CI

## Reference Files

- Implementation: `components/goals/GoalsPageContent.tsx`
- API Routes: `app/api/goals/archive/route.ts`, etc.
- Contracts: `specs/021-custom-cards-archive/contracts/*.md`
- Test File: `tests/e2e/goal-management.spec.ts`
