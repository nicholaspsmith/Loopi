import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/**
 * Drizzle ORM Schema for MemoryLoop with PostgreSQL
 *
 * Note: Vector embeddings are stored in LanceDB for efficient semantic search
 */

// ============================================================================
// Users Table
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 60 }).notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at'),
  passwordChangedAt: timestamp('password_changed_at'), // For session invalidation on password reset
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================================
// Flashcards Table (with FSRS state)
// ============================================================================
// Primary storage in PostgreSQL. Embeddings synced to LanceDB for vector search.

export const flashcards = pgTable('flashcards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  question: varchar('question', { length: 1000 }).notNull(),
  answer: text('answer').notNull(),
  // Note: Question embeddings stored in LanceDB for efficient vector search
  // FSRS state stored as JSONB
  fsrsState: jsonb('fsrs_state').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // Goal-based learning extensions (014-goal-based-learning)
  // Note: FK constraint with cascade delete defined via migration (forward reference to skillNodes)
  skillNodeId: uuid('skill_node_id')
    .notNull()
    .references(() => skillNodes.id, { onDelete: 'cascade' }),
  cardType: varchar('card_type', { length: 20 }).notNull().default('flashcard'),
  // 'flashcard' | 'multiple_choice' | 'scenario'
  cardMetadata: jsonb('card_metadata'),
  // For MC: { distractors: ["wrong1", "wrong2", "wrong3"] }
  // Card status: 'draft' | 'active' (017-multi-choice-distractors)
  status: varchar('status', { length: 20 }).notNull().default('active'),
})

// ============================================================================
// Review Logs Table (FSRS learning history)
// ============================================================================

export const reviewLogs = pgTable('review_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  flashcardId: uuid('flashcard_id')
    .notNull()
    .references(() => flashcards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: integer('state').notNull(), // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: timestamp('due').notNull(),
  stability: real('stability').notNull(), // FSRS stability (decimal)
  difficulty: real('difficulty').notNull(), // FSRS difficulty (decimal)
  elapsedDays: real('elapsed_days').notNull(), // Days since last review (decimal)
  lastElapsedDays: real('last_elapsed_days').notNull(), // Previous elapsed days (decimal)
  scheduledDays: real('scheduled_days').notNull(), // Days until next review (decimal)
  review: timestamp('review').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Distractors table for multiple choice study mode (017-multi-choice-distractors)
export const distractors = pgTable(
  'distractors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flashcardId: uuid('flashcard_id')
      .notNull()
      .references(() => flashcards.id, { onDelete: 'cascade' }),
    content: varchar('content', { length: 1000 }).notNull(),
    position: integer('position').notNull(), // 0, 1, or 2 (3 distractors per card)
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('distractors_flashcard_position_idx').on(table.flashcardId, table.position),
    index('distractors_flashcard_id_idx').on(table.flashcardId),
  ]
)

// ============================================================================
// Password Reset Tokens Table
// ============================================================================

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// Email Verification Tokens Table
// ============================================================================

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// Security Logs Table
// ============================================================================

export const securityLogs = pgTable('security_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'),
  tokenId: varchar('token_id', { length: 64 }),
  outcome: varchar('outcome', { length: 20 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// Email Queue Table
// ============================================================================

export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  textBody: text('text_body').notNull(),
  htmlBody: text('html_body'),
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
})

// ============================================================================
// Rate Limits Table
// ============================================================================

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  attempts: jsonb('attempts').notNull().default('[]'),
  windowStart: timestamp('window_start').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============================================================================
// Type exports for TypeScript
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Flashcard = typeof flashcards.$inferSelect
export type NewFlashcard = typeof flashcards.$inferInsert

export type Distractor = typeof distractors.$inferSelect
export type NewDistractor = typeof distractors.$inferInsert

export type ReviewLog = typeof reviewLogs.$inferSelect
export type NewReviewLog = typeof reviewLogs.$inferInsert

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert

export type SecurityLog = typeof securityLogs.$inferSelect
export type NewSecurityLog = typeof securityLogs.$inferInsert

export type EmailQueueEntry = typeof emailQueue.$inferSelect
export type NewEmailQueueEntry = typeof emailQueue.$inferInsert

export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert

// ============================================================================
// Learning Goals Table (014-goal-based-learning)
// ============================================================================

export const learningGoals = pgTable('learning_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // 'active' | 'paused' | 'completed' | 'archived'
  masteryPercentage: integer('mastery_percentage').notNull().default(0),
  totalTimeSeconds: integer('total_time_seconds').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  archivedAt: timestamp('archived_at'),
})

