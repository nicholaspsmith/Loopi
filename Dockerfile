# Multi-stage Dockerfile for Next.js production build
# Optimized for small image size and fast builds

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for Next.js build (non-sensitive only)
ARG NEXT_PUBLIC_APP_URL

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install all dependencies (including devDependencies) for build
RUN npm ci

# Build Next.js application
# Note: DATABASE_URL is a placeholder for build-time only (not used for actual DB connections)
# The real DATABASE_URL is provided at runtime via docker-compose or environment
# SKIP_ENV_VALIDATION=true skips API key validation (JINA_API_KEY, ANTHROPIC_API_KEY) during build
# API_KEY_ENCRYPTION_SECRET uses a placeholder at build time - real value is injected at runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
ENV API_KEY_ENCRYPTION_SECRET=placeholder-build-secret-32char
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Build with Sentry auth token passed as a BuildKit secret (not baked into image)
# The secret is mounted at /run/secrets/sentry_auth_token during build only
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN=$(cat /run/secrets/sentry_auth_token 2>/dev/null || echo "") \
    npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install postgresql-client for health checks
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy migration files and scripts needed for startup
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/db-migrate.ts ./scripts/
COPY --from=builder /app/scripts/post-migrate.ts ./scripts/
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/lib ./lib

# Copy entrypoint script and database init SQL
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
COPY scripts/init-db.sql /app/scripts/

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
