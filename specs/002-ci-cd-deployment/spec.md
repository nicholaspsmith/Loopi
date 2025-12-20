# Feature Specification: CI/CD Pipeline & Production Deployment

**Feature Branch**: `002-ci-cd-deployment`
**Created**: 2025-12-16
**Status**: Draft
**Input**: Automate testing, building, and deployment to production on a cost-effective VPS infrastructure

## Overview

Implement a complete CI/CD pipeline and production deployment infrastructure for the MemoryLoop application. The system will automatically test, build, and deploy the application to a Hetzner CX22 VPS with Docker, Nginx reverse proxy, and Let's Encrypt SSL.

**Target Domain**: memoryloop.nicholaspsmith.com
**Estimated Cost**: ~$5-10/month
**Infrastructure**: VPS with Docker, Nginx, SSL certificates

## User Scenarios & Testing

### User Story 1 - Automated CI Pipeline (Priority: P1)

Developers can push code to GitHub and have it automatically tested for quality, type safety, and correctness before merge.

**Why this priority**: Foundation for all automation - must run on every code change to ensure quality gates are enforced.

**Independent Test**: Push code to feature branch → GitHub Actions automatically runs linting, type-checking, and unit tests → Results visible in PR → Merge blocked if tests fail → Can iterate on code until tests pass.

**Acceptance Scenarios**:

1. **Given** a feature branch with code changes, **When** pushed to GitHub, **Then** CI workflow automatically triggers and runs lint, type-check, and unit tests
2. **Given** CI workflow running, **When** linting fails, **Then** workflow fails and blocks PR merge
3. **Given** CI workflow running, **When** unit tests fail, **Then** workflow fails with clear error output
4. **Given** all CI checks passing, **When** viewing PR, **Then** green checkmark shows all tests passed
5. **Given** branch protection enabled, **When** CI fails, **Then** merge button is disabled

---

### User Story 2 - Dockerized Application (Priority: P2)

Developers can build and run the application in Docker containers locally and in production for consistency across environments.

**Why this priority**: Enables reproducible builds and deployments - must work before we can deploy to production.

**Independent Test**: Run `docker build .` locally → Image builds successfully → Run `docker-compose up` → Application starts and is accessible → Health check endpoint returns 200 OK → Can test full app functionality in containerized environment.

**Acceptance Scenarios**:

1. **Given** Dockerfile exists, **When** running `docker build .`, **Then** multi-stage build completes successfully with optimized image
2. **Given** docker-compose.yml for development, **When** running `docker-compose up`, **Then** all services (app, ollama, nginx) start correctly
3. **Given** containerized app running, **When** accessing health check endpoint, **Then** returns status of DB, Ollama, and Anthropic API
4. **Given** production docker-compose file, **When** deploying to VPS, **Then** all volumes and networks configured correctly
5. **Given** Docker image built, **When** inspecting layers, **Then** build cache is utilized and image size is optimized

---

### User Story 3 - VPS Infrastructure Setup (Priority: P3)

Operations team can provision and configure a secure VPS with Docker, firewall rules, and SSH hardening for production deployment.

**Why this priority**: Required before deployment automation - one-time setup that enables all subsequent deployments.

**Independent Test**: Provision Hetzner CX22 VPS → SSH into server → Verify Docker installed → Check UFW firewall rules (ports 22, 80, 443 open) → Test SSH key authentication → Verify password auth disabled → Directory structure created at /opt/memoryloop.

**Acceptance Scenarios**:

1. **Given** VPS provider account, **When** provisioning server (4GB RAM, 2 vCPU), **Then** server is accessible via SSH
2. **Given** fresh VPS, **When** running setup script, **Then** Docker and Docker Compose are installed
3. **Given** server configured, **When** checking UFW status, **Then** only ports 22, 80, 443 are open
4. **Given** deploy user created, **When** testing SSH access, **Then** can authenticate with SSH key only
5. **Given** SSH hardened, **When** attempting password login, **Then** authentication is denied
6. **Given** directory structure created, **When** checking /opt/memoryloop, **Then** data and config directories exist with correct permissions

