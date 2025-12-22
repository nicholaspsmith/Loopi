# Feature Specification: Flashcard Rating Labels Update

**Feature Branch**: `003-flashcard-rating-labels`
**Created**: 2025-12-22
**Status**: Draft
**Input**: User description: "Wording on flash cards should make grammatical sense. How well did you know this? should be 'How hard was this question?' and the options should be 'Very hard' 'Hard' 'Easy' and 'Very Easy'"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Improved Rating Experience (Priority: P1)

As a user reviewing flashcards, I want the rating question and answer options to use clear, grammatically sensible language so that I can quickly and intuitively rate how difficult the question was for me.

**Why this priority**: This is the core and only feature - updating the rating labels affects every flashcard review interaction and directly impacts user experience.

**Independent Test**: Can be fully tested by reviewing any flashcard and verifying the updated question text and button labels display correctly.

**Acceptance Scenarios**:

1. **Given** a user is viewing a flashcard answer, **When** the rating buttons are displayed, **Then** the prompt reads "How hard was this question?"
2. **Given** a user is viewing the rating options, **When** they look at the difficulty buttons, **Then** the four options are labeled "Very hard", "Hard", "Easy", and "Very Easy" (in that order, from most difficult to easiest)
3. **Given** a user selects any rating option, **When** they click the button, **Then** the corresponding FSRS rating value is submitted (1=Very hard, 2=Hard, 3=Easy, 4=Very Easy)

---

### Edge Cases

- Screen readers should announce the updated labels correctly with appropriate context
- The undo functionality toast should display the new label names (e.g., "Rated card as Very Easy")

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display "How hard was this question?" as the rating prompt text
- **FR-002**: System MUST display rating button labels as "Very hard", "Hard", "Easy", and "Very Easy" in order from most difficult (rating 1) to easiest (rating 4)
- **FR-003**: Rating buttons MUST maintain their existing color coding (red for Very hard, orange for Hard, green for Easy, blue for Very Easy)
- **FR-004**: Accessibility labels MUST be updated to reflect the new terminology
- **FR-005**: Undo toast notification MUST display the new label names when showing which rating was applied

### Assumptions

- The FSRS rating values (1-4) remain unchanged; only the user-facing labels change
- Button order remains the same (left-to-right: 1, 2, 3, 4)
- Color associations remain the same (red=hardest, blue=easiest)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All four rating buttons display the new label text correctly
- **SC-002**: The rating prompt displays "How hard was this question?"
- **SC-003**: Screen reader announces appropriate context using new terminology
- **SC-004**: Undo functionality displays correct new label names
- **SC-005**: All existing flashcard rating tests pass with updated label expectations
