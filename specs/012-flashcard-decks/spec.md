# Feature Specification: Flashcard Deck Organization

**Feature Branch**: `012-flashcard-decks`
**Created**: 2025-12-24
**Status**: Draft
**GitHub Issue**: https://github.com/nicholaspsmith/memoryloop/issues/174
**Input**: User description: "User can organize their flashcards into collections (we will call them decks). A user can choose which deck they would like to quiz themselves with. A user can create a deck from any of their existing cards (regardless of their fsrs status). A user can tell the application to create a deck based on a certain topic or idea and the application will use some combination of LLM and similarity search (using our vector embeddings stored in lancedb)."

## Clarifications

### Session 2025-12-24

- Q: AI Deck Generation: LLM and Vector Search Combination Strategy - How should the LLM and vector search be combined? → A: Hybrid (LLM + vector) - Vector search finds candidates (top 30-50), then LLM re-ranks and filters based on semantic relevance to topic
- Q: Deck Card Ordering and Manual Sorting - Should users be able to manually reorder cards within decks? → A: No manual ordering - Cards are always ordered by FSRS scheduling during study, or alphabetically/by date in deck management UI
- Q: FSRS New Cards Per Day Limit with Deck Filtering - Should the new cards per day limit apply globally or per-deck? → A: Deck-specific override - Global limit by default, but users can optionally set per-deck limits
- Q: Active Study Session Behavior When Deck Changes - How should active sessions handle concurrent deck modifications? → A: Live updates - Added cards appear in current session's queue; removed cards are skipped if not yet reviewed
- Q: Performance and Scale Limits - What are the hard limits for decks and cards? → A: Hard limits enforced - Maximum 1000 cards per deck, maximum 100 decks per user (system blocks creation beyond limits)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manual Deck Creation and Study (Priority: P1)

Users can manually create decks by selecting existing flashcards and then quiz themselves using only cards from that specific deck. This provides basic organizational structure for their study sessions.

**Why this priority**: This is the foundation of deck functionality. Without the ability to create and study from decks, none of the advanced features matter. This delivers immediate value as an MVP - users can organize their cards for focused study sessions.

**Independent Test**: Can be fully tested by creating a user account, creating several flashcards, organizing them into a named deck, and initiating a quiz session filtered to only that deck's cards. Success is measured by users receiving quiz questions only from the selected deck.

**Acceptance Scenarios**:

1. **Given** a user has at least 5 existing flashcards, **When** they navigate to deck management and create a new deck named "Spanish Verbs" and add 3 of their cards to it, **Then** the deck appears in their deck list with 3 cards
2. **Given** a user has created a deck with 3 cards, **When** they select "Study this deck" and begin a quiz session, **Then** they only receive quiz questions from those 3 cards
3. **Given** a user has a deck with 10 cards and starts a quiz session with that deck, **When** they complete reviewing all 10 cards, **Then** the quiz session ends and shows completion statistics for that deck
4. **Given** a user has multiple decks, **When** they view their deck list, **Then** they see each deck with its name, card count, and last studied date
5. **Given** a user is creating a deck, **When** they add a card that's already in another deck, **Then** the card is successfully added (cards can belong to multiple decks)

---

### User Story 2 - Deck Management and Editing (Priority: P2)

Users can edit existing decks by adding or removing cards, renaming decks, and deleting decks they no longer need. This allows them to refine their organization over time.

**Why this priority**: Once users can create decks, they need to maintain them. This is essential for long-term usability but not required for the initial MVP. Users can work around this temporarily by creating new decks.

**Independent Test**: Can be tested by creating a deck, then performing edit operations (rename, add cards, remove cards, delete deck) and verifying the changes persist correctly.

**Acceptance Scenarios**:

1. **Given** a user has an existing deck named "Spanish Basics", **When** they rename it to "Spanish Fundamentals", **Then** the deck appears with the new name in their deck list
2. **Given** a user has a deck with 5 cards, **When** they add 3 more cards from their flashcard library, **Then** the deck shows 8 cards total
3. **Given** a user has a deck with 8 cards, **When** they remove 2 cards, **Then** the deck shows 6 cards and the removed cards remain in their overall flashcard library
4. **Given** a user has a deck they no longer want, **When** they delete the deck, **Then** the deck is removed from their deck list and all cards remain in their flashcard library
5. **Given** a user has a deck open for editing, **When** they view the cards in the deck, **Then** they can see preview information for each card (front text, tags, FSRS status)
6. **Given** a user has an active study session for a deck in one browser tab, **When** they add new due cards to that deck in another tab, **Then** the newly added cards appear in the active session's review queue

---

### User Story 3 - AI-Powered Deck Creation (Priority: P3)

Users can request the system to automatically create a deck based on a topic or idea using LLM analysis and vector similarity search. The system suggests relevant cards from the user's existing collection.

**Why this priority**: This is an advanced convenience feature that leverages the AI capabilities of the platform. While valuable, users can accomplish their goals manually with P1 and P2. This becomes more valuable as users accumulate larger card libraries.

