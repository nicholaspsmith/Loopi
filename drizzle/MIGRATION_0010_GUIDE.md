# Running Migration 0010

## Quick Start

```bash
# Run the migration
npm run db:migrate
```

## Pre-Migration Checklist

- [ ] Backup production database
- [ ] Verify no code references deprecated tables (conversations, messages, decks, deck_cards)
- [ ] Test on staging environment first
- [ ] Review migration file: `drizzle/0010_drop_deprecated_tables.sql`
- [ ] Review documentation: `drizzle/0010_drop_deprecated_tables.md`

## What This Migration Does

Removes deprecated tables from the v1 chat-based and deck-based features:

- Drops `conversation_id` and `message_id` columns from `flashcards` table
- Drops `deck_cards` table (junction table)
- Drops `decks` table
- Drops `messages` table
- Drops `conversations` table

## Verification After Migration

```sql
-- Verify flashcards table no longer has conversation_id or message_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'flashcards'
  AND column_name IN ('conversation_id', 'message_id');
-- Should return 0 rows

-- Verify deprecated tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'messages', 'decks', 'deck_cards');
-- Should return 0 rows

-- Verify flashcards table still works
SELECT COUNT(*) FROM flashcards;
-- Should return count without errors
```

## Rollback (if needed)

**WARNING**: Rollback will NOT restore data. Only recreate empty tables.

```sql
-- This would require recreating tables from migrations 0003 and 0004
-- Data cannot be recovered
-- Only use if absolutely necessary
```

## Support

If issues occur:

1. Check logs: `docker-compose logs postgres`
2. Verify migration status: `SELECT * FROM __drizzle_migrations;`
3. Contact database administrator
4. Do NOT attempt manual rollback without backup

## Related Files

- Migration SQL: `/Users/nick/Code/memoryloop/drizzle/0010_drop_deprecated_tables.sql`
- Documentation: `/Users/nick/Code/memoryloop/drizzle/0010_drop_deprecated_tables.md`
- Schema: `/Users/nick/Code/memoryloop/lib/db/drizzle-schema.ts`
- Related PR: #258
- Related Issues: #227, #229, #251
