/**
 * Database Test Setup
 *
 * Vector embeddings are now stored in PostgreSQL using pgvector,
 * so no separate database setup is required.
 *
 * Tests that need embeddings should mock the embedding functions
 * in @/lib/embeddings rather than using a real vector database.
 *
 * PostgreSQL test database setup is handled by:
 * - vitest.config.ts (globalSetup if needed)
 * - Individual test files mocking the database as needed
 */

// No setup needed - pgvector embeddings are stored in PostgreSQL
// and tests mock embedding operations at the function level
