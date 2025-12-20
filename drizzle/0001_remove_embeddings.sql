-- Migration: Remove embedding columns from PostgreSQL
-- Embeddings are now stored in LanceDB for efficient vector search

-- Drop vector indexes
DROP INDEX IF EXISTS "messages_embedding_idx";
DROP INDEX IF EXISTS "flashcards_question_embedding_idx";

-- Drop embedding columns
ALTER TABLE "messages" DROP COLUMN IF EXISTS "embedding";
ALTER TABLE "flashcards" DROP COLUMN IF EXISTS "question_embedding";

-- Note: pgvector extension can be disabled in Supabase project settings if desired
-- This migration maintains data integrity while moving vector operations to LanceDB
