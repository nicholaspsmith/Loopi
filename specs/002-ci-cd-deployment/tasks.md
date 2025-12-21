# Tasks: CI/CD Pipeline & Production Deployment

**Input**: Design documents from `/specs/002-ci-cd-deployment/`
**Prerequisites**: plan.md, spec.md
**Tests**: Tests are optional for infrastructure tasks

## Format: `[ID] [P?] [US#] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- GitHub Actions workflows: `.github/workflows/`
- Docker files: repository root (`Dockerfile`, `docker-compose.yml`)
- Scripts: `scripts/`
- Nginx config: `nginx/`
- Documentation: `docs/`

---

## Phase 1: GitHub Actions CI Pipeline (User Story 1)

**Goal**: Automated testing on all code changes

**Maps to**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007

### Implementation

- [x] T001 [P] [US1] Create GitHub Actions workflow for CI in .github/workflows/ci.yml (lint, type-check, unit tests)
- [x] T002 [P] [US1] Create GitHub Actions workflow for integration tests in .github/workflows/integration.yml (Playwright E2E)
- [x] T003 [P] [US1] Create GitHub Actions workflow for deployment in .github/workflows/deploy.yml (build, push Docker image, deploy)
- [x] T004 [P] [US1] Add build caching to CI workflow in .github/workflows/ci.yml (npm cache, Docker layer cache)
- [x] T005 [US1] Configure GitHub Actions secrets (ANTHROPIC_API_KEY, VPS_SSH_KEY, DOCKER_REGISTRY_TOKEN) - See docs/github-secrets-setup.md
- [x] T006 [US1] Add branch protection rules requiring CI checks to pass before merge - See docs/github-branch-protection.md

**Checkpoint**: CI pipeline running on all PRs and merges to main

---

## Phase 2: Docker Configuration (User Story 2)

**Goal**: Containerized application for local dev and production

**Maps to**: FR-008, FR-009, FR-010, FR-011, FR-012, FR-013

### Implementation

- [x] T007 [US2] Create Dockerfile for Next.js production build in repository root (multi-stage build for optimization)
- [x] T008 [US2] Create docker-compose.yml for local development in repository root (app, ollama, nginx)
- [x] T009 [US2] Create docker-compose.prod.yml for production deployment in repository root (app, ollama, nginx, volumes)
- [x] T010 [P] [US2] Create .dockerignore file in repository root (node_modules, .git, .next, tests, etc.)
- [x] T011 [P] [US2] Add health check endpoint in app/api/health/route.ts (check DB, Ollama, Anthropic API)
- [x] T012 [P] [US2] Create Docker entrypoint script in scripts/docker-entrypoint.sh (DB init, migrations, startup)

**Checkpoint**: Docker builds successfully, app runs in container locally

---

## Phase 3: VPS Setup & Configuration (User Story 3)

**Goal**: Secure production server ready for deployment

**Maps to**: FR-014, FR-015, FR-016, FR-017, FR-018, FR-019

### Implementation

- [x] T013 [US3] Provision VPS (Hetzner CPX21 - 4GB RAM, 3 vCPU, IP: 5.161.53.66)
- [x] T014 [US3] Configure firewall (UFW) - allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [x] T015 [US3] Install Docker and Docker Compose on VPS
- [x] T016 [US3] Create deploy user with sudo access and SSH key authentication
- [x] T017 [US3] Configure SSH hardening (disable password auth, fail2ban)
- [x] T018 [US3] Create directory structure on VPS (/opt/memoryloop, /opt/memoryloop/data, etc.)
- [x] T019 [P] [US3] Create VPS setup script in scripts/setup-vps.sh (automate server configuration)

**Checkpoint**: VPS accessible, Docker ready, secure SSH configured

---

## Phase 4: Nginx & SSL Configuration (User Story 4)

**Goal**: HTTPS access with automatic SSL renewal

**Maps to**: FR-020, FR-021, FR-022, FR-023, FR-024, FR-025

### Implementation

- [x] T020 [P] [US4] Create Nginx configuration for reverse proxy in nginx/memoryloop.conf
- [x] T021 [US4] Install Certbot on VPS for Let's Encrypt SSL certificates
- [x] T022 [US4] Configure DNS A record for memoryloop.nicholaspsmith.com pointing to VPS IP
- [x] T023 [US4] Obtain SSL certificate using Certbot (certbot --nginx -d memoryloop.nicholaspsmith.com)
- [x] T024 [P] [US4] Configure Nginx SSL settings (TLS 1.3, HSTS, security headers)
- [x] T025 [US4] Set up automatic SSL certificate renewal (certbot renew --nginx)

**Checkpoint**: HTTPS working, SSL certificate valid, automatic renewal configured

---

## Phase 5: Deployment Automation (User Story 5)

**Goal**: Automated deployment on merge to main

**Maps to**: FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033

### Implementation

- [x] T026 [P] [US5] Create deployment script in scripts/deploy.sh (pull image, stop old container, start new, health check)
- [x] T027 [US5] Configure GitHub Actions to trigger deployment on merge to main branch in .github/workflows/deploy.yml
- [x] T028 [P] [US5] Add deployment notifications (Discord/Slack webhook on success/failure)
- [x] T029 [P] [US5] Create rollback script in scripts/rollback.sh (revert to previous Docker image)
- [x] T030 [P] [US5] Set up automated database backups in scripts/backup-db.sh (daily cron job, backup to S3/B2)
- [x] T031 [US5] Configure log rotation for Docker containers (Docker logging driver)

