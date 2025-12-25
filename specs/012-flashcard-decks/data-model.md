# Data Model: Flashcard Deck Organization

**Feature**: 012-flashcard-decks
**Created**: 2025-12-24
**References**: [spec.md](./spec.md), [plan.md](./plan.md)

## Overview

This data model extends the existing flashcard system with deck organization capabilities. Decks are named collections of flashcards that support focused study sessions, AI-powered creation, and deck-specific FSRS settings.

**Key Design Principles**:
- Many-to-many relationship: Flashcards can belong to multiple decks
- Global FSRS state: Flashcard review state is global, not deck-specific
- Hard limits: 100 decks per user, 1000 cards per deck
- Non-destructive: Deleting decks preserves flashcards

## Entities

### Deck

Represents a named collection of flashcards owned by a user.

**Table**: `decks`

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique deck identifier |
| user_id | uuid | NOT NULL, FOREIGN KEY → users(id) | Deck owner |
| name | varchar(200) | NOT NULL | Deck name (1-200 characters) |
| created_at | timestamp | NOT NULL, DEFAULT NOW() | Creation timestamp |
| last_studied_at | timestamp | NULL | Last study session timestamp |
| archived | boolean | NOT NULL, DEFAULT false | Soft delete flag |
| new_cards_per_day_override | integer | NULL, CHECK (>= 0) | Override global FSRS new cards/day limit |
| cards_per_session_override | integer | NULL, CHECK (>= 0) | Override global FSRS cards/session limit |