export type LearningGoal = typeof learningGoals.$inferSelect
export type NewLearningGoal = typeof learningGoals.$inferInsert

// ============================================================================
// Skill Trees Table (014-goal-based-learning)
// ============================================================================

export const skillTrees = pgTable('skill_trees', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id')
    .notNull()
    .unique()
    .references(() => learningGoals.id, { onDelete: 'cascade' }),
  generatedBy: varchar('generated_by', { length: 20 }).notNull().default('ai'),
  // 'ai' | 'curated'
  curatedSourceId: varchar('curated_source_id', { length: 100 }),
  // For future curated trees: 'aws-saa-c03', 'comptia-a-plus', etc.
  nodeCount: integer('node_count').notNull().default(0),
  maxDepth: integer('max_depth').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  regeneratedAt: timestamp('regenerated_at'),
})

export type SkillTree = typeof skillTrees.$inferSelect
export type NewSkillTree = typeof skillTrees.$inferInsert

// ============================================================================
// Skill Nodes Table (014-goal-based-learning)
// ============================================================================

export const skillNodes = pgTable('skill_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id')
    .notNull()
    .references(() => skillTrees.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  // null for root nodes (depth 0) - self-reference handled via relation
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  depth: integer('depth').notNull(),
  // 0 = Goal (root), 1 = Category, 2 = Topic, 3 = Subtopic
  path: varchar('path', { length: 100 }).notNull(),
  // Materialized path: "1", "1.2", "1.2.3" for efficient subtree queries
  sortOrder: integer('sort_order').notNull().default(0),
  // Ordering among siblings
  isEnabled: boolean('is_enabled').notNull().default(true),
  // User can disable nodes to exclude from study
  masteryPercentage: integer('mastery_percentage').notNull().default(0),
  // 0-100, calculated from linked cards or child nodes
  cardCount: integer('card_count').notNull().default(0),
  // Denormalized count of linked flashcards
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type SkillNode = typeof skillNodes.$inferSelect
export type NewSkillNode = typeof skillNodes.$inferInsert

// ============================================================================
// User Achievements Table (014-goal-based-learning)
// ============================================================================

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  achievementKey: varchar('achievement_key', { length: 50 }).notNull(),
  // 'first_10_cards', 'goal_50_percent', 'perfect_session', etc.
  unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
  metadata: jsonb('metadata'),
  // Context about the unlock: { goalId, cardCount, sessionId, etc. }
})

export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert

// ============================================================================
// User Titles Table (014-goal-based-learning)
// ============================================================================

export const userTitles = pgTable('user_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentTitle: varchar('current_title', { length: 50 }).notNull().default('Novice'),
  totalCardsMastered: integer('total_cards_mastered').notNull().default(0),
  totalGoalsCompleted: integer('total_goals_completed').notNull().default(0),
  titleHistory: jsonb('title_history').notNull().default([]),
  // [{ title: "Apprentice", earnedAt: "2025-01-15T..." }, ...]
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type UserTitle = typeof userTitles.$inferSelect
export type NewUserTitle = typeof userTitles.$inferInsert

// ============================================================================
// Topic Analytics Table (014-goal-based-learning)
// ============================================================================

export const topicAnalytics = pgTable('topic_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  normalizedTopic: varchar('normalized_topic', { length: 200 }).notNull().unique(),
  // Lowercase, trimmed, prefixes removed
  originalExamples: jsonb('original_examples').notNull().default([]),
  // ["Learn Kubernetes", "kubernetes admin", "K8s"] - first 10 variations
  userCount: integer('user_count').notNull().default(1),
  goalCount: integer('goal_count').notNull().default(1),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  hasCuratedTree: boolean('has_curated_tree').notNull().default(false),
})

export type TopicAnalytic = typeof topicAnalytics.$inferSelect
export type NewTopicAnalytic = typeof topicAnalytics.$inferInsert

// ============================================================================
// Background Jobs Queue Table (for async flashcard/distractor generation)
// ============================================================================

