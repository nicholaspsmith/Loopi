# MemoryLoop

[![CI](https://github.com/nicholaspsmith/memoryloop/actions/workflows/ci.yml/badge.svg)](https://github.com/nicholaspsmith/memoryloop/actions/workflows/ci.yml)
[![Deploy](https://github.com/nicholaspsmith/memoryloop/actions/workflows/deploy.yml/badge.svg)](https://github.com/nicholaspsmith/memoryloop/actions/workflows/deploy.yml)

MemoryLoop is a web application that enables you to learn through conversation with Claude and convert those conversations into flashcards for spaced repetition practice.

## Features

- **Interactive Chat**: Have meaningful conversations with Claude about any topic
- **Smart Flashcard Generation**: Automatically convert Claude's responses into question-answer flashcards
- **Spaced Repetition**: Quiz yourself using FSRS-based spaced repetition for optimal learning
- **Progress Tracking**: Monitor your learning journey with detailed review statistics
- **Secure Authentication**: Password reset and email verification with rate limiting
- **Security Audit Trail**: Comprehensive logging of authentication events with IP geolocation

## Tech Stack

- **Framework**: Next.js 15.1 with React 19 and App Router
- **Language**: TypeScript 5.7
- **Authentication**: NextAuth.js 5
- **Database**: Hybrid architecture
  - PostgreSQL (users, conversations, messages, API keys)
  - LanceDB (flashcards, review logs, vector embeddings)
- **AI**: Anthropic Claude API, Jina Embeddings API
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest, Playwright, React Testing Library

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed database design rationale.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Anthropic API key ([get one here](https://console.anthropic.com/))

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nicholaspsmith/memoryloop.git
cd memoryloop
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```env
# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# PostgreSQL Database (Supabase or local)
DATABASE_URL=postgresql://user:pass@host:5432/database

# LanceDB (local file-based)
DATABASE_PATH=./data/lancedb

# AI Services
ANTHROPIC_API_KEY=your-anthropic-api-key
JINA_API_KEY=your-jina-api-key

# Email Configuration (SMTP)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-username
SMTP_PASS=your-ethereal-password
SMTP_FROM=noreply@memoryloop.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

**Email Setup for Development:**

For development, use [Ethereal Email](https://ethereal.email) - a fake SMTP service that captures emails without sending them:

1. Go to https://ethereal.email and click "Create Ethereal Account"
2. Copy the SMTP credentials to your `.env.local`
3. Password reset and verification emails will be captured at https://ethereal.email/messages

For production, configure a real SMTP provider (SendGrid, AWS SES, etc.).

**Note:** Users can optionally add their own Claude API key via the Settings page in the app (encrypted storage).

### 4. Initialize the database

```bash
npm run db:init
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run db:seed` - Seed database with sample data
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## Project Structure

````
memoryloop/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (protected)/       # Protected routes (chat, quiz)
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── chat/             # Chat interface components
│   ├── quiz/             # Quiz interface components
│   └── nav/              # Navigation components
├── lib/                   # Shared utilities
│   ├── db/               # Database client and queries
│   ├── claude/           # Claude API integration
│   ├── auth/             # NextAuth configuration
│   └── fsrs/             # FSRS scheduling logic
├── types/                 # TypeScript type definitions
└── tests/                 # Test files

## Usage

### Creating an Account

1. Navigate to the signup page
2. Enter your email, password, and name
3. Click "Sign up"

### Having a Conversation

1. Go to the Chat tab
2. Type your question or topic
3. Claude will respond with detailed information

### Generating Flashcards

1. After receiving a response from Claude, click "Generate Flashcards"
2. The system will automatically create question-answer pairs
3. View confirmation of how many flashcards were created

### Studying with Flashcards

1. Go to the Quiz tab
2. Review the question, think of your answer
3. Click "Show Answer" to reveal the correct answer
4. Rate your knowledge: Again, Hard, Good, or Easy
5. The FSRS algorithm will schedule your next review

## Development

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
````

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## Deployment

MemoryLoop uses Docker-based deployment with GitHub Actions CI/CD:

- **Production URL**: [memoryloop.nicholaspsmith.com](https://memoryloop.nicholaspsmith.com)
- **CI/CD**: Automated testing and deployment on merge to main

### Quick Start

```bash
# Local development with Docker
docker compose up -d

# Production deployment (see full guide)
./scripts/deploy.sh
```

### Documentation

- [Deployment Guide](docs/deployment.md) - VPS setup and deployment process
- [Operations Runbook](docs/operations.md) - Restart, rollback, backup procedures
- [GitHub Secrets Setup](docs/github-secrets-setup.md) - Required secrets configuration
- [Uptime Monitoring](docs/uptime-monitoring.md) - External monitoring setup

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please [open an issue](https://github.com/nicholaspsmith/memoryloop/issues) on GitHub.