**Checkpoint**: Automated deployment working, can deploy with git push

---

## Phase 6: Monitoring & Observability (User Story 6)

**Goal**: Production visibility and alerting

**Maps to**: FR-034, FR-035, FR-036, FR-037, FR-038

### Implementation

- [x] T032 [P] [US6] Set up application logging in lib/logger.ts (structured logs to stdout)
- [x] T033 [P] [US6] Configure Docker log aggregation (send to external service or local file)
- [x] T034 [P] [US6] ~~Add error tracking with Sentry~~ Moved to 007-sentry-error-tracking
- [x] T035 [US6] Set up uptime monitoring (UptimeRobot, Pingdom, or self-hosted) - see docs/uptime-monitoring.md
- [x] T036 [P] [US6] Create monitoring dashboard script in scripts/monitor.sh (check health, disk usage, memory)

**Checkpoint**: Application deployed, monitored, and accessible at memoryloop.nicholaspsmith.com

---

## Phase 7: Documentation

**Goal**: Operations runbook for common scenarios

**Maps to**: NFR-007, SC-007

### Implementation

- [x] T037 [P] Create deployment documentation in docs/deployment.md (VPS setup, deployment process)
- [x] T038 [P] Create operations runbook in docs/operations.md (restart, rollback, backup/restore, troubleshooting)
- [x] T039 [P] Update README.md with production deployment badge and links

**Final Checkpoint**: Application in production, fully documented, automated CI/CD pipeline

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (GitHub Actions CI): No dependencies - can start immediately
- **Phase 2** (Docker): Can start in parallel with Phase 1
- **Phase 3** (VPS Setup): Can start in parallel with Phases 1-2
- **Phase 4** (Nginx & SSL): Depends on Phase 3 (VPS must exist)
- **Phase 5** (Deployment Automation): Depends on Phases 1, 2, 3, 4 (all infrastructure ready)
- **Phase 6** (Monitoring): Can start after Phase 5, or in parallel if monitoring setup is independent
- **Phase 7** (Documentation): Can start anytime, complete last

### Recommended Execution Order

**Sequential (single developer):**

1. Phase 1: GitHub Actions CI (automated testing foundation)
2. Phase 2: Docker Configuration (local testing of containers)
3. Phase 3: VPS Setup (provision and secure server)
4. Phase 4: Nginx & SSL (enable HTTPS access)
5. Phase 5: Deployment Automation (connect CI to production)
6. Phase 6: Monitoring (add observability)
7. Phase 7: Documentation (capture operational knowledge)

**Parallel (multiple developers or concurrent work):**

- Developer A: Phase 1 + Phase 2 (CI and Docker setup)
- Developer B: Phase 3 + Phase 4 (VPS and SSL setup)
- Developer C: Phase 7 (Documentation drafts)
- After Phases 1-4 complete:
  - Developer A: Phase 5 (Deployment integration)
  - Developer B: Phase 6 (Monitoring setup)

## Parallel Opportunities

**Phase 1**:

- T001-T003 (GitHub Actions workflows can be created independently)
- T004 (Build caching is independent modification)

**Phase 2**:

- T010 (. dockerignore is independent)
- T011 (Health endpoint is independent)
- T012 (Entrypoint script is independent)

**Phase 3**:

- T019 (Setup script can be created in parallel with manual setup)

**Phase 4**:

- T020 (Nginx config can be created locally)
- T024 (SSL settings can be prepared in advance)

**Phase 5**:

- T026, T028, T029, T030 (All scripts can be created in parallel)

**Phase 6**:

- T032-T034, T036 (Logging, monitoring, and dashboard can be set up independently)

**Phase 7**:

- T037-T039 (All documentation can be written in parallel)

---

## Task Summary

**Total Tasks**: 39

- **Phase 1 - GitHub Actions CI**: 6 tasks
- **Phase 2 - Docker Configuration**: 6 tasks
- **Phase 3 - VPS Setup**: 7 tasks
- **Phase 4 - Nginx & SSL**: 6 tasks
- **Phase 5 - Deployment Automation**: 6 tasks
- **Phase 6 - Monitoring**: 5 tasks
- **Phase 7 - Documentation**: 3 tasks

**Parallel Opportunities**: 19 tasks marked [P] can run in parallel within their phases

**Success Criteria**:

- ✅ CI pipeline completes in under 10 minutes
- ✅ Docker builds successfully on local and VPS
- ✅ HTTPS site accessible with valid SSL certificate
- ✅ Deployments complete within 5 minutes of merge to main
- ✅ Zero-downtime deployments maintain 99.9% uptime
- ✅ Monitoring alerts within 5 minutes of downtime
- ✅ Complete operations runbook exists
- ✅ Infrastructure costs under $12/month

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Tests are optional for infrastructure tasks (validation via manual testing and monitoring)
- Manual steps clearly marked (VPS provisioning, DNS configuration, initial SSL setup)
- Commit after each task or logical group following rules in .claude/rules.md
- Stop at any checkpoint to validate phase independently
- Constitution compliance: Documentation-first ✅, Modular ✅, Simple ✅, Observable ✅