**Independent Test**: Can be tested by creating a user account with 20+ flashcards across different topics, then requesting an AI-generated deck for a specific topic (e.g., "photosynthesis") and verifying the system returns semantically relevant cards.

**Acceptance Scenarios**:

1. **Given** a user has 50+ flashcards covering biology, chemistry, and physics topics, **When** they request an AI-generated deck with topic "cellular respiration", **Then** the system creates a deck with 5-15 cards semantically related to cellular respiration
2. **Given** a user receives AI-suggested cards for a deck, **When** they review the suggestions, **Then** they can accept or reject each suggested card before finalizing the deck
3. **Given** a user has requested an AI-generated deck, **When** the system searches their cards, **Then** it first uses LanceDB vector similarity to retrieve top 30-50 candidates, then uses LLM to re-rank and filter these candidates based on semantic relevance
4. **Given** a user has very few cards matching a requested topic, **When** they request an AI-generated deck, **Then** the system notifies them that insufficient matching cards exist and suggests creating more flashcards on that topic
5. **Given** a user creates an AI-generated deck, **When** the deck is finalized, **Then** it behaves identically to manually-created decks for study sessions

---

### User Story 4 - Deck-Filtered Study Sessions (Priority: P1)

Users can select a specific deck and start a quiz session that only includes cards from that deck, with FSRS scheduling applied within the deck context.

**Why this priority**: This is the core value proposition of decks - focused study on a subset of cards. This is essential for the MVP alongside P1 manual deck creation.

**Independent Test**: Can be tested by creating multiple decks with different cards, starting a study session for one deck, and verifying that FSRS scheduling only presents due cards from that deck (not from other decks).

**Acceptance Scenarios**:

1. **Given** a user has a deck with 20 cards (10 due, 10 not due), **When** they start a deck-filtered study session, **Then** they are presented with the 10 due cards in FSRS-optimized order
2. **Given** a user is in a deck-filtered study session, **When** they rate a card's difficulty, **Then** the FSRS algorithm updates that card's scheduling normally
3. **Given** a user has studied all due cards in a deck, **When** they attempt to start another session with that deck, **Then** the system notifies them that no cards are currently due and shows when the next card will be due
4. **Given** a user starts a deck study session with cards in multiple review states (new, learning, review, relearning), **When** the session proceeds, **Then** FSRS presents cards in the appropriate order based on their states
5. **Given** a user has global study settings (cards per session, new cards per day), **When** they start a deck-filtered session, **Then** global settings apply unless the deck has deck-specific overrides configured

---

### Edge Cases