---

### User Story 4 - SSL & Domain Configuration (Priority: P4)

Users can access the application securely over HTTPS with automatic SSL certificate management and renewal.

**Why this priority**: Security requirement - must be in place before public access, but can be done after VPS is configured.

**Independent Test**: Configure DNS A record pointing to VPS IP → Run Certbot to obtain SSL certificate → Access https://memoryloop.nicholaspsmith.com → Browser shows secure connection (valid SSL) → Check certificate expiry → Verify auto-renewal cron job is configured.

**Acceptance Scenarios**:

1. **Given** DNS A record configured, **When** running Certbot, **Then** SSL certificate is obtained from Let's Encrypt
2. **Given** SSL certificate obtained, **When** accessing site via HTTPS, **Then** connection is secure with TLS 1.3
3. **Given** Nginx configured, **When** checking headers, **Then** HSTS and security headers are present
4. **Given** certificate nearing expiry, **When** renewal cron runs, **Then** certificate is automatically renewed
5. **Given** HTTP request, **When** accessing site, **Then** automatically redirects to HTTPS

---

### User Story 5 - Automated Deployment Pipeline (Priority: P5)

Developers can merge code to main branch and have it automatically deployed to production with zero-downtime updates.

**Why this priority**: Automation goal - requires all previous stories to be complete, enables continuous deployment.

**Independent Test**: Merge PR to main → GitHub Actions triggers deployment workflow → Docker image built and pushed to registry → SSH to VPS and deploy → Health check validates deployment → Old container stops, new container starts → Application accessible with new changes.

**Acceptance Scenarios**:

1. **Given** code merged to main, **When** GitHub Actions triggers, **Then** deployment workflow builds Docker image
2. **Given** Docker image built, **When** pushed to registry, **Then** image is tagged with commit SHA
3. **Given** deployment script running, **When** pulling new image on VPS, **Then** stops old container gracefully
4. **Given** new container started, **When** health check endpoint called, **Then** returns 200 OK within 30 seconds
5. **Given** deployment complete, **When** checking logs, **Then** no errors and application is serving traffic
6. **Given** deployment fails, **When** checking rollback, **Then** previous version is restored automatically

---

### User Story 6 - Monitoring & Observability (Priority: P6)

Operations team can monitor application health, logs, and uptime to quickly detect and respond to issues in production.

**Why this priority**: Production readiness - important for operational stability but can be added after initial deployment.

**Independent Test**: Deploy application → Check structured logs in stdout → Verify log aggregation working → Set up uptime monitoring (UptimeRobot) → Trigger test error → Verify error tracking captures it → Run monitoring script → See health, disk usage, and memory metrics.

**Acceptance Scenarios**:

1. **Given** application running, **When** checking Docker logs, **Then** structured JSON logs are visible
2. **Given** log aggregation configured, **When** application logs events, **Then** logs are sent to aggregation service
3. **Given** uptime monitoring configured, **When** service goes down, **Then** alert is triggered within 5 minutes
4. **Given** error tracking enabled, **When** application throws error, **Then** error is captured with stack trace
5. **Given** monitoring script running, **When** checking output, **Then** health status, disk usage, and memory usage are displayed
6. **Given** disk usage high, **When** checking log rotation, **Then** old logs are automatically rotated and compressed

---

### Edge Cases

- What happens when VPS runs out of disk space during deployment?
- How does system handle deployment failure mid-process (container started but health check fails)?
- What happens when SSL certificate renewal fails?
- How does system handle conflicting deployments (two PRs merged simultaneously)?
- What happens when GitHub Actions is down or slow?
- How does system handle VPS network connectivity issues?
- What happens when Docker registry is unavailable?

## Requirements

### Functional Requirements

