# Research: CI/CD Pipeline & Production Deployment

**Date**: 2025-12-19 | **Feature**: 002-ci-cd-deployment

## Executive Summary

All NEEDS CLARIFICATION items have been resolved. Research confirms the chosen technology stack is well-supported with 2025 best practices available for each component.

---

## 1. GitHub Actions CI/CD with Next.js 15

### Decision: Separate Workflows with Parallel Jobs

**Rationale**: Separating CI (lint/test) from CD (build/deploy) provides faster feedback and clearer failure isolation. Running lint, typecheck, and unit tests in parallel reduces total CI time.

**Alternatives Considered**:

- Single monolithic workflow: Rejected - slower feedback, harder to debug
- GitLab CI: Rejected - already using GitHub, no advantage

### Key Implementation Details

**Workflow Structure**:

```
ci.yml:
  ├── lint (parallel)
  ├── typecheck (parallel)
  ├── unit-tests (parallel)
  └── format-check (parallel)

deploy.yml:
  ├── e2e-tests (needs: ci)
  ├── build-push (needs: e2e-tests)
  └── deploy (needs: build-push)
```

**Caching Strategy**:

- npm cache via `actions/setup-node@v4` with `cache: 'npm'`
- Next.js build cache via `actions/cache@v4` targeting `.next/cache`
- Docker layer cache via `docker/build-push-action@v6` with `cache-from: type=gha`

**Secrets Required**:

- `VPS_SSH_KEY`: Private SSH key for deployment
- `VPS_HOST`: Hetzner VPS IP address
- `VPS_USER`: Deploy user (typically `deploy`)
- `VPS_PORT`: SSH port (22 or custom)
- `SENTRY_AUTH_TOKEN`: For source map uploads

---

## 2. Docker Multi-Stage Builds with Next.js 15

### Decision: Three-Stage Alpine Build with Standalone Output

**Rationale**: Alpine base image (~220MB vs 1.6GB) combined with Next.js standalone output achieves 80%+ size reduction. Three-stage build separates concerns for optimal caching.

**Alternatives Considered**:

- node:20-slim: Rejected - larger image, not worth compatibility tradeoff
- Single-stage build: Rejected - 2-4GB image size unacceptable

### Key Implementation Details

**Stage Structure**:

1. **deps**: Install production dependencies only
2. **builder**: Install all deps, build Next.js
3. **runner**: Copy standalone output, run as non-root user

**Existing Implementation** (Dockerfile already exists):

- Uses node:20-alpine ✓
- Implements three-stage build ✓
- Creates non-root user (nextjs:nodejs) ✓
- Includes health check ✓
- Copies standalone output correctly ✓

**Expected Image Size**: 150-250MB (vs 2-4GB unoptimized)

---

## 3. Nginx Reverse Proxy with SSL

### Decision: Certbot Webroot with TLS 1.3

**Rationale**: Webroot mode allows certificate renewal without downtime. TLS 1.3 provides faster handshakes and better security.

**Alternatives Considered**:

- Certbot standalone: Rejected - requires stopping Nginx during renewal
- Caddy: Rejected - Nginx more widely documented, already familiar

### Key Implementation Details

**SSL Configuration**:

- Protocols: TLSv1.2 TLSv1.3 only (no legacy)
- Session timeout: 1 day
- OCSP stapling enabled
- DH parameters: 4096-bit

**Security Headers**:

- HSTS: 2 years, includeSubDomains, preload
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: Basic policy (needs app-specific tuning)

**Auto-Renewal**:

- Systemd timer runs twice daily (built into Certbot)
- Renewal hook reloads Nginx after success

---

## 4. Sentry Error Tracking with Next.js 15

### Decision: @sentry/nextjs with Client and Server DSNs

**Rationale**: Official package provides automatic instrumentation for App Router, Server Components, and server actions. Free tier sufficient for initial deployment.

**Alternatives Considered**:

- Manual error logging: Rejected - no stack traces, no aggregation
- LogRocket: Rejected - overkill for error tracking alone

### Key Implementation Details

**Configuration Files**:

