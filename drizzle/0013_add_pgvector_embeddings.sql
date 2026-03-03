-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Flashcard embeddings table
CREATE TABLE IF NOT EXISTS flashcard_embeddings (
  id UUID PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Goal embeddings table  
CREATE TABLE IF NOT EXISTS goal_embeddings (
  id UUID PRIMARY KEY REFERENCES learning_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- HNSW indexes for fast similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS flashcard_embeddings_vector_idx
  ON flashcard_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS goal_embeddings_vector_idx
  ON goal_embeddings USING hnsw (embedding vector_cosine_ops);

-- User ID indexes for filtered queries
CREATE INDEX IF NOT EXISTS flashcard_embeddings_user_idx ON flashcard_embeddings(user_id);
CREATE INDEX IF NOT EXISTS goal_embeddings_user_idx ON goal_embeddings(user_id);
