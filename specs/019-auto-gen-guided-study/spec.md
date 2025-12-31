# Feature Specification: Auto-Generation & Guided Study Flow

**Feature Branch**: `019-auto-gen-guided-study`
**Created**: 2025-12-31
**Status**: Draft
**Input**: Split from 019-streamlined-study (Stories 1-2)

## Clarifications

### Session 2025-12-31

- Q: When is a tree node considered "complete" for guided study progression? → A: Node complete when all cards reach FSRS "review" state (passed initial learning)
- Q: What order should guided study traverse the skill tree? → A: Depth-first (complete all children of a node before moving to siblings)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Card Generation on Skill Tree Creation (Priority: P1)

When a skill tree is generated for a learning goal, flashcards are automatically created for each node without requiring user approval. This removes friction from the learning process and gets users studying immediately.

**Why this priority**: Core feature that enables the streamlined study flow. Without automatic card generation, users must manually trigger card creation for each node, creating unnecessary friction.

**Independent Test**: Can be tested by creating a new learning goal, verifying skill tree generates, and confirming cards are automatically created and visible in each node.

**Acceptance Scenarios**:

1. **Given** a user creates a new learning goal, **When** the skill tree is generated, **Then** flashcards are automatically generated for each tree node without user intervention
2. **Given** free tier user creates a goal, **When** cards are auto-generated, **Then** each tree node receives exactly 5 flashcards
3. **Given** cards are auto-generated, **When** user views a tree node, **Then** the generated cards are immediately available for study

---

### User Story 2 - Guided Sequential Study Flow (Priority: P1)

Users click a "Study Now" button to enter a guided study mode that walks them through the skill tree sequentially, starting from the first incomplete node and progressing through the tree.

**Why this priority**: Primary user interaction for learning. The guided flow ensures users study in the correct order and can continue where they left off.

**Independent Test**: Can be tested by clicking Study Now, completing a quiz on first node, choosing to continue, and verifying progression to next node.

**Acceptance Scenarios**:

1. **Given** user is on goal page with incomplete nodes, **When** user clicks "Study Now" (green button with play icon), **Then** user enters study mode on the first incomplete tree node
2. **Given** user completes a quiz on a tree node, **When** quiz ends, **Then** user sees options to "Continue to next node" or "Return to goal page"
3. **Given** user chooses "Continue", **When** next node has cards, **Then** user begins studying the next node immediately
4. **Given** user returns to goal page mid-study, **When** user clicks "Study Now" again, **Then** study resumes from the next incomplete node
5. **Given** all tree nodes are complete, **When** user clicks "Study Now", **Then** system indicates the skill tree is complete

---

### Edge Cases

- What happens when a tree node has no suitable content for flashcard generation? (System generates fewer cards or notifies user)
- How does system handle study progression when a node is deleted mid-study? (Session ends gracefully, returns to goal page)
- What happens when user reaches 5-card limit on free tier? (Clear messaging about limit, option to upgrade)
- What happens if skill tree generation fails? (Error message with retry option, no partial cards created)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST automatically generate flashcards when a skill tree is created
- **FR-002**: System MUST limit free tier users to 5 flashcards per tree node
- **FR-003**: System MUST display a green "Study Now" button with play icon on goal page
- **FR-004**: System MUST guide users through tree nodes in depth-first order (complete all children before siblings)
- **FR-005**: System MUST track study progress and resume from next incomplete node
- **FR-006**: System MUST provide "Continue" and "Return to goal page" options after each node quiz

### Key Entities

- **Flashcard**: Question/answer pair, auto-generated, belongs to a tree node
- **Tree Node**: Represents a topic/skill in the skill tree, contains flashcards, has parent/child relationships
- **Study Session**: Tracks current progress through nodes, remembers last incomplete node
- **Study Progress**: Per-node completion status; node is complete when all its cards reach FSRS "review" state (passed initial learning phase)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users begin studying within 30 seconds of creating a goal (no manual card generation step)
- **SC-002**: 90% of users can complete a full guided study session through their skill tree without confusion
