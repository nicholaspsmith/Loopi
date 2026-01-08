# Feature Specification: Rename Project from MemoryLoop to Loopi

**Feature Branch**: `024-024-rename-loopi`
**Created**: 2026-01-08
**Status**: Draft
**Input**: User description: "I want to rename this project. I want to call it Loopi. We will need to rename the repository. The subdomain. All references to memoryloop in the codebase. Help me to ensure we do a complete and comprehensive rename."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Production URL Access (Priority: P1)

Users navigate to the new production URL and the application works identically to before.

**Why this priority**: This is the core user-facing change. If the new URL doesn't work, users can't access the app.

**Independent Test**: Visit `loopi.nicholaspsmith.com` and verify all functionality works (login, chat, quiz, goals).

**Acceptance Scenarios**:

1. **Given** DNS is configured, **When** user visits `loopi.nicholaspsmith.com`, **Then** the application loads correctly with SSL
2. **Given** user has existing account, **When** user logs in at new URL, **Then** all their data is accessible
3. **Given** old URL `memoryloop.nicholaspsmith.com`, **When** user visits it, **Then** they are redirected to new URL

---

### User Story 2 - Brand Consistency (Priority: P1)

All user-facing text, emails, and UI elements display "Loopi" instead of "MemoryLoop".

**Why this priority**: Brand consistency is essential for user trust and recognition.

**Independent Test**: Search entire UI for "MemoryLoop" - should find zero instances.

**Acceptance Scenarios**:

1. **Given** user views any page, **When** checking page title/metadata, **Then** it shows "Loopi"
2. **Given** user receives password reset email, **When** reading email content, **Then** it references "Loopi"
3. **Given** user views PWA manifest, **When** installing as app, **Then** it shows "Loopi"

---

### User Story 3 - Developer Experience (Priority: P2)

Developers cloning the repository can set up and run the project with correct naming.

**Why this priority**: Important for contributors but not user-facing.

**Independent Test**: Clone repo, follow README, verify all scripts and configs reference correct names.

**Acceptance Scenarios**:

1. **Given** developer clones repo, **When** reading README, **Then** all references say "Loopi"
2. **Given** developer runs `npm install`, **When** checking package.json, **Then** name is "loopi"
3. **Given** developer runs Docker setup, **When** checking container names, **Then** they use "loopi-\*"

---

### User Story 4 - GitHub Repository (Priority: P2)

The GitHub repository is renamed and all references updated.

**Why this priority**: Necessary for correct CI/CD and collaboration, but manual step.

**Independent Test**: Verify `github.com/nicholaspsmith/loopi` exists and all workflows run.

**Acceptance Scenarios**:

1. **Given** repository renamed, **When** visiting old URL, **Then** GitHub redirects to new URL
2. **Given** CI/CD workflows, **When** triggered, **Then** they reference correct image registry
3. **Given** GitHub Actions, **When** deploying, **Then** they use correct secrets and paths

---

### Edge Cases

- What happens when users bookmark the old URL? (Redirect via DNS or nginx)
- How do we handle in-flight password reset emails with old links? (Include redirect)
- What about existing Docker images tagged with old name? (Keep for rollback, phase out)
- How do we handle email sender address change? (Update SMTP_FROM env var)

## Requirements _(mandatory)_

### Functional Requirements

#### Infrastructure & DNS

- **FR-001**: System MUST serve from new subdomain `loopi.nicholaspsmith.com`
- **FR-002**: System MUST redirect old subdomain `memoryloop.nicholaspsmith.com` to new domain
- **FR-003**: SSL certificates MUST be valid for new domain
- **FR-004**: GitHub repository MUST be renamed to `loopi`

#### Application Code

- **FR-005**: Package name in `package.json` MUST be `loopi`
- **FR-006**: All user-facing text MUST display "Loopi" instead of "MemoryLoop"
- **FR-007**: PWA manifest MUST use "Loopi" for app name
- **FR-008**: Email templates MUST reference "Loopi"
- **FR-009**: README and documentation MUST reference "Loopi"

#### Docker & Deployment

- **FR-010**: Docker container names MUST use `loopi-*` prefix
- **FR-011**: Docker image registry MUST be `ghcr.io/nicholaspsmith/loopi`
- **FR-012**: Deploy directory MUST be `/opt/loopi`
- **FR-013**: Nginx config MUST reference new domain and upstream names

#### Database

- **FR-014**: Database user MAY remain `memoryloop` for backwards compatibility (no data migration needed)
- **FR-015**: Database name MAY remain `memoryloop` for backwards compatibility

### Files Requiring Changes

Based on grep analysis, **120 files** contain references to "memoryloop" or "MemoryLoop":

#### Critical Configuration Files (Change First)

