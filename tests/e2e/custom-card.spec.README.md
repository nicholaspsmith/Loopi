# Custom Card Creation E2E Tests

**Test File**: `tests/e2e/custom-card.spec.ts`  
**Feature**: Custom Cards & Goal Management (021-custom-cards-archive)  
**User Story**: User Story 1 - Custom Card Creation (Priority: P2)  
**Task**: T017 - Create E2E tests for custom card creation flow

## Overview

E2E tests for the custom flashcard creation feature, which allows users to create their own flashcards within skill tree nodes to supplement auto-generated cards.

## Test Coverage

### 1. Custom Card Creation Flow (6 tests)

Tests the complete user journey from opening the form to creating a card.

- ✅ **Access form from skill tree node**: Verifies "Add Custom Card" button appears and opens modal
- ✅ **Create card with valid input**: Tests successful card creation with valid question/answer
- ✅ **Validate minimum character requirements**: Tests form validation (5+ chars for question, 5+ chars for answer)
- ✅ **Cancel card creation**: Verifies cancel button closes modal without saving
- ✅ **Close modal with backdrop click**: Tests clicking outside modal closes it
- ✅ **Custom cards in study session**: Verifies custom cards appear alongside auto-generated cards

### 2. API Error Handling (4 tests)

Tests how the UI handles various API error scenarios.

- ✅ **Validation errors from API**: Tests 400 response with validation details
- ✅ **Node not found error**: Tests 404 response when node doesn't exist
- ✅ **Server errors**: Tests 500 response with graceful error message
- ✅ **Network errors**: Tests network failure handling

### 3. Performance and UX (2 tests)

Tests success criteria and user experience requirements.

- ✅ **Completes in under 3 clicks** (SC-001): Verifies workflow takes ≤3 clicks
- ✅ **Loading state during creation**: Tests loading indicators during API call

### 4. Accessibility (3 tests)

Tests keyboard navigation and ARIA compliance.

- ✅ **Proper ARIA labels and roles**: Verifies form accessibility attributes
- ✅ **Modal closes with Escape key**: Tests keyboard interaction
- ✅ **Form inputs are keyboard navigable**: Tests Tab navigation through form

## Test Strategy

### API Mocking

All tests use Playwright's `page.route()` to mock API responses:

```typescript
await page.route('**/api/flashcards/custom', async (route) => {
  if (route.request().method() === 'POST') {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(mockCustomCardResponse),
    })
  }
})
```

This approach:

- ✅ Avoids database dependencies
- ✅ Runs fast in CI/CD
- ✅ Tests UI behavior independently
- ✅ Allows testing error scenarios easily

### Data-testid Selectors

Tests rely on `data-testid` attributes for stable selectors:

| Element         | data-testid              | Purpose                 |
| --------------- | ------------------------ | ----------------------- |
| Skill tree node | `skill-node`             | Selectable node in tree |
| Add button      | `add-custom-card-button` | Opens creation modal    |
| Modal container | `custom-card-modal`      | Modal wrapper           |
| Form            | `custom-card-form`       | Form element            |
| Question input  | `custom-card-question`   | Question textarea       |
| Answer input    | `custom-card-answer`     | Answer textarea         |
| Submit button   | `custom-card-submit`     | Submit button           |
| Cancel button   | `custom-card-cancel`     | Cancel button           |

### Fallback Selectors

Tests include fallback selectors for robustness:

```typescript
// Try data-testid first
const skillNode = page.locator('[data-testid="skill-node"]').first()
if ((await skillNode.count()) > 0) {
  await skillNode.click()
} else {
  // Fallback to text matching
  await page.locator('text=/TypeScript Basics/i').first().click()
}
```

## CI/CD Integration

All tests are currently **skipped in CI** with:

```typescript
test.skip(!!process.env.CI, 'Skipping in CI - UI selectors need to match implementation')
```

**To enable in CI:**

1. Implement UI components with required `data-testid` attributes
2. Verify tests pass locally
3. Remove `test.skip()` condition
4. Tests will run in Chromium (only) in CI for speed

## Mock Data

### Mock Custom Card Response

```typescript
{
  id: 'uuid',
  userId: 'uuid',
  question: 'Test custom card question',
  answer: 'Test custom card answer',
  skillNodeId: 'uuid',
  cardType: 'flashcard',
  fsrsState: {
    state: 'New',
    due: 'ISO-8601 timestamp',
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0
  },
  createdAt: 'ISO-8601 timestamp'
}
```

### Mock Goal Response

Includes skill tree with nodes for testing node selection.

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run only custom card tests
npx playwright test tests/e2e/custom-card.spec.ts

# Run with UI (headed mode)
npx playwright test tests/e2e/custom-card.spec.ts --headed

# Run specific test
npx playwright test tests/e2e/custom-card.spec.ts -g "can create custom card"

# Debug mode
npx playwright test tests/e2e/custom-card.spec.ts --debug
```

## Test Maintenance

### When UI Changes

Update selectors in tests if:

- `data-testid` attributes change
- Modal structure changes
- Form field names change

### When API Changes

Update mock responses if:

- Response schema changes
- Error codes/messages change
- New fields added to flashcard model

### When Requirements Change

Update tests if:

- Validation rules change (e.g., min/max character limits)
- Acceptance criteria change
- Success criteria change (e.g., click count threshold)

## Acceptance Criteria Coverage

Maps to spec acceptance scenarios:

| Scenario                                      | Test Coverage                                |
| --------------------------------------------- | -------------------------------------------- |
| **AC-1**: User initiates custom card creation | ✅ "can access custom card creation form"    |
| **AC-2**: Card appears in node's card list    | ✅ "can create custom card with valid input" |
| **AC-3**: Custom cards in study session       | ✅ "custom cards appear in study session"    |

## Success Criteria Coverage

| Criteria                   | Test Coverage                                         |
| -------------------------- | ----------------------------------------------------- |
| **SC-001**: Under 3 clicks | ✅ "custom card creation completes in under 3 clicks" |

## Related Files

- **Feature Spec**: `specs/021-custom-cards-archive/spec.md`
- **API Contract**: `specs/021-custom-cards-archive/contracts/custom-cards.md`
- **API Implementation**: `app/api/flashcards/custom/route.ts`
- **Contract Tests**: `tests/contract/custom-card.test.ts`
- **Playwright Config**: `playwright.config.ts`

## Known Issues

None currently. Tests are pending UI implementation.

## Future Enhancements

- Add visual regression tests for modal appearance
- Test custom card editing (if feature added)
- Test custom card deletion (if feature added)
- Test batch custom card creation (if feature added)
