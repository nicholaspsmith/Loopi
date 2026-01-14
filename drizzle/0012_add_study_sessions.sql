-- Study Sessions Table for quiz progress persistence
CREATE TABLE IF NOT EXISTS "study_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "goal_id" uuid NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  "mode" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'active',
  "card_ids" jsonb NOT NULL,
  "current_index" integer NOT NULL DEFAULT 0,
  "responses" jsonb NOT NULL DEFAULT '[]',
  "started_at" timestamp NOT NULL DEFAULT NOW(),
  "last_activity_at" timestamp NOT NULL DEFAULT NOW(),
  "expires_at" timestamp NOT NULL,
  "completed_at" timestamp,
  "timed_settings" jsonb,
  "time_remaining_ms" integer,
  "score" integer,
  "is_guided" boolean NOT NULL DEFAULT false,
  "current_node_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

-- Index for finding active sessions for a user/goal quickly
CREATE INDEX IF NOT EXISTS "study_sessions_user_goal_status_idx" 
  ON "study_sessions"("user_id", "goal_id", "status");

-- Index for expiration cleanup job
CREATE INDEX IF NOT EXISTS "study_sessions_expires_at_idx" 
  ON "study_sessions"("expires_at");
