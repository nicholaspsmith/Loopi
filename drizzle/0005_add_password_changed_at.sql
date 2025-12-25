-- Add password_changed_at column to users table for session invalidation
-- This enables invalidating all active sessions when a user resets their password

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;

-- Set password_changed_at to created_at for existing users (retroactive initialization)
-- This ensures existing sessions remain valid until next password change
UPDATE "users" SET "password_changed_at" = "created_at" WHERE "password_changed_at" IS NULL;
