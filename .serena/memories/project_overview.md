# Loopi Project Overview

## Purpose

Loopi is a spaced repetition learning application that uses AI to generate flashcards from conversations. Users can:

- Chat with Claude AI to learn topics
- Generate flashcards from chat content
- Study using spaced repetition (FSRS algorithm)
- Organize learning into goals with skill trees
- Use multi-choice study mode with AI-generated distractors

## Tech Stack

### Core

- **Language**: TypeScript 5.7.0 (strict mode)
- **Runtime**: Node.js 20+
- **Framework**: Next.js 16.0.10 (App Router)
- **UI**: React 19.2.3, Tailwind CSS 4.0.0

### Database

- **PostgreSQL**: Users, conversations, messages, API keys, flashcards (via postgres 3.4.7, drizzle-orm 0.45.1)
- **LanceDB 0.22.3**: Vector embeddings for semantic search

### AI/ML

- **Anthropic Claude SDK 0.71.2**: Chat and content generation
- **Jina Embeddings API**: Vector embeddings (jina-embeddings-v3)
- **ts-fsrs 5.2.3**: Spaced repetition scheduling

### Authentication

- **NextAuth 5.0.0-beta.30**: Session management

### Testing

- **Vitest 4.0.15**: Unit and integration tests
- **Playwright 1.57.0**: E2E tests
- **Testing Library**: React component tests

## Project Structure

```
app/                    # Next.js App Router pages and API routes
├── api/               # API endpoints
├── (app)/             # Authenticated app pages
└── (auth)/            # Auth pages (login, register)

lib/                    # Core business logic
├── ai/                # AI generators (distractors, skill trees, cards)
├── claude/            # Claude API client and flashcard generator
├── db/                # Database operations and schema
│   ├── drizzle-schema.ts
│   └── operations/    # CRUD operations per entity
├── auth/              # NextAuth configuration
└── logger.ts          # Structured logging

components/             # Reusable UI components
├── ui/                # Base UI components
└── (feature)/         # Feature-specific components

tests/                  # Test files
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/               # Playwright E2E tests

specs/                  # Feature specifications (speckit)
drizzle/               # Database migrations
```