#### CI/CD Pipeline

- **FR-001**: System MUST run linting on all code changes before merge
- **FR-002**: System MUST run type-checking on all TypeScript code before merge
- **FR-003**: System MUST run unit tests on all code changes before merge
- **FR-004**: System MUST run integration tests (Playwright E2E) on all code changes
- **FR-005**: System MUST utilize build caching for faster CI runs (npm cache, Docker layer cache)
- **FR-006**: System MUST block PR merge if any CI check fails
- **FR-007**: GitHub Actions workflows MUST use secrets for sensitive data (API keys, SSH keys)

#### Docker Configuration

- **FR-008**: Dockerfile MUST use multi-stage build for optimized production image
- **FR-009**: Docker image MUST include health check endpoint at /api/health
- **FR-010**: docker-compose.yml MUST support local development with app, ollama, and nginx services
- **FR-011**: docker-compose.prod.yml MUST support production deployment with persistent volumes
- **FR-012**: .dockerignore MUST exclude node_modules, .git, .next, tests, and other non-production files
- **FR-013**: Docker entrypoint script MUST initialize database and run migrations on startup

#### VPS Infrastructure

- **FR-014**: VPS MUST be provisioned with minimum 4GB RAM and 2 vCPU
- **FR-015**: Firewall (UFW) MUST allow only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS)
- **FR-016**: SSH MUST be hardened (password auth disabled, key-only authentication)
- **FR-017**: Deploy user MUST have sudo access and SSH key authentication
- **FR-018**: Directory structure MUST exist at /opt/memoryloop with subdirectories for data and config
- **FR-019**: fail2ban MUST be configured to prevent brute-force SSH attacks

#### SSL & Domain

- **FR-020**: SSL certificate MUST be obtained from Let's Encrypt via Certbot
- **FR-021**: Nginx MUST be configured as reverse proxy for application
- **FR-022**: Nginx MUST use TLS 1.3 for SSL connections
- **FR-023**: Nginx MUST include security headers (HSTS, X-Frame-Options, etc.)
- **FR-024**: SSL certificates MUST auto-renew before expiration (certbot renew cron job)
- **FR-025**: HTTP requests MUST redirect to HTTPS automatically

#### Deployment Automation

- **FR-026**: Deployment MUST trigger automatically on merge to main branch
- **FR-027**: Deployment script MUST pull latest Docker image from registry
- **FR-028**: Deployment MUST perform zero-downtime updates (start new container before stopping old)
- **FR-029**: Deployment MUST validate health check before considering deployment successful
- **FR-030**: ~~Deployment MUST send notifications on success or failure~~ (Deferred - not needed initially)
- **FR-031**: Rollback script MUST exist to revert to previous Docker image version
- **FR-032**: Database backups MUST run daily via cron job to Backblaze B2
- **FR-033**: Docker container logs MUST be rotated to prevent disk space issues

#### Monitoring & Observability

- **FR-034**: Application MUST output structured logs to stdout in JSON format
- **FR-035**: Docker logs MUST be aggregated (sent to external service or local file)
- **FR-036**: Uptime monitoring MUST be configured to check application availability
- **FR-037**: Error tracking MUST capture application errors with stack traces via Sentry
- **FR-038**: Monitoring dashboard script MUST display health status, disk usage, and memory usage

### Non-Functional Requirements

- **NFR-001**: CI pipeline MUST complete within 10 minutes for typical code changes
- **NFR-002**: Docker image size SHOULD be under 500MB for faster deployments
- **NFR-003**: Deployment MUST complete within 5 minutes from merge to production
- **NFR-004**: Zero-downtime deployment MUST not drop any in-flight requests
- **NFR-005**: SSL certificate renewal MUST happen at least 30 days before expiration
- **NFR-006**: Monitoring checks MUST run at least every 5 minutes
- **NFR-007**: Infrastructure cost MUST remain under $15/month
- **NFR-008**: Backup retention MUST keep at least 7 daily backups
- **NFR-009**: Log rotation MUST keep at least 14 days of logs

