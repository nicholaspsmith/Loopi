# Feature Specification: Custom Cards & Goal Management

**Feature Branch**: `021-custom-cards-archive`
**Created**: 2025-12-31
**Status**: Draft
**Input**: Split from 019-streamlined-study (Stories 4, 7)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Custom Card Creation (Priority: P2)

Users can create their own custom flashcards from scratch within a specific tree node to supplement auto-generated cards.

**Why this priority**: Allows users to add personal knowledge and fill gaps in auto-generated content.

**Independent Test**: Can be tested by navigating to a tree node, creating a custom card, and verifying it appears in the node's card list.

**Acceptance Scenarios**:

1. **Given** user views a tree node, **When** user initiates custom card creation, **Then** a form appears to enter question and answer
2. **Given** user submits custom card, **When** card is saved, **Then** card appears in the node's card list alongside auto-generated cards
3. **Given** user creates custom card, **When** studying the node, **Then** custom cards are included in the study session

---

### User Story 2 - Multi-Select Goal Management (Priority: P2)

Users can select multiple goals from the goals page and perform bulk archive or delete operations.

**Why this priority**: Enables efficient goal management without navigating to a separate settings page.

**Independent Test**: Can be tested by selecting goals on the goals page, clicking archive/delete, and verifying confirmation dialog and action completion.

**Acceptance Scenarios**:

1. **Given** user is on the goals page, **When** user clicks a goal's checkbox, **Then** the goal is selected and action buttons appear
2. **Given** one or more goals are selected, **When** user clicks "Archive", **Then** a confirmation dialog appears showing count of goals to archive
3. **Given** user confirms archiving, **When** action completes, **Then** selected goals are archived and removed from the active goals list
4. **Given** one or more goals are selected, **When** user clicks "Delete", **Then** a confirmation dialog appears with a warning about permanent deletion
5. **Given** user confirms deletion, **When** action completes, **Then** selected goals are permanently deleted
6. **Given** user has selected goals, **When** user clicks outside selection or presses Escape, **Then** selection is cleared
7. **Given** user views archived goals and has fewer than 6 active goals, **When** user clicks "Restore" on an archived goal, **Then** the goal is moved back to active status
8. **Given** user has 6 active goals, **When** user tries to restore an archived goal, **Then** system shows error "Maximum 6 active goals reached. Archive or delete a goal first."

---

### User Story 3 - Goal Limits Enforcement (Priority: P1)

Users are limited in the number of goals they can have to encourage focus and prevent overwhelm.

**Why this priority**: Critical for system health and user experience - prevents goal sprawl.

**Independent Test**: Can be tested by attempting to create goals beyond limits and verifying appropriate error messages.

**Acceptance Scenarios**:

1. **Given** user has 6 active goals, **When** user tries to create a new goal, **Then** system shows error "Maximum 6 active goals reached. Archive or delete a goal to create a new one."
2. **Given** user has 6 archived goals, **When** user tries to archive another goal, **Then** system shows error "Maximum 6 archived goals reached. Delete an archived goal first."
3. **Given** user has 12 total goals, **When** user tries to create or archive a goal, **Then** system shows error "Maximum 12 total goals reached. Delete a goal to continue."
4. **Given** user is at any limit, **When** viewing the goals page, **Then** a subtle indicator shows current count vs limit (e.g., "4/6 active goals")

---

### Edge Cases

- What if user tries to create a custom card with empty question/answer? (Form validation prevents submission)
- What happens when archiving a goal with active study session? (Session ends, goal archived)
- Can archived goals be restored? (Yes, if user has fewer than 6 active goals)
- What if user selects goals and then navigates away? (Selection is cleared)
- What if bulk operation partially fails? (Transaction rollback, show error, no partial changes)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to create custom flashcards within any tree node
- **FR-002**: Goals page MUST support multi-select with checkboxes
- **FR-003**: System MUST provide bulk archive and delete operations on goals page
- **FR-004**: System MUST show confirmation dialog before archive/delete operations
- **FR-005**: System MUST enforce maximum 6 active goals per user
- **FR-006**: System MUST enforce maximum 6 archived goals per user
- **FR-007**: System MUST enforce maximum 12 total goals per user
- **FR-008**: System MUST display current goal counts vs limits on goals page
- **FR-009**: Users MUST be able to restore archived goals to active status when active count < 6

### Key Entities

- **Custom Flashcard**: User-created question/answer pair within a tree node
- **Goal Limits**: Hard caps on active (6), archived (6), and total (12) goals per user

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Custom card creation completes in under 3 clicks from tree node view
- **SC-002**: Bulk operations complete within 2 seconds for up to 12 goals
- **SC-003**: Goal limit enforcement prevents exceeding caps with 100% reliability
