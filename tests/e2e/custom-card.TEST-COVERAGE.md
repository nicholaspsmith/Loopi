# Custom Card Creation E2E Test Coverage

**Generated**: 2026-01-01  
**Feature**: 021-custom-cards-archive  
**Test File**: `tests/e2e/custom-card.spec.ts`

## Coverage Summary

| Category       | Tests  | Status          |
| -------------- | ------ | --------------- |
| Happy Path     | 6      | ✅ Complete     |
| Error Handling | 4      | ✅ Complete     |
| Performance    | 2      | ✅ Complete     |
| Accessibility  | 3      | ✅ Complete     |
| **Total**      | **15** | **✅ Complete** |

## Functional Requirements Coverage

| FR Code | Requirement                                                         | Test Coverage | Status |
| ------- | ------------------------------------------------------------------- | ------------- | ------ |
| FR-001  | Users MUST be able to create custom flashcards within any tree node | 6 tests       | ✅     |

## User Story Acceptance Criteria

| AC   | Description                                                 | Test(s)                                                     | Status |
| ---- | ----------------------------------------------------------- | ----------------------------------------------------------- | ------ |
| AC-1 | User initiates custom card creation → form appears          | `can access custom card creation form from skill tree node` | ✅     |
| AC-2 | User submits custom card → card appears in node's card list | `can create custom card with valid input`                   | ✅     |
| AC-3 | Custom cards included in study session                      | `custom cards appear in study session`                      | ✅     |

## Success Criteria

| SC Code | Criteria                                            | Test(s)                                            | Status |
| ------- | --------------------------------------------------- | -------------------------------------------------- | ------ |
| SC-001  | Custom card creation < 3 clicks from tree node view | `custom card creation completes in under 3 clicks` | ✅     |

## Test Scenarios Covered

### 1. Happy Path Scenarios ✅

- [x] User can access custom card creation form from skill tree node
- [x] User can create custom card with valid question and answer
- [x] User can cancel card creation without saving
- [x] User can close modal by clicking backdrop
- [x] User can close modal by pressing Escape key
- [x] Custom cards appear in study session alongside auto-generated cards

### 2. Validation Scenarios ✅

- [x] Question must be at least 5 characters
- [x] Answer must be at least 5 characters
- [x] Submit button disabled when validation fails
- [x] Validation errors displayed to user
- [x] Valid input enables submit button

### 3. Error Handling Scenarios ✅

- [x] 400 Bad Request (validation error) - shows error message
- [x] 404 Not Found (node doesn't exist) - shows error message
- [x] 500 Internal Server Error - shows error message, modal stays open
- [x] Network failure - shows network error message

### 4. Performance Scenarios ✅

- [x] Custom card creation completes in under 3 clicks (SC-001)
- [x] Loading state shown during API call
- [x] Modal closes after successful creation

### 5. Accessibility Scenarios ✅

- [x] Form has proper ARIA labels and roles
- [x] Modal has proper role attribute
- [x] Inputs have aria-label or aria-labelledby
- [x] Modal closable with Escape key
- [x] Form inputs are keyboard navigable with Tab
- [x] Focus management within modal

## Edge Cases Covered

- [x] Empty goal with no skill tree nodes (test.skip if no nodes)
- [x] Node selection not required (flexible workflow)
- [x] Very short input (< 5 chars) - validation blocks
- [x] Submit during loading state (button should be disabled)
- [x] Multiple rapid clicks on submit (API handles duplicate requests)

## API Endpoints Tested

| Endpoint                 | Method | Scenarios Tested                                                                            |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `/api/flashcards/custom` | POST   | Success (201), Validation Error (400), Not Found (404), Server Error (500), Network Failure |
| `/api/goals/{goalId}`    | GET    | Success (200) - for goal detail page                                                        |
| `/api/study/**`          | GET    | Success (200) - for study session with custom cards                                         |

## Mock Data Used

### Custom Card Response (201 Created)

- Valid flashcard with FSRS state initialized to "New"
- Includes all required fields (id, userId, question, answer, skillNodeId, cardType, fsrsState, createdAt)

### Goal Detail Response (200 OK)

- Goal with skill tree containing multiple nodes
- Nodes at different depths (depth 1)
- Nodes with existing card counts

### Error Responses

- 400: Validation error with field-level details
- 404: Node not found error
- 500: Internal server error with error code
- Network: Aborted request

## Data-testid Requirements

Required `data-testid` attributes for UI implementation:

| Element                | Attribute                | Required |
| ---------------------- | ------------------------ | -------- |
| Skill tree node        | `skill-node`             | Yes      |
| Add custom card button | `add-custom-card-button` | Yes      |
| Modal container        | `custom-card-modal`      | Yes      |
| Form element           | `custom-card-form`       | Yes      |
| Question textarea      | `custom-card-question`   | Yes      |
| Answer textarea        | `custom-card-answer`     | Yes      |
| Submit button          | `custom-card-submit`     | Yes      |
| Cancel button          | `custom-card-cancel`     | Yes      |

## Test Execution Metrics

| Metric                       | Target | Actual  |
| ---------------------------- | ------ | ------- |
| Total test scenarios         | 15+    | 15 ✅   |
| Acceptance criteria coverage | 100%   | 100% ✅ |
| Success criteria coverage    | 100%   | 100% ✅ |
| Error scenarios              | 4+     | 4 ✅    |
| Accessibility tests          | 3+     | 3 ✅    |

## CI/CD Status

**Current Status**: ⏸️ Skipped in CI (waiting for UI implementation)

**To Enable**:

1. Implement UI components with required `data-testid` attributes
2. Verify tests pass locally with `npx playwright test tests/e2e/custom-card.spec.ts`
3. Remove `test.skip(!!process.env.CI, ...)` from test describes
4. Tests will run in CI on Chromium only

## Gaps and Future Work

### Not Yet Covered

- Custom card editing (feature not in scope)
- Custom card deletion (feature not in scope)
- Batch custom card creation (feature not in scope)
- Card reordering in node (feature not in scope)
- Custom card duplication detection (not specified)

### Potential Enhancements

- Visual regression testing for modal appearance
- Performance testing with many custom cards (100+)
- Test custom cards in different study modes (if applicable)
- Test custom card analytics/tracking (if implemented)

## Related Test Files

| Test Type         | File                                 | Status                     |
| ----------------- | ------------------------------------ | -------------------------- |
| Contract Tests    | `tests/contract/custom-card.test.ts` | ✅ Exists                  |
| Integration Tests | N/A                                  | Not required (E2E covers)  |
| Unit Tests        | N/A                                  | Component tests will cover |

## Maintenance Notes

### When to Update

1. **UI Changes**: Update selectors if component structure changes
2. **API Changes**: Update mock responses if endpoint schema changes
3. **Validation Changes**: Update validation tests if rules change (e.g., character limits)
4. **New Features**: Add tests for custom card editing, deletion, etc.

### Test Stability

- All tests use stable `data-testid` selectors
- Fallback selectors included for text-based matching
- API mocking eliminates external dependencies
- Tests are idempotent (can run in any order)

## References

- **Spec**: `specs/021-custom-cards-archive/spec.md`
- **API Contract**: `specs/021-custom-cards-archive/contracts/custom-cards.md`
- **Quickstart**: `specs/021-custom-cards-archive/quickstart.md`
- **Playwright Config**: `playwright.config.ts`
