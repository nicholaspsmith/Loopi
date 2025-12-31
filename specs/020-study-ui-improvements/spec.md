# Feature Specification: Study UI Improvements

**Feature Branch**: `020-study-ui-improvements`
**Created**: 2025-12-31
**Status**: Draft
**Input**: Split from 019-streamlined-study (Stories 3, 5, 6)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Study Individual Node with Children (Priority: P2)

Users can study a specific node and its children by highlighting a node and clicking a study button, with control over how many cards to study.

**Why this priority**: Enables targeted studying for users who want to focus on specific topics rather than following the sequential flow.

**Independent Test**: Can be tested by highlighting a node with children, clicking study button, selecting card count, and verifying only relevant cards are presented.

**Acceptance Scenarios**:

1. **Given** user highlights a skill tree node, **When** node is highlighted, **Then** all child nodes are also highlighted
2. **Given** node is highlighted, **When** user views the node, **Then** a study button appears on the right side of the node, next to the percent complete text
3. **Given** user clicks the study button, **When** study modal appears, **Then** user can select card count (5 to N in increments of 5, where N = total cards in node + children)
4. **Given** user selects card count and confirms, **When** study mode begins, **Then** only cards from the highlighted node and its children are included

---

### User Story 2 - Fix Card Flip Interactions (Priority: P2)

The flashcard flip functionality must work correctly: space bar flips the card and 3D flip animation displays properly.

**Why this priority**: Core study experience is broken without working card interactions.

**Independent Test**: Can be tested by entering study mode and pressing spacebar to verify card flips with 3D animation.

**Acceptance Scenarios**:

1. **Given** user is viewing a flashcard, **When** user presses spacebar, **Then** card flips to reveal the answer with 3D animation
2. **Given** flashcard is displayed, **When** flip occurs, **Then** 3D perspective effect is visible during the animation

---

### User Story 3 - Multiple Choice Submit Button (Priority: P2)

Multiple choice questions require explicit submission rather than auto-submitting on selection.

**Why this priority**: Prevents accidental answer submission and gives users time to reconsider.

**Independent Test**: Can be tested by answering a multiple choice question, verifying selection doesn't auto-submit, then clicking submit.

**Acceptance Scenarios**:

1. **Given** user is presented with multiple choice question, **When** user selects an answer, **Then** answer is highlighted but not submitted
2. **Given** answer is selected, **When** user views the interface, **Then** a "Submit" button is visible
3. **Given** user clicks "Submit", **When** answer is evaluated, **Then** feedback is displayed (correct/incorrect)

---

### Edge Cases

- How does card count selection work if total cards < 5? (Minimum is actual card count if less than 5)
- What happens if user clicks spacebar while typing in another input? (Spacebar only flips card when not in text input)
- What happens if user rapidly clicks submit multiple times? (Button disables after first click)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST highlight child nodes when parent node is highlighted
- **FR-002**: System MUST display a study button when a node is highlighted
- **FR-003**: System MUST allow users to select study card count in increments of 5
- **FR-004**: System MUST filter study cards to only highlighted node and children
- **FR-005**: System MUST respond to spacebar press by flipping the displayed flashcard
- **FR-006**: System MUST display 3D flip animation when card is flipped
- **FR-007**: System MUST require explicit submit button click for multiple choice answers

### Key Entities

- **Tree Node**: Skill tree node that can be highlighted for targeted study
- **Card Selection**: User's choice of how many cards to study (increments of 5)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Card flip interaction responds within 100ms of spacebar press
- **SC-002**: Users can highlight any node and begin targeted study in under 3 clicks
- **SC-003**: Multiple choice answers are never auto-submitted (0% accidental submissions)