export const backgroundJobs = pgTable('background_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  // 'flashcard_generation' | 'distractor_generation'
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // 'pending' | 'processing' | 'completed' | 'failed'
  payload: jsonb('payload').notNull(),
  // Job-specific input data
  result: jsonb('result'),
  // Job output (e.g., created flashcard IDs)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  priority: integer('priority').notNull().default(0),
  // Higher = more urgent
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  error: text('error'),
  nextRetryAt: timestamp('next_retry_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type BackgroundJob = typeof backgroundJobs.$inferSelect
export type NewBackgroundJob = typeof backgroundJobs.$inferInsert

// Job type constants
export const JobType = {
  FLASHCARD_GENERATION: 'flashcard_generation',
  DISTRACTOR_GENERATION: 'distractor_generation',
  SKILL_TREE_GENERATION: 'skill_tree_generation',
} as const

export type JobTypeValue = (typeof JobType)[keyof typeof JobType]

// Job status constants
export const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export type JobStatusValue = (typeof JobStatus)[keyof typeof JobStatus]

// ============================================================================
// Job Rate Limits Table (for preventing abuse)
// ============================================================================

export const jobRateLimits = pgTable(
  'job_rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobType: varchar('job_type', { length: 50 }).notNull(),
    windowStart: timestamp('window_start').notNull(),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('job_rate_limits_user_type_window_idx').on(
      table.userId,
      table.jobType,
      table.windowStart
    ),
  ]
)

export type JobRateLimit = typeof jobRateLimits.$inferSelect
export type NewJobRateLimit = typeof jobRateLimits.$inferInsert

// ============================================================================
// Study Sessions Table (quiz progress persistence)
// ============================================================================

export const studySessions = pgTable(
  'study_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => learningGoals.id, { onDelete: 'cascade' }),
    mode: varchar('mode', { length: 20 }).notNull(),
    // 'flashcard' | 'multiple_choice' | 'timed' | 'mixed'
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // 'active' | 'completed' | 'abandoned'
    cardIds: jsonb('card_ids').notNull(), // string[] - card IDs for this session
    currentIndex: integer('current_index').notNull().default(0),
    responses: jsonb('responses').notNull().default([]),
    // Array of { cardId: string, rating: number, timeMs: number }
    startedAt: timestamp('started_at').notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    completedAt: timestamp('completed_at'),
    // Timed mode specific
    timedSettings: jsonb('timed_settings'),
    // { durationSeconds: number, pointsPerCard: number }
    timeRemainingMs: integer('time_remaining_ms'),
    score: integer('score'),
    // Guided mode specific
    isGuided: boolean('is_guided').notNull().default(false),
    currentNodeId: uuid('current_node_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('study_sessions_user_goal_status_idx').on(table.userId, table.goalId, table.status),
    index('study_sessions_expires_at_idx').on(table.expiresAt),
  ]
)

export type StudySession = typeof studySessions.$inferSelect
export type NewStudySession = typeof studySessions.$inferInsert

// ============================================================================
// Drizzle Relations (014-goal-based-learning)
// ============================================================================

export const learningGoalsRelations = relations(learningGoals, ({ one }) => ({
  user: one(users, {
    fields: [learningGoals.userId],
    references: [users.id],
  }),
  skillTree: one(skillTrees, {
    fields: [learningGoals.id],
    references: [skillTrees.goalId],
  }),
}))

export const skillTreesRelations = relations(skillTrees, ({ one, many }) => ({
  goal: one(learningGoals, {
    fields: [skillTrees.goalId],
    references: [learningGoals.id],
  }),
  nodes: many(skillNodes),
}))

export const skillNodesRelations = relations(skillNodes, ({ one, many }) => ({
  tree: one(skillTrees, {
    fields: [skillNodes.treeId],
    references: [skillTrees.id],
  }),
  parent: one(skillNodes, {
    fields: [skillNodes.parentId],
    references: [skillNodes.id],
    relationName: 'parentChild',
  }),
  children: many(skillNodes, { relationName: 'parentChild' }),
  flashcards: many(flashcards),
}))

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  skillNode: one(skillNodes, {
    fields: [flashcards.skillNodeId],
    references: [skillNodes.id],
  }),
}))

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
}))

export const userTitlesRelations = relations(userTitles, ({ one }) => ({
  user: one(users, {
    fields: [userTitles.userId],
    references: [users.id],
  }),
}))

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  goal: one(learningGoals, {
    fields: [studySessions.goalId],
    references: [learningGoals.id],
  }),
}))
