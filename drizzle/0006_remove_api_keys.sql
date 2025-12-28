-- Remove api_key_id column from messages table
ALTER TABLE "messages" DROP COLUMN IF EXISTS "api_key_id";

-- Drop api_keys table
DROP TABLE IF EXISTS "api_keys";

-- Drop associated indexes (CASCADE handles this, but being explicit)
DROP INDEX IF EXISTS "api_keys_user_id_idx";
DROP INDEX IF EXISTS "messages_api_key_id_idx";
