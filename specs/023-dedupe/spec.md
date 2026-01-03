# Feature Specification: Duplicate Detection for Goals and Flashcards

**Feature Branch**: `023-dedupe`
**Created**: 2026-01-03
**Status**: Draft
**GitHub Issue**: #256
**Input**: Prevent duplicate/similar goals and flashcards using embedding similarity

## Overview

Users can inadvertently create learning goals or flashcards that are semantically identical or very similar to existing ones. This leads to redundant content, wasted study time reviewing duplicates, and a cluttered learning experience. This feature adds duplicate detection during content creation to warn users and prevent near-duplicate content from being stored.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Flashcard Duplicate Detection (Priority: P1)

When a user creates a new flashcard (manually or via AI generation), the system checks if a semantically similar flashcard already exists in their collection. If a duplicate is detected, the user is informed and can choose to proceed or cancel.

**Why this priority**: Flashcards are the core learning unit and duplicates directly waste study time. Users create flashcards more frequently than goals, making this the highest-impact deduplication.

**Independent Test**: Can be fully tested by creating a flashcard, then attempting to create a similar one - user should see a warning with the existing card.

**Acceptance Scenarios**:

1. **Given** a user has an existing flashcard "What is photosynthesis? → The process by which plants convert sunlight to energy", **When** they try to create "Define photosynthesis → Plants converting light into chemical energy", **Then** they see a warning showing the existing similar card with similarity score
2. **Given** a user attempts to create a flashcard with no similar existing cards, **When** they submit the flashcard, **Then** it is created without any duplicate warning
3. **Given** a duplicate warning is shown, **When** the user chooses to create anyway, **Then** the flashcard is created (user override)
4. **Given** a duplicate warning is shown, **When** the user chooses to cancel, **Then** no flashcard is created and they return to the creation form

---

### User Story 2 - Goal Duplicate Detection (Priority: P2)

When a user creates a new learning goal, the system checks if a semantically similar goal already exists. If detected, the user is warned before proceeding.

**Why this priority**: Goals are created less frequently than flashcards but represent larger learning investments. Duplicate goals lead to fragmented progress tracking.

**Independent Test**: Can be fully tested by creating a goal, then attempting to create a similar one - user should see a warning with the existing goal.

**Acceptance Scenarios**:

1. **Given** a user has an existing goal "Learn Python programming", **When** they try to create "Master Python development", **Then** they see a warning showing the existing similar goal
2. **Given** a user creates a goal with no similar existing goals, **When** they submit, **Then** the goal is created without warning
3. **Given** a duplicate goal warning is shown, **When** the user chooses to proceed anyway, **Then** the goal is created (user override)

---

### User Story 3 - Bulk AI Generation Deduplication (Priority: P3)

When the system generates multiple flashcards via AI (e.g., from a skill tree node), duplicates within the batch and against existing cards are automatically filtered out before saving.

**Why this priority**: AI generation can produce similar cards, especially when generating from related topics. Automatic filtering improves generation quality without user intervention.

**Independent Test**: Can be tested by triggering AI card generation for a topic that already has cards - duplicate cards should be automatically excluded from the generated batch.

**Acceptance Scenarios**:

1. **Given** AI generates 5 flashcards for a topic, **When** 2 of them are similar to existing cards, **Then** only 3 unique cards are saved and a summary shows "3 cards created, 2 duplicates filtered"
2. **Given** AI generates 5 flashcards, **When** 2 of them are similar to each other within the batch, **Then** only 1 of the pair is kept (the first one)
3. **Given** all AI-generated cards are unique, **When** the batch is saved, **Then** all cards are created with no filtering message

---

### Edge Cases

- What happens when similarity detection service is unavailable? → Cards/goals are created with a warning that duplicate check was skipped
- How does the system handle cards with identical questions but different answers? → Treated as duplicates (question is primary comparison)
- What happens with very short flashcards (e.g., "Yes/No" answers)? → Minimum content length required for meaningful comparison; short cards bypass dedup
- How are duplicates handled across different card types (flashcard vs multiple choice)? → All card types compared based on question text regardless of type

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST check for similar existing flashcards when a user creates a new flashcard
- **FR-002**: System MUST check for similar existing goals when a user creates a new learning goal
- **FR-003**: System MUST display existing similar items when duplicates are detected, showing the similarity score as a percentage
- **FR-004**: System MUST allow users to override duplicate warnings and create content anyway
- **FR-005**: System MUST automatically filter duplicates from AI-generated flashcard batches
- **FR-006**: System MUST use a similarity threshold of 85% to determine duplicates (configurable in future)
- **FR-007**: System MUST scope duplicate detection to the current user's content only (no cross-user comparison)
- **FR-008**: System MUST compare flashcards based on question text only (not answers)
- **FR-009**: System MUST compare goals based on title and description combined
- **FR-010**: System MUST skip duplicate detection for content shorter than 10 characters
- **FR-011**: System MUST gracefully handle embedding service failures by allowing creation with a warning

### Key Entities

- **Flashcard**: Learning card with question/answer - duplicates detected via question embedding similarity
- **Learning Goal**: User's learning objective - duplicates detected via title+description embedding similarity
- **Similarity Score**: Numeric value (0-100%) indicating how similar two items are semantically

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Duplicate detection adds less than 500ms to flashcard/goal creation time
- **SC-002**: At least 90% of semantically duplicate content is detected (based on human evaluation of test set)
- **SC-003**: False positive rate (flagging non-duplicates) is below 5%
- **SC-004**: Users who see duplicate warnings abandon creation in over 50% of cases (indicating warnings are helpful)
- **SC-005**: AI-generated batches have zero internal duplicates after filtering

## Assumptions

- The existing Jina embeddings API and LanceDB infrastructure are reliable and performant enough for real-time duplicate checking
- 85% similarity threshold is appropriate for most use cases (based on common NLP deduplication practices)
- Users prefer being warned about duplicates rather than silent prevention
- Question text alone is sufficient for flashcard duplicate detection (answers may legitimately vary)
- Cross-user duplicate detection is not needed (users may legitimately have similar learning content)
