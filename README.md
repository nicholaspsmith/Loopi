# MemoryLoop

MemoryLoop is a web application that enables you to learn through conversation with Claude and convert those conversations into flashcards for spaced repetition practice.

## Features

- **Interactive Chat**: Have meaningful conversations with Claude about any topic
- **Smart Flashcard Generation**: Automatically convert Claude's responses into question-answer flashcards
- **Spaced Repetition**: Quiz yourself using FSRS-based spaced repetition for optimal learning
- **Progress Tracking**: Monitor your learning journey with detailed review statistics

## Tech Stack

- **Framework**: Next.js 15.1 with React 19 and App Router
- **Language**: TypeScript 5.7
- **Authentication**: NextAuth.js 5
- **Database**: LanceDB (vector database)
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest, Playwright, React Testing Library

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

# Anthropic API
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Database
DATABASE_PATH=./data/lancedb
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

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

MemoryLoop can be deployed to Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy

For detailed deployment instructions, see [specs/002-ci-cd-deployment/spec.md](specs/002-ci-cd-deployment/spec.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please [open an issue](https://github.com/nicholaspsmith/memoryloop/issues) on GitHub.