### Key Entities

- **CI Workflow**: Represents a GitHub Actions workflow (ci.yml, integration.yml, deploy.yml)
- **Docker Image**: Versioned application container with commit SHA tag
- **VPS Instance**: Production server (Hetzner CX22 - 4GB RAM, 2 vCPU, 40GB SSD)
- **SSL Certificate**: Let's Encrypt certificate for memoryloop.nicholaspsmith.com
- **Deployment**: Single deployment event with status (success/failure), timestamp, version
- **Health Check**: Application health status (database, Ollama, Anthropic API)
- **Backup**: Daily database backup with timestamp and location (Backblaze B2)
- **Log Entry**: Structured application log in JSON format

### Success Criteria

- **SC-001**: All PRs have automated CI checks that run in under 10 minutes
- **SC-002**: Docker builds successfully on both local development and production
- **SC-003**: VPS is accessible via HTTPS with valid SSL certificate
- **SC-004**: Deployments complete automatically within 5 minutes of merge to main
- **SC-005**: Zero-downtime deployments maintain 99.9% uptime during deploy
- **SC-006**: Monitoring alerts trigger within 5 minutes of downtime
- **SC-007**: Complete operations runbook exists for common scenarios
- **SC-008**: Infrastructure costs remain under $12/month

### Out of Scope

- Multi-region deployments (single VPS only)
- Kubernetes or container orchestration (Docker Compose sufficient)
- Blue-green deployments (simple rolling updates only)
- Canary deployments or traffic splitting
- Advanced monitoring dashboards (Grafana, Prometheus)
- CDN integration (direct VPS access only)
- Database replication or high availability
- Load balancing across multiple servers
- Deployment notifications (Discord/Slack webhooks) - deferred

## Clarifications

### Session 2025-12-19

- Q: Which container registry should be used for Docker images? → A: GitHub Container Registry (ghcr.io)
- Q: Which VPS provider should be used? → A: Hetzner CX22 (~$5/mo)
- Q: Which notification platform for deployments? → A: None (skip notifications initially)
- Q: Which backup storage provider? → A: Backblaze B2
- Q: Should error tracking (Sentry) be included? → A: Yes, use Sentry

## Technical Context

- **Current State**: Application runs locally with Next.js dev server, no deployment infrastructure
- **CI Tool**: GitHub Actions (free tier for public repos)
- **Container Platform**: Docker + Docker Compose
- **Container Registry**: GitHub Container Registry (ghcr.io) - native GitHub Actions integration, free for public repos
- **VPS Provider**: Hetzner CX22 (~$5/mo) - 4GB RAM, 2 vCPU, 40GB SSD
- **Web Server**: Nginx as reverse proxy
- **SSL**: Let's Encrypt (free automated SSL certificates)
- **Domain**: memoryloop.nicholaspsmith.com (DNS via domain registrar)
- **Monitoring**: UptimeRobot (free tier) for uptime, Sentry (free tier) for error tracking
- **Backup Storage**: Backblaze B2 (S3-compatible API, ~$0.005/GB)

## Dependencies

- **External**: GitHub Actions, GitHub Container Registry (ghcr.io), DNS provider, Hetzner Cloud, Backblaze B2, Sentry
- **Internal**: Completed application from specs/001-claude-flashcard (authentication, chat, flashcards, quiz)

## Assumptions

1. Application is production-ready (all Phase 1-6 features complete)
2. Domain name already purchased and accessible for DNS configuration
3. Hetzner Cloud account exists for VPS provisioning
4. GitHub repository is configured for Actions
5. Manual VPS provisioning acceptable (no infrastructure-as-code initially)
6. Single-server deployment sufficient (no need for scaling initially)
7. Database backups to Backblaze B2 cloud storage acceptable
8. Manual rollback acceptable if automated rollback fails