- What happens when a user creates a deck with no cards? The deck should be created successfully but show a warning that it contains 0 cards and cannot be studied until cards are added.
- What happens when a user tries to start a study session with a deck that has only non-due cards? The system should display a friendly message indicating no cards are due and show the next review time.
- What happens when a user deletes a flashcard that belongs to one or more decks? The card should be removed from all decks it belonged to, and deck card counts should update accordingly.
- What happens when a user requests an AI-generated deck but they only have 3 total flashcards? The system should inform them that AI deck generation requires a minimum number of cards (e.g., 10) for meaningful results.
- What happens when a user requests an AI-generated deck and the LLM service or LanceDB is temporarily unavailable? The system should gracefully handle the error and allow the user to create a manual deck instead.
- What happens when a user creates a deck with a duplicate name? The system should allow it (decks can have duplicate names) or optionally warn the user.
- What happens when a user tries to add more than 1000 cards to a single deck? The system blocks the operation and displays an error message: "Deck limit reached (1000 cards maximum). Please create a new deck or remove cards before adding more."
- What happens when a user tries to create their 101st deck? The system blocks deck creation and displays an error message: "Maximum deck limit reached (100 decks). Please delete unused decks before creating new ones."
- What happens during a deck study session if the user adds or removes cards from that deck in another browser tab? Added cards dynamically appear in the session's review queue (if they meet FSRS due criteria); removed cards are skipped if not yet reviewed in the active session.
- What happens when a user has no flashcards yet but tries to create a deck? The system should allow deck creation but indicate it's empty and requires cards.
- What happens when vector embeddings don't exist for some flashcards during AI deck generation? The system should still include cards that have embeddings and potentially create embeddings for cards that lack them.
- What happens when a user sets deck-specific "new cards per day" limit higher than their global limit? The deck-specific limit takes precedence for that deck's study sessions.
- What happens when a user studies multiple decks in one day with deck-specific limits? Each deck's limit is independent and doesn't affect the others.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create named decks that contain zero or more flashcards
- **FR-002**: System MUST allow users to add existing flashcards to decks regardless of their FSRS review state (new, learning, review, relearning)
- **FR-003**: System MUST allow a single flashcard to belong to multiple decks simultaneously
- **FR-004**: System MUST allow users to remove flashcards from decks without deleting the underlying flashcard
- **FR-005**: System MUST allow users to delete entire decks without affecting the flashcards they contained
- **FR-006**: System MUST allow users to rename decks after creation
- **FR-007**: System MUST display deck metadata including name, card count, creation date, and last studied date
- **FR-008**: System MUST allow users to initiate quiz sessions filtered to a specific deck
- **FR-009**: System MUST apply FSRS scheduling algorithm within deck-filtered study sessions
- **FR-010**: System MUST only present cards from the selected deck during deck-filtered study sessions
- **FR-011**: System MUST maintain global FSRS state for flashcards even when studied through deck-filtered sessions (studying a card in a deck updates its global review state)
- **FR-012**: System MUST support AI-powered deck creation using user-provided topic or idea description
- **FR-013**: System MUST use hybrid approach for AI deck generation: LanceDB vector similarity search to retrieve top 30-50 candidate cards, then LLM semantic analysis to re-rank and filter candidates based on relevance to the requested topic
- **FR-014**: System MUST generate vector embeddings for the user's topic description to enable similarity search against flashcard embeddings
- **FR-015**: System MUST present AI-suggested cards to users for review before finalizing an AI-generated deck
- **FR-016**: System MUST allow users to accept or reject individual cards from AI suggestions
- **FR-017**: System MUST handle flashcards without vector embeddings gracefully during AI deck generation (skip or generate embeddings)
- **FR-018**: System MUST update deck card counts when cards are added, removed, or when member cards are deleted
- **FR-019**: System MUST persist deck data to PostgreSQL database
- **FR-020**: System MUST enforce user isolation (users can only access their own decks)
- **FR-021**: System MUST validate deck names are non-empty strings with reasonable length limits (e.g., 1-200 characters)
- **FR-022**: System MUST provide a UI for browsing and selecting decks
- **FR-023**: System MUST provide a UI for viewing cards within a deck
- **FR-024**: System MUST provide a UI for adding/removing cards from decks
- **FR-025**: System MUST integrate deck selection into the existing study session workflow
- **FR-026**: System MUST NOT support manual card ordering within decks (FSRS scheduling determines study order; deck management UI uses chronological or alphabetical sorting)
- **FR-027**: System MUST apply global FSRS settings (new cards per day, cards per session) to deck-filtered study sessions by default
- **FR-028**: System MUST allow users to optionally configure deck-specific overrides for FSRS settings (new cards per day, cards per session)
- **FR-029**: System MUST prioritize deck-specific settings over global settings when both are configured for a deck
- **FR-030**: System MUST support live updates during active deck study sessions: cards added to the deck appear in the session queue if they meet FSRS due criteria
- **FR-031**: System MUST handle removed cards gracefully during active sessions: skip removed cards if not yet reviewed, allow already-reviewed cards to complete their rating
- **FR-032**: System MUST enforce a hard limit of 1000 cards per deck (block operations that would exceed this limit)
- **FR-033**: System MUST enforce a hard limit of 100 decks per user (block deck creation beyond this limit)
- **FR-034**: System MUST display clear error messages when users attempt to exceed deck or card limits
- **FR-035**: System MUST allow users to view their current usage (e.g., "45 of 100 decks", "350 of 1000 cards in this deck")

### Key Entities

- **Deck**: Represents a named collection of flashcards. Attributes include unique ID, owner user ID, name, creation timestamp, last studied timestamp, archived status, and optional FSRS setting overrides (new cards per day limit, cards per session limit). A deck belongs to one user and contains zero or more flashcards.

- **DeckCard**: Represents the many-to-many relationship between decks and flashcards. Attributes include unique ID, deck ID, flashcard ID, and added timestamp. Links a specific flashcard to a specific deck. No position/order field needed as FSRS scheduling determines study order.

- **Flashcard**: Existing entity. Each flashcard maintains its global FSRS state independent of deck membership. Flashcards can belong to zero or more decks.

- **User**: Existing entity. Each user owns zero or more decks.

- **EmbeddingVector**: Existing entity in LanceDB. Used for semantic similarity search during AI deck generation. Should exist for all flashcards to enable full AI deck generation capabilities.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a deck and add cards to it within 60 seconds
- **SC-002**: Users can start a deck-filtered study session and see only cards from that deck
- **SC-003**: 90% of AI-generated deck suggestions include at least 5 semantically relevant cards (based on manual review sampling)
- **SC-004**: Deck-filtered study sessions correctly apply FSRS scheduling (same algorithm behavior as global study sessions)
- **SC-005**: System handles concurrent deck editing operations without data corruption (e.g., two tabs editing same deck)
- **SC-006**: AI deck generation (vector search + LLM re-ranking) completes within 10 seconds for topics with 100+ potentially matching cards
- **SC-007**: Deck UI loads and displays 50+ decks with acceptable performance (page load < 2 seconds)
- **SC-008**: Zero data loss when deleting decks (flashcards remain intact in user's library)
- **SC-009**: Users with 500+ flashcards can successfully create AI-generated decks without timeout errors
- **SC-010**: Study session filtering correctly isolates deck cards (verified through automated tests)
- **SC-011**: Live deck updates during active sessions work correctly: added cards appear in queue within 5 seconds, removed cards are skipped gracefully
- **SC-012**: Hard limits are enforced: users cannot exceed 1000 cards per deck or 100 decks per account
- **SC-013**: Limit violations display user-friendly error messages with actionable guidance
