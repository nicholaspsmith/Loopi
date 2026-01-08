# Suggested Commands for Loopi

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run E2E tests (Playwright)
npx playwright test

# Run specific test file
npx vitest tests/unit/specific.test.ts
```

## Linting & Formatting

```bash
# Run ESLint
npm run lint
# or
npx eslint .

# Run Next.js lint
npx next lint

# Check formatting
npm run format:check

# Fix formatting
npm run format

# TypeScript type checking
npm run typecheck
# or
npx tsc --noEmit
```

## Database

```bash
# Run migrations
npm run db:migrate

# Generate Drizzle migrations
npx drizzle-kit generate

# Push schema changes (dev)
npx drizzle-kit push
```

## Git (macOS/Darwin)

```bash
# Standard git commands work
git status
git add .
git commit -m "message"
git push

# View recent commits
git log --oneline -10
```

## System Utils (Darwin/macOS)

```bash
# File operations
ls -la
find . -name "*.ts"
grep -r "pattern" .

# Process management
lsof -i :3000  # Check port usage
```
