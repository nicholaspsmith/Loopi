-- Enable pgcrypto extension for API key encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create api_keys table
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
	"encrypted_key" text NOT NULL,
	"key_preview" varchar(20) NOT NULL,
	"is_valid" boolean DEFAULT true NOT NULL,
	"last_validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add aiProvider and apiKeyId fields to messages table
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "ai_provider" varchar(20);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "api_key_id" uuid REFERENCES "api_keys"("id") ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "messages_ai_provider_idx" ON "messages"("ai_provider");
CREATE INDEX IF NOT EXISTS "messages_api_key_id_idx" ON "messages"("api_key_id");
