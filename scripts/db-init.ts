#!/usr/bin/env tsx

/**
 * Database initialization script
 * Run with: npm run db:init
 *
 * Note: With the migration to pgvector, database initialization is now
 * handled by PostgreSQL migrations (drizzle/0013_add_pgvector_embeddings.sql).
 *
 * This script now just runs the migrations to ensure the database is set up.
 */

console.log('🚀 MemoryLoop Database Initialization')
console.log('=====================================\n')
console.log('Database setup is now handled by migrations.')
console.log('To set up the database:\n')
console.log('  1. Ensure DATABASE_URL is configured in your .env.local')
console.log('  2. Run: npm run db:migrate\n')
console.log('This will apply all pending migrations including:')
console.log('  - PostgreSQL tables for users, flashcards, goals, etc.')
console.log('  - pgvector extension for vector embeddings')
console.log('  - HNSW indexes for similarity search\n')

process.exit(0)
