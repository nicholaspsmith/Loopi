# Migration 0010: Drop Deprecated Tables

**Date**: 2026-01-02
**Feature**: Cleanup from v2 pivot to goal-based learning
**Related Issues**: #227, #229, #251, #258

## Summary

This migration removes deprecated database tables and columns that were part of the chat-based and deck-based features in v1. These features were replaced by the goal-based learning system introduced in the v2 pivot.

## Tables Dropped

1. **deck_cards** - Junction table linking decks to flashcards
2. **decks** - User-created flashcard decks
3. **messages** - Chat messages (had embeddings for semantic search)
4. **conversations** - Chat conversation threads

## Columns Dropped from flashcards table

- `conversation_id` - Foreign key to conversations table
- `message_id` - Foreign key to messages table

## Migration Steps

The migration follows this order to respect foreign key constraints:

1. Drop FK constraints from flashcards to conversations and messages
2. Drop conversation_id and message_id columns from flashcards
3. Drop deck_cards (junction table - references decks and flashcards)
4. Drop decks table
5. Drop messages (references conversations)
6. Drop conversations

All operations use `IF EXISTS` and `CASCADE` to safely handle different database states.

## Safety Notes

- Uses `IF EXISTS` to allow idempotent execution
- Uses `CASCADE` to automatically drop dependent objects (indexes, etc.)
- Foreign key constraints are explicitly dropped first to avoid issues
- Safe to run on production as data in these tables is no longer used

## Rollback

If rollback is needed, you would need to:

1. Recreate the tables using migrations 0003 and 0004 as reference
2. Re-add the columns to flashcards table
3. Re-add foreign key constraints

**Note**: Data in these tables cannot be recovered after this migration runs.

## Testing

Before running on production:

1. Verify no application code references these tables
2. Verify no foreign keys from other tables reference these tables
3. Test on a staging database first
4. Backup production database before running

## Application Impact

**No application impact** - these tables were already removed from:

- Schema definitions (`lib/db/drizzle-schema.ts`) in PR #258
- All application code
- All API endpoints

This migration simply cleans up the database to match the current schema.
