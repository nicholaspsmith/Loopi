import { z } from 'zod'
import { State, Rating } from 'ts-fsrs'

// ============================================================================
// User Entity
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().min(3).max(255),
  name: z.string().min(1).max(100).nullable(),
  passwordHash: z.string().min(60).max(60), // bcrypt hash is exactly 60 chars
  emailVerified: z.boolean().default(false),
  emailVerifiedAt: z.number().int().positive().nullable(),
  passwordChangedAt: z.number().int().positive().nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
})

export type User = z.infer<typeof UserSchema>

// Public-facing user (no password hash)
export const PublicUserSchema = UserSchema.omit({ passwordHash: true })
export type PublicUser = z.infer<typeof PublicUserSchema>

// ============================================================================
// Conversation Entity
// ============================================================================

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200).nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  messageCount: z.number().int().nonnegative().default(0),
})

export type Conversation = z.infer<typeof ConversationSchema>

// ============================================================================
// Message Entity
// ============================================================================

export const MessageRoleSchema = z.enum(['user', 'assistant'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string().min(1).max(50000), // Max 50k characters
  embedding: z.array(z.number()).length(768).nullable(), // Ollama nomic-embed-text
  createdAt: z.number().int().positive(),
  hasFlashcards: z.boolean().default(false),
  aiProvider: z.enum(['claude', 'ollama']).nullable().optional(),
  apiKeyId: z.string().uuid().nullable().optional(),
})

export type Message = z.infer<typeof MessageSchema>

// ============================================================================
// Flashcard Entity (with FSRS state)
// ============================================================================

// FSRS Card schema
export const FSRSCardSchema = z.object({
  due: z.date(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  learning_steps: z.number().int().nonnegative().default(0),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.nativeEnum(State), // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: z.date().optional(),
})

export type FSRSCard = z.infer<typeof FSRSCardSchema>

// Flashcard schema
export const FlashcardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
  questionEmbedding: z.array(z.number()).length(768).nullable(),
  createdAt: z.number().int().positive(),
  fsrsState: FSRSCardSchema,
})

export type Flashcard = z.infer<typeof FlashcardSchema>

// ============================================================================
// ReviewLog Entity
// ============================================================================

export const ReviewLogSchema = z.object({
  id: z.string().uuid(),
  flashcardId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.nativeEnum(Rating), // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: z.nativeEnum(State), // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: z.date(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsed_days: z.number().nonnegative(),
  last_elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  review: z.date(),
})

export type ReviewLog = z.infer<typeof ReviewLogSchema>