- `instrumentation-client.ts`: Client-side initialization
- `sentry.server.config.ts`: Server-side initialization
- `sentry.edge.config.ts`: Edge runtime initialization
- `app/global-error.tsx`: React error boundary

**Environment Variables**:

- `NEXT_PUBLIC_SENTRY_DSN`: Client-side DSN (public)
- `SENTRY_DSN`: Server-side DSN (private)
- `SENTRY_AUTH_TOKEN`: Build-time source map uploads

**Performance Sampling**:

- Development: 100% trace sampling
- Production: 10% trace sampling (controls quota usage)

**PII Filtering**:

- Use `beforeSend` hook to scrub emails, IPs, cookies
- Client-side filtering preferred (data never leaves browser)

---

## 5. VPS Infrastructure (Hetzner CX22)

### Decision: Ubuntu 22.04 LTS with Docker

**Rationale**: Ubuntu 22.04 LTS provides 5-year support, widespread documentation. Hetzner CX22 offers best price-performance for requirements.

**Alternatives Considered**:

- Debian 12: Rejected - fewer tutorials, similar functionality
- Alpine Linux: Rejected - not well suited for host OS

### Key Implementation Details

**Security Hardening**:

- UFW firewall: Allow only 22, 80, 443
- SSH: Key-only authentication, password disabled
- fail2ban: Prevent brute-force attacks
- Non-root deploy user with sudo access

**Directory Structure**:

```
/opt/memoryloop/
├── data/           # LanceDB persistent storage
├── config/         # Environment files
├── backups/        # Local backup staging
└── logs/           # Application logs
```

---

## 6. Backblaze B2 Backups

### Decision: S3-Compatible API with Daily Cron

**Rationale**: B2 is 4x cheaper than S3 ($0.005/GB vs $0.023/GB) with identical API compatibility. 7-day retention meets requirements.

**Alternatives Considered**:

- AWS S3: Rejected - higher cost, no additional benefit
- Local VPS only: Rejected - no off-site protection

### Key Implementation Details

**Backup Strategy**:

- Daily cron job at 3:00 AM UTC
- Compress LanceDB directory with gzip
- Upload via `rclone` or `b2` CLI
- Retain 7 daily backups (auto-delete older)

**Environment Variables**:

- `B2_KEY_ID`: Backblaze application key ID
- `B2_APP_KEY`: Backblaze application key
- `B2_BUCKET`: Target bucket name

---

## 7. Zero-Downtime Deployment

### Decision: Health Check Validation with Graceful Rollover

**Rationale**: Start new container, validate health, then stop old container ensures no dropped requests.

**Alternatives Considered**:

- Blue-green deployment: Rejected - requires 2x resources, overkill
- Kubernetes rolling update: Rejected - out of scope

### Key Implementation Details

**Deployment Sequence**:

1. Pull new Docker image (tagged with commit SHA)
2. Start new container on different port
3. Wait for health check (30s timeout)
4. Update Nginx upstream to new container
5. Reload Nginx (graceful)
6. Wait for old connections to drain (10s)
7. Stop old container

**Health Check Endpoint**: `/api/health`

- Database connectivity
- Ollama availability (optional)
- Anthropic API key validity (optional)

**Rollback**:

- Manual script to revert to previous image tag
- Previous 5 image tags retained in ghcr.io

---

## Summary Table

| Technology         | Decision                | Key Benefit                               |
| ------------------ | ----------------------- | ----------------------------------------- |
| CI/CD              | GitHub Actions          | Native GitHub integration, free tier      |
| Container Registry | ghcr.io                 | Free for public repos, no auth complexity |
| Base Image         | node:20-alpine          | 7x smaller than full Debian               |
| VPS                | Hetzner CX22            | $5/mo for 4GB RAM, 2 vCPU                 |
| Reverse Proxy      | Nginx + Certbot         | Mature, well-documented                   |
| SSL                | TLS 1.3 + Let's Encrypt | Free, automatic renewal                   |
| Error Tracking     | Sentry                  | Full stack traces, App Router support     |
| Backups            | Backblaze B2            | $0.005/GB, S3-compatible                  |
| Deployment         | Docker Compose          | Simple, sufficient for single VPS         |
