# Supabase Setup Guide for MemoryLoop

This guide will help you set up a Supabase PostgreSQL database with pgvector for MemoryLoop.

## Prerequisites

- A Supabase account (sign up at [https://supabase.com](https://supabase.com))
- Node.js 18+ installed

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: `memoryloop` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it**
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be created

## Step 2: Get Your Database Connection String

1. In your Supabase project dashboard, go to **Settings** (gear icon) → **Database**
2. Scroll down to **Connection String**
3. Select **Direct Connection** tab (not Pooler)
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your database password from Step 1

## Step 3: Enable pgvector Extension

1. In your Supabase dashboard, go to **Database** → **Extensions**
2. Search for "vector"
3. Toggle **ON** the `vector` extension
4. Confirm the change

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Update `DATABASE_URL` in `.env.local` with your connection string from Step 2:
   ```bash
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 5: Test Database Connection

First, verify your DATABASE_URL is configured correctly:

```bash
npm run db:check
```

This will:

- ✅ Test the connection to your Supabase database
- ✅ Verify pgvector extension is installed
- ✅ Show your PostgreSQL version

If you get an error, double-check your DATABASE_URL in `.env.local`.

## Step 6: Run Database Migration

Run the migration to create all tables and indexes:

```bash
npm run db:migrate
```

This script will:

- Create all tables (users, conversations, messages, flashcards, review_logs)
- Enable pgvector extension
- Create indexes for fast queries
- Set up HNSW indexes for vector search

## Step 7: Verify Setup (Optional)

Explore your database with Drizzle Studio:

```bash
npm run db:studio
```

This will open a web interface at `https://local.drizzle.studio` where you can browse your database tables.

## Database Schema

The migration creates the following tables:

- **users** - User accounts
- **conversations** - Chat conversations
- **messages** - Individual messages with vector embeddings
- **flashcards** - Flashcards with FSRS state and vector embeddings
- **review_logs** - Learning history for spaced repetition

## Vector Search Capabilities

Both `messages` and `flashcards` tables have vector columns:

- `messages.embedding` - 768-dimensional vectors for semantic search of conversations
- `flashcards.question_embedding` - 768-dimensional vectors for finding similar flashcards

These use HNSW indexes for fast approximate nearest neighbor (ANN) search.

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Check your password is correct in DATABASE_URL
2. Verify your IP is allowed (Supabase allows all IPs by default)
3. Make sure you're using the **Direct Connection** string, not Pooler

### pgvector Not Working

If vector searches fail:

1. Verify pgvector extension is enabled in Supabase dashboard
2. Re-run the migration: `psql $DATABASE_URL < drizzle/0000_initial.sql`

### Migration Errors

If migrations fail:

1. Drop and recreate your database in Supabase dashboard
2. Re-enable pgvector extension
3. Re-run migrations

## Next Steps

Once your database is set up:

1. Start the development server: `npm run dev`
2. Create an account at http://localhost:3000
3. All data will now be stored in your Supabase PostgreSQL database!

## Production Deployment

For production:

1. Use Supabase's **Production** database (not Development)
2. Enable **Connection Pooling** in Supabase for better performance
3. Set up database backups in Supabase dashboard
4. Consider enabling Row Level Security (RLS) for additional security

## Cost

Supabase's free tier includes:

- 500 MB database storage
- 1 GB file storage
- 50 MB file uploads
- 2 GB bandwidth

This is sufficient for development and small production workloads.