**Indexes**:
- `idx_decks_user_id` on `user_id` (for listing user's decks)
- `idx_decks_user_archived` on `(user_id, archived)` (for filtering active/archived)

**Constraints**:
- 100 decks per user limit (enforced at application layer, CHECK constraint not feasible)
- Name must be 1-200 characters (enforced in schema)
- Override values must be non-negative if set

**Relationships**:
- `user_id` → `users.id` (ON DELETE CASCADE) - Deleting user deletes all their decks
- One user has many decks (1:N)
- One deck has many flashcards through deck_cards (N:M)

**Business Rules**:
- User cannot create more than 100 decks (FR-033)
- Deck name cannot be empty
- Archived decks do not count toward 100-deck limit
- Deck-specific overrides take precedence over global FSRS settings (FR-029)

---

### DeckCard

Represents the many-to-many relationship between decks and flashcards.

**Table**: `deck_cards`

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique relationship identifier |
| deck_id | uuid | NOT NULL, FOREIGN KEY → decks(id) | Deck containing the card |
| flashcard_id | uuid | NOT NULL, FOREIGN KEY → flashcards(id) | Flashcard in the deck |
| added_at | timestamp | NOT NULL, DEFAULT NOW() | When card was added to deck |

**Indexes**:
- `idx_deck_cards_deck_id` on `deck_id` (for listing cards in deck)
- `idx_deck_cards_flashcard_id` on `flashcard_id` (for finding decks containing card)
- `idx_deck_cards_unique` UNIQUE on `(deck_id, flashcard_id)` (prevent duplicate entries)

**Constraints**:
- 1000 cards per deck limit (enforced at application layer before insert)
- Unique constraint prevents same card added twice to same deck

**Relationships**:
- `deck_id` → `decks.id` (ON DELETE CASCADE) - Deleting deck removes all associations
- `flashcard_id` → `flashcards.id` (ON DELETE CASCADE) - Deleting flashcard removes from all decks

**Business Rules**:
- Deck cannot contain more than 1000 cards (FR-032)
- Same flashcard can be in multiple decks (FR-003)
- Card can be added to deck regardless of FSRS state (FR-002)
- When flashcard deleted, automatically removed from all decks

---

### Flashcard (Existing Entity - Extended)

Existing flashcard entity remains unchanged. Each flashcard maintains **global FSRS state** independent of deck membership.

**Key Points**:
- FSRS state (difficulty, stability, due_date, state) is **global**, not per-deck
- Studying a card in deck A updates its global FSRS state
- Same card in deck B will reflect the updated FSRS state
- Vector embeddings used for AI deck generation

**FSRS State Management**:
- Deck-filtered study sessions read from global FSRS state
- Rating a card during deck session updates global FSRS state (FR-011)
- "New cards per day" limit can be global or deck-specific (FR-027, FR-028)

---

### User (Existing Entity - Extended)

Existing user entity. No schema changes required.

**Deck-Related Extensions**:
- User has 0-100 decks (enforced at application layer)
- Global FSRS settings (new_cards_per_day, cards_per_session) can be overridden per-deck

---

## Entity Relationships

```
User (existing)
  |
  | 1:N
  |
  v
Deck (new)
  |
  | N:M
  |
  v
DeckCard (new)
  |
  | N:1
  |
  v
Flashcard (existing)
```

**Relationship Details**:

1. **User → Deck** (1:N)
   - One user owns many decks
   - Cascade delete: Deleting user deletes all their decks
   - Maximum 100 decks per user

2. **Deck ↔ Flashcard** (N:M through DeckCard)
   - Many-to-many relationship
   - One deck contains many flashcards (max 1000)
   - One flashcard can be in many decks
   - Join table: `deck_cards`

3. **Flashcard maintains global FSRS state**
   - FSRS state not duplicated per deck
   - Studying in any deck updates global state

## Data Integrity Rules

### Cascade Delete Behavior

1. **Delete User**:
   - → Cascade delete all user's decks
   - → Cascade delete all deck_cards for those decks
   - → Flashcards preserved (may belong to other users)

2. **Delete Deck**:
   - → Cascade delete all deck_cards entries for that deck
   - → Flashcards preserved (FR-005, FR-008)

3. **Delete Flashcard**:
   - → Cascade delete all deck_cards entries for that flashcard
   - → Deck card counts must be updated (FR-018)
   - → Decks preserved

### Limit Enforcement

**100 Decks Per User** (FR-033):
- Enforced at application layer before INSERT
- Count active (non-archived) decks for user
- Block creation if count >= 100
- Return error: "Maximum deck limit reached (100 decks)"

**1000 Cards Per Deck** (FR-032):
- Enforced at application layer before INSERT into deck_cards
- Count existing deck_cards for deck
- Block insert if count >= 1000
- Return error: "Deck limit reached (1000 cards maximum)"

### Concurrency Handling

**Live Session Updates** (FR-030, FR-031):
- Added cards: Query deck_cards with timestamp filter to detect new additions
- Removed cards: Check if deck_card entry exists before presenting in session
- No row-level locking required (eventual consistency acceptable)

**Concurrent Edits**:
- Last-write-wins for deck metadata updates
- Duplicate prevention via UNIQUE constraint on deck_cards(deck_id, flashcard_id)

## Performance Considerations

### Query Patterns

**List User's Decks** (high frequency):
```sql
SELECT d.*, COUNT(dc.id) as card_count
FROM decks d
LEFT JOIN deck_cards dc ON d.id = dc.deck_id
WHERE d.user_id = ? AND d.archived = false
GROUP BY d.id
ORDER BY d.last_studied_at DESC NULLS LAST;
```
- Index: `idx_decks_user_archived` covers WHERE clause
- Card count computed via LEFT JOIN + COUNT

**Get Deck with Cards** (high frequency):
```sql
SELECT f.*
FROM flashcards f
INNER JOIN deck_cards dc ON f.id = dc.flashcard_id
WHERE dc.deck_id = ?
ORDER BY dc.added_at DESC;
```
- Index: `idx_deck_cards_deck_id` for JOIN
- Returns full flashcard details

**Find Decks Containing Card** (low frequency):
```sql
SELECT d.*
FROM decks d
INNER JOIN deck_cards dc ON d.id = dc.deck_id
WHERE dc.flashcard_id = ?;
```
- Index: `idx_deck_cards_flashcard_id` for JOIN

### Indexing Strategy

**Critical Indexes**:
1. `deck_cards(deck_id)` - Most common query (list cards in deck)
2. `deck_cards(flashcard_id)` - Cascade delete on flashcard removal
3. `deck_cards(deck_id, flashcard_id) UNIQUE` - Duplicate prevention + compound queries
4. `decks(user_id)` - List user's decks
5. `decks(user_id, archived)` - Filter active/archived decks

**Scale Assumptions**:
- 100 decks × 1000 cards = 100,000 deck_cards rows per user (worst case)
- PostgreSQL handles 100k rows efficiently with proper indexes
- Card count aggregation may need caching for UI performance (consider materialized view if >50 decks)

### Optimization Opportunities

**Denormalized Card Counts**:
- Add `card_count` column to `decks` table (updated via trigger or application logic)
- Avoids JOIN + COUNT for deck list queries
- Trade-off: Consistency complexity vs query performance

**Decision**: Start without denormalization. Add if deck list performance <2s requirement not met (SC-007).

## Migration Strategy

### Migration: `0006_add_decks.sql`

```sql
-- Create decks table
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL CHECK (char_length(name) >= 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_studied_at TIMESTAMP,
  archived BOOLEAN NOT NULL DEFAULT false,
  new_cards_per_day_override INTEGER CHECK (new_cards_per_day_override >= 0),
  cards_per_session_override INTEGER CHECK (cards_per_session_override >= 0)
);

-- Create deck_cards join table
CREATE TABLE deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_user_archived ON decks(user_id, archived);
CREATE INDEX idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX idx_deck_cards_flashcard_id ON deck_cards(flashcard_id);
CREATE UNIQUE INDEX idx_deck_cards_unique ON deck_cards(deck_id, flashcard_id);

-- Comments
COMMENT ON TABLE decks IS 'Named collections of flashcards for focused study sessions';
COMMENT ON TABLE deck_cards IS 'Many-to-many relationship between decks and flashcards';
COMMENT ON COLUMN decks.new_cards_per_day_override IS 'Optional per-deck override for global FSRS new cards/day limit';
COMMENT ON COLUMN decks.cards_per_session_override IS 'Optional per-deck override for global FSRS cards/session limit';
```

**Rollback**:
```sql
DROP TABLE IF EXISTS deck_cards CASCADE;
DROP TABLE IF EXISTS decks CASCADE;
```

## Data Model Validation

### Requirements Traceability

| Entity | Functional Requirements Addressed |
|--------|----------------------------------|
| Deck | FR-001, FR-006, FR-007, FR-019, FR-020, FR-021, FR-027, FR-028, FR-029, FR-033 |
| DeckCard | FR-002, FR-003, FR-004, FR-018, FR-030, FR-031, FR-032 |
| Flashcard (existing) | FR-009, FR-010, FR-011, FR-017 |

### Constitution Compliance

✅ **Modularity**: Entities are independent, single-purpose tables
✅ **Simplicity**: No over-engineering (no position field, no deck-specific FSRS state)
✅ **Observability**: Clear schema with comments for debugging

### Edge Cases Covered

- Empty decks: Allowed (deck can have 0 cards)
- Duplicate names: Allowed (no UNIQUE constraint on deck.name)
- Flashcard in multiple decks: Supported (many-to-many)
- Deck deletion: Non-destructive (flashcards preserved)
- Flashcard deletion: Cascades to deck_cards (decks updated)
- Concurrent edits: UNIQUE constraint prevents duplicates
- Limit violations: Enforced before INSERT
