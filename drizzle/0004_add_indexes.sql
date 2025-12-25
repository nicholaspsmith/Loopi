-- Add indexes for performance optimization
-- These indexes improve query performance for common operations

-- Password reset tokens: token hash lookup (for validation)
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash");

-- Password reset tokens: expiration cleanup queries
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" ("expires_at");

-- Email verification tokens: token hash lookup (for validation)
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_token_hash" ON "email_verification_tokens" ("token_hash");

-- Email verification tokens: expiration cleanup queries
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_expires_at" ON "email_verification_tokens" ("expires_at");

-- Security logs: user ID lookup (for user-specific queries)
CREATE INDEX IF NOT EXISTS "idx_security_logs_user_id" ON "security_logs" ("user_id");

-- Security logs: email lookup (for email-specific queries)
CREATE INDEX IF NOT EXISTS "idx_security_logs_email" ON "security_logs" ("email");

-- Security logs: created_at for retention cleanup and time-based queries
CREATE INDEX IF NOT EXISTS "idx_security_logs_created_at" ON "security_logs" ("created_at");

-- Email queue: status and next_retry_at for queue processing
CREATE INDEX IF NOT EXISTS "idx_email_queue_status_next_retry" ON "email_queue" ("status", "next_retry_at");

-- Rate limits: windowStart for cleanup queries
CREATE INDEX IF NOT EXISTS "idx_rate_limits_window_start" ON "rate_limits" ("window_start");
