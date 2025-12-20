# Implementation Plan: CI/CD Pipeline & Production Deployment

**Branch**: `002-ci-cd-deployment` | **Date**: 2025-12-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ci-cd-deployment/spec.md`

## Summary

Implement a complete CI/CD pipeline and production deployment infrastructure for the MemoryLoop Next.js application. The system will use GitHub Actions for CI/CD, Docker for containerization, GitHub Container Registry (ghcr.io) for image storage, and deploy to a Hetzner CX22 VPS with Nginx reverse proxy and Let's Encrypt SSL. Monitoring via UptimeRobot and Sentry, with daily backups to Backblaze B2.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x (Next.js 15)
**Primary Dependencies**: Next.js 15, Docker, Docker Compose, Nginx, Certbot, GitHub Actions
**Storage**: LanceDB (file-based vector database), Backblaze B2 (backups)
**Testing**: Vitest (unit), Playwright (E2E), GitHub Actions (CI)
**Target Platform**: Hetzner CX22 VPS (Ubuntu 22.04 LTS), 4GB RAM, 2 vCPU, 40GB SSD
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: CI < 10 minutes, Deployment < 5 minutes, Health check < 30s
**Constraints**: Infrastructure cost < $15/month, Docker image < 500MB, Zero-downtime deploys
**Scale/Scope**: Single VPS, single domain (memoryloop.nicholaspsmith.com)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status | Evidence                                                                                   |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------ |
| I. Documentation-First | PASS   | Feature spec complete with 6 user stories, 38 functional requirements, acceptance criteria |
| II. Test-First (TDD)   | PASS   | CI pipeline enforces tests before merge; infrastructure tests via scripts                  |
| III. Modularity        | PASS   | User stories are independently testable (P1→P2→P3→P4→P5→P6 progression)                    |
| IV. Simplicity (YAGNI) | PASS   | Single VPS, no K8s, no blue-green, no canary - explicit out of scope                       |
| V. Observability       | PASS   | Structured JSON logs (FR-034), Sentry error tracking (FR-037), UptimeRobot monitoring      |
| VI. Atomic Commits     | PASS   | Plan follows .claude/rules.md; one logical change per commit                               |

**Gate Status**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-cd-deployment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (deployment contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Existing application structure
app/                     # Next.js app router pages
lib/                     # Core library code
  ├── db/               # LanceDB operations
  ├── auth/             # Authentication
  └── flashcard/        # Flashcard logic
components/              # React components
tests/
  ├── unit/             # Vitest unit tests
  ├── integration/      # Playwright E2E tests
  └── contract/         # API contract tests

# New infrastructure (this feature)
.github/
  └── workflows/
      ├── ci.yml                  # Lint, typecheck, unit tests, format check
      ├── integration.yml         # Playwright E2E tests (see research.md Section 1)
      └── deploy.yml              # Build, push to ghcr.io, deploy to VPS

# Docker configuration (Dockerfile already exists at repo root)
Dockerfile                        # Multi-stage production build (existing)
.dockerignore                     # Build exclusions (existing)
docker-compose.yml                # Local development (existing)
docker-compose.prod.yml           # Production deployment (new)
docker-entrypoint.sh              # Container startup script (existing)

scripts/
  ├── deploy.sh                   # VPS deployment script
  ├── rollback.sh                 # Rollback to previous version
  ├── backup.sh                   # Database backup to B2
  ├── health-check.sh             # Health check validation
  └── monitor.sh                  # Status dashboard script

nginx/
  ├── nginx.conf                  # Main Nginx configuration
  └── sites-available/
      └── memoryloop.conf         # Site-specific config with SSL

docs/
  └── runbook.md                  # Operations runbook
      # Contents:
      # - Manual deployment procedure
      # - Rollback procedure
      # - SSL certificate troubleshooting
      # - Backup restoration
      # - Log access and analysis
      # - Common error resolution
```

**Structure Decision**: Extends existing Next.js structure with infrastructure-as-code in dedicated directories (.github/workflows, docker/, scripts/, nginx/).

## Complexity Tracking

> No violations requiring justification. All infrastructure choices align with YAGNI principle.

## Core Implementation

Implementation follows the 6 user stories in priority order. See [quickstart.md](./quickstart.md) for step-by-step commands.

### Phase 1: CI Pipeline (User Story 1, Priority P1)

**Implements**: FR-001 to FR-007

| Task                          | Artifact Reference                                          | Output                     |
| ----------------------------- | ----------------------------------------------------------- | -------------------------- |
| Create CI workflow            | [research.md Section 1](./research.md) - Workflow Structure | `.github/workflows/ci.yml` |
| Configure npm/Next.js caching | [research.md Section 1](./research.md) - Caching Strategy   | Workflow cache config      |
| Enable branch protection      | [quickstart.md Phase 1.2](./quickstart.md)                  | GitHub settings            |

**Parallel Opportunity**: Can run alongside Phase 2 (Docker configuration).

---

### Phase 2: Docker Configuration (User Story 2, Priority P2)

**Implements**: FR-008 to FR-013

| Task                       | Artifact Reference                                                | Output                    |
| -------------------------- | ----------------------------------------------------------------- | ------------------------- |
| Verify existing Dockerfile | [research.md Section 2](./research.md) - Three-Stage Build        | Validated `Dockerfile`    |
| Create production compose  | [data-model.md Section 3](./data-model.md) - Docker Volume Mounts | `docker-compose.prod.yml` |
| Verify health endpoint     | [contracts/health-api.yaml](./contracts/health-api.yaml)          | `/api/health` validated   |

