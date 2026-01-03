-- Drop deprecated tables and columns from v2 pivot to goal-based learning
-- See issues #227, #229, #251
-- These tables were part of the chat and deck features that are no longer used

-- Step 1: Drop foreign key constraints on flashcards table
ALTER TABLE "flashcards" DROP CONSTRAINT IF EXISTS "flashcards_conversation_id_conversations_id_fk";
ALTER TABLE "flashcards" DROP CONSTRAINT IF EXISTS "flashcards_message_id_messages_id_fk";

-- Step 2: Drop deprecated columns from flashcards table
ALTER TABLE "flashcards" DROP COLUMN IF EXISTS "conversation_id";
ALTER TABLE "flashcards" DROP COLUMN IF EXISTS "message_id";

-- Step 3: Drop deck_cards junction table (must be before decks due to FK)
DROP TABLE IF EXISTS "deck_cards" CASCADE;

-- Step 4: Drop decks table
DROP TABLE IF EXISTS "decks" CASCADE;

-- Step 5: Drop messages table (must be before conversations due to FK)
DROP TABLE IF EXISTS "messages" CASCADE;

-- Step 6: Drop conversations table
DROP TABLE IF EXISTS "conversations" CASCADE;

-- Note: Indexes on the dropped tables will be automatically dropped by CASCADE
