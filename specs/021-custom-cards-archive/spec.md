# Feature Specification: Custom Cards & Archive Settings

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

### User Story 2 - Archive Goals from Settings (Priority: P3)

Archive functionality moves from goal page to a dedicated settings section where users can bulk-archive goals.

**Why this priority**: Declutters goal page while preserving archive functionality in a more appropriate location.

**Independent Test**: Can be tested by navigating to settings, selecting multiple goals, archiving them, and verifying confirmation dialog appears.

**Acceptance Scenarios**:

1. **Given** user navigates to settings/goals section, **When** viewing goals list, **Then** user can select one or more goals
2. **Given** one or more goals are selected, **When** user clicks "Archive", **Then** a confirmation dialog appears
3. **Given** user confirms archiving, **When** action completes, **Then** selected goals are archived and removed from active list
4. **Given** user is on goal page, **When** viewing goal details, **Then** no archive button is visible

---

### Edge Cases

- What if user tries to create a custom card with empty question/answer? (Form validation prevents submission)
- What happens when archiving a goal with active study session? (Session ends, goal archived)
- Can archived goals be restored? (Out of scope for this spec - consider future feature)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to create custom flashcards within any tree node
- **FR-002**: System MUST remove archive button from goal page
- **FR-003**: System MUST provide bulk archive functionality in settings
- **FR-004**: System MUST show confirmation dialog before archiving goals

### Key Entities

- **Custom Flashcard**: User-created question/answer pair within a tree node
- **Goal Archive**: Mechanism to remove goals from active list without deletion

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Custom card creation completes in under 3 clicks from tree node view
- **SC-002**: Bulk archive operation handles 50+ goals without performance degradation
