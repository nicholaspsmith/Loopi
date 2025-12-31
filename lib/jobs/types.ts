/**
 * Background Job Types and Interfaces
 *
 * Defines types for the background job processing system.
 * Jobs are persisted in PostgreSQL and processed asynchronously.
 */

import type { backgroundJobs } from '@/lib/db/drizzle-schema'

// Re-export schema constants for convenience
export { JobType, JobStatus } from '@/lib/db/drizzle-schema'

// Type aliases from schema
export type BackgroundJob = typeof backgroundJobs.$inferSelect
export type NewBackgroundJob = typeof backgroundJobs.$inferInsert

// Job type literal union
export type JobTypeValue =
  | 'flashcard_generation'
  | 'distractor_generation'
  | 'skill_tree_generation'

// Job status literal union
export type JobStatusValue = 'pending' | 'processing' | 'completed' | 'failed'

// Payload types for each job type
export interface FlashcardGenerationPayload {
  messageId: string
  content: string
  goalId?: string
  nodeId?: string
}

export interface DistractorGenerationPayload {
  flashcardId: string
  question: string
  answer: string
}

export interface SkillTreeGenerationPayload {
  goalId: string
  topic: string
  feedback?: string
}

// Union of all payload types
export type JobPayload =
  | FlashcardGenerationPayload
  | DistractorGenerationPayload
  | SkillTreeGenerationPayload

// Result types for each job type
export interface FlashcardGenerationResult {
  flashcardIds: string[]
  count: number
}

export interface DistractorGenerationResult {
  distractors: string[]
  flashcardId: string
}

export interface SkillTreeGenerationResult {
  treeId: string
  nodeCount: number
  depth: number
}

// Union of all result types
export type JobResult =
  | FlashcardGenerationResult
  | DistractorGenerationResult
  | SkillTreeGenerationResult

// Job handler function signature
export type JobHandler<P = JobPayload, R = JobResult> = (
  payload: P,
  job: BackgroundJob
) => Promise<R>

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// Job creation request (from API)
export interface CreateJobRequest {
  type: JobTypeValue
  payload: JobPayload
  priority?: number
}

// Job status response (to frontend)
export interface JobStatusResponse {
  id: string
  type: JobTypeValue
  status: JobStatusValue
  result?: JobResult
  error?: string
  attempts: number
  maxAttempts: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

// Rate limit error response
export interface RateLimitErrorResponse {
  error: string
  code: 'RATE_LIMITED'
  retryAfter: number // seconds until rate limit resets
}