| File                      | Reference Count | Changes Needed                             |
| ------------------------- | --------------- | ------------------------------------------ |
| `package.json`            | 1               | Change `name` to `loopi`                   |
| `package-lock.json`       | 2               | Regenerate after package.json change       |
| `public/manifest.json`    | 2               | Change `name` and `short_name`             |
| `docker-compose.yml`      | 8               | Container names, network name              |
| `docker-compose.prod.yml` | 12              | Container names, image name, paths         |
| `nginx/memoryloop.conf`   | 7               | Rename file, update upstream and SSL paths |

#### Environment Files

| File                      | Changes Needed                     |
| ------------------------- | ---------------------------------- |
| `.env.example`            | Update `SMTP_FROM`, `GITHUB_REPO`  |
| `.env.production.example` | Update all `memoryloop` references |

#### Scripts

| File                           | Changes Needed                               |
| ------------------------------ | -------------------------------------------- |
| `scripts/deploy.sh`            | Update paths, container names, image name    |
| `scripts/backup-db.sh`         | Update paths, container names, file prefixes |
| `scripts/rollback.sh`          | Update paths, container names                |
| `scripts/monitor.sh`           | Update container grep patterns               |
| `scripts/setup-vps.sh`         | Update deploy directory                      |
| `scripts/docker-entrypoint.sh` | Update echo messages                         |

#### GitHub Actions

| File                                | Changes Needed                     |
| ----------------------------------- | ---------------------------------- |
| `.github/workflows/ci.yml`          | Database name for tests (optional) |
| `.github/workflows/deploy.yml`      | Deploy paths, image names          |
| `.github/workflows/integration.yml` | Database name for tests (optional) |

#### Documentation

| File                           | Changes Needed                       |
| ------------------------------ | ------------------------------------ |
| `README.md`                    | All references, URLs, clone commands |
| `CONTRIBUTING.md`              | All references, URLs                 |
| `CLAUDE.md`                    | Project name reference               |
| `ARCHITECTURE.md`              | Check for references                 |
| `docs/deployment.md`           | All paths, URLs, container names     |
| `docs/operations.md`           | All container names, paths           |
| `docs/uptime-monitoring.md`    | URLs                                 |
| `docs/github-secrets-setup.md` | Check for references                 |

#### Source Code

| File                       | Changes Needed      |
| -------------------------- | ------------------- |
| `lib/brand.ts`             | Comment update      |
| `lib/email/templates.ts`   | Email subject lines |
| `lib/email/client.ts`      | Default SMTP_FROM   |
| `lib/email/retry-queue.ts` | Default SMTP_FROM   |
| `app/layout.tsx`           | Check metadata      |
| `components/ui/Logo.tsx`   | Alt text if present |

#### API Contracts (specs/)

Multiple YAML files with API titles and URLs - lower priority, can update as needed.

### Key Entities

- **Brand Name**: "Loopi" (title case for display, "loopi" lowercase for technical)
- **Domain**: `loopi.nicholaspsmith.com`
- **GitHub Repo**: `nicholaspsmith/loopi`
- **Docker Image**: `ghcr.io/nicholaspsmith/loopi`
- **Deploy Path**: `/opt/loopi`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero instances of "MemoryLoop" (case-insensitive) in user-facing UI
- **SC-002**: Production site accessible at `loopi.nicholaspsmith.com` with valid SSL
- **SC-003**: Old domain redirects to new domain (HTTP 301)
- **SC-004**: All CI/CD workflows pass after rename
- **SC-005**: Docker containers use `loopi-*` naming convention
- **SC-006**: `grep -ri "memoryloop" --include="*.ts" --include="*.tsx" --include="*.json"` returns zero results in source code (excluding specs/ and tests/)

## Implementation Notes

### Order of Operations

1. **Phase 1 - Codebase Changes** (can be done first, merged to main)
   - Update all code references
   - Update configs and scripts
   - Update documentation
   - DO NOT update production URLs yet

2. **Phase 2 - Infrastructure** (requires coordination)
   - Create new DNS record for `loopi.nicholaspsmith.com`
   - Generate SSL certificate for new domain
   - Update nginx config on VPS
   - Update `.env` on VPS

3. **Phase 3 - Repository Rename** (GitHub)
   - Rename repository via GitHub settings
   - GitHub automatically redirects old URLs

4. **Phase 4 - Cleanup**
   - Set up redirect from old domain
   - Update any external links (if applicable)
   - Monitor for broken links

### Rollback Plan

If issues arise:

1. DNS can be reverted within minutes (TTL dependent)
2. Old Docker images remain available for rollback
3. Database unchanged, no data migration needed

### Out of Scope

- Renaming database user/database (would require migration)
- Updating external services (Sentry DSN remains same)
- Historical git commit messages
- Spec files in `specs/` directory (historical documentation)