**Parallel Opportunity**: Can run alongside Phase 1 (CI Pipeline).

---

### Phase 3: VPS Infrastructure Setup (User Story 3, Priority P3)

**Implements**: FR-014 to FR-019

| Task                       | Artifact Reference                                                   | Output                     |
| -------------------------- | -------------------------------------------------------------------- | -------------------------- |
| Provision Hetzner CX22     | [research.md Section 5](./research.md) - VPS Infrastructure          | VPS instance               |
| Security hardening         | [quickstart.md Phase 3.2](./quickstart.md)                           | UFW, SSH, fail2ban         |
| Create directory structure | [data-model.md Section 3](./data-model.md) - VPS Directory Structure | `/opt/memoryloop/*`        |
| Create deploy user         | [data-model.md Section 2](./data-model.md) - Runtime Variables       | `deploy` user with SSH key |

**Blocks**: Phase 4 (SSL requires VPS to be provisioned).

---

### Phase 4: SSL & Domain Configuration (User Story 4, Priority P4)

**Implements**: FR-020 to FR-025

| Task                       | Artifact Reference                                               | Output               |
| -------------------------- | ---------------------------------------------------------------- | -------------------- |
| Configure DNS A record     | [quickstart.md Phase 4.1](./quickstart.md)                       | DNS pointing to VPS  |
| Install Nginx + Certbot    | [research.md Section 3](./research.md) - Nginx Reverse Proxy     | Nginx configured     |
| Obtain SSL certificate     | [research.md Section 3](./research.md) - TLS 1.3 Configuration   | Let's Encrypt cert   |
| Configure security headers | [research.md Section 3](./research.md) - Security Headers        | HSTS, CSP, etc.      |
| Verify auto-renewal        | [data-model.md Section 4](./data-model.md) - Nginx Configuration | Certbot timer active |

**Blocks**: Phase 5 (Deployment requires SSL for production).

---

### Phase 5: Automated Deployment Pipeline (User Story 5, Priority P5)

**Implements**: FR-026 to FR-033

| Task                   | Artifact Reference                                                                         | Output                         |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ |
| Add GitHub secrets     | [research.md Section 1](./research.md) - Secrets Required                                  | Repository secrets             |
| Create deploy workflow | [quickstart.md Phase 5.2](./quickstart.md)                                                 | `.github/workflows/deploy.yml` |
| Create deploy script   | [contracts/deployment-contract.md](./contracts/deployment-contract.md)                     | `scripts/deploy.sh`            |
| Create rollback script | [contracts/deployment-contract.md](./contracts/deployment-contract.md) - Rollback Protocol | `scripts/rollback.sh`          |
| Create backup script   | [research.md Section 6](./research.md) - Backblaze B2 Backups                              | `scripts/backup.sh`            |
| Configure log rotation | [data-model.md Section 6](./data-model.md) - Validation Rules                              | Docker log config              |

**Blocks**: Requires Phases 1-4 complete.

---

### Phase 6: Monitoring & Observability (User Story 6, Priority P6)

**Implements**: FR-034 to FR-038

| Task                         | Artifact Reference                                                 | Output               |
| ---------------------------- | ------------------------------------------------------------------ | -------------------- |
| Integrate Sentry SDK         | [research.md Section 4](./research.md) - Sentry Error Tracking     | Sentry config files  |
| Configure structured logging | [data-model.md Section 1](./data-model.md) - Health Check entity   | JSON log output      |
| Set up UptimeRobot           | [quickstart.md Phase 6.2](./quickstart.md)                         | External monitoring  |
| Create monitoring script     | [data-model.md Section 2](./data-model.md) - Environment Variables | `scripts/monitor.sh` |

**Parallel Opportunity**: Can partially run alongside Phase 5.

---

## Edge Case Handling

Strategies for edge cases identified in [spec.md](./spec.md):

| Edge Case                     | Detection                           | Strategy                                                                       | Recovery                      |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| VPS disk space exhausted      | Health check fails, df reports >90% | Pre-deployment disk check in deploy.sh                                         | Clean old images, rotate logs |
| Deployment health check fails | HTTP != 200 within 30s              | Auto-rollback per [deployment-contract.md](./contracts/deployment-contract.md) | Previous container restored   |
| SSL certificate renewal fails | Certbot exit code != 0              | UptimeRobot alerts, systemd timer retries                                      | Manual certbot run            |
| Concurrent deployments        | Two merges to main                  | GitHub Actions `concurrency` group, cancel in-progress                         | Only latest deploy runs       |
| GitHub Actions unavailable    | Workflow doesn't trigger            | Manual deployment via `scripts/deploy.sh`                                      | SSH to VPS, run deploy        |
| Docker registry unavailable   | Image pull fails                    | Deployment aborts, previous image continues                                    | Retry after registry recovery |
| VPS network issues            | SSH connection fails                | GitHub Actions timeout, retry logic                                            | Manual intervention required  |

## Parallel Work Opportunities

```
Timeline:
─────────────────────────────────────────────────────────────────────
Phase 1 (CI)     ████████████
Phase 2 (Docker) ████████████
                              Phase 3 (VPS) ████████████
                                                        Phase 4 (SSL) ████████
                                                                              Phase 5 (Deploy) ████████████
                                                                              Phase 6 (Monitor) ██████████
─────────────────────────────────────────────────────────────────────
```

- **Phases 1 & 2**: Can run in parallel (no dependencies)
- **Phase 3**: Can start after account setup, doesn't require CI/Docker complete
- **Phases 4 & 5**: Sequential (SSL before deploy)
- **Phases 5 & 6**: Partially parallel (Sentry can be configured before first deploy)
