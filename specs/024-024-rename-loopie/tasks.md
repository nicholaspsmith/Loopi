# Tasks: Rename MemoryLoop to Loopi

**Input**: Design documents from `/specs/024-024-rename-loopi/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No test tasks included - this is a string replacement feature with grep verification.

**Organization**: Tasks grouped by category (config, scripts, docs, code) for atomic commits.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1=Production URL, US2=Brand Consistency, US3=Developer Experience, US4=GitHub Repository)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify current state and prepare for changes

- [x] T001 Run initial grep to document all "memoryloop" references: `grep -ri "memoryloop" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.sh" --include="*.md" --include="*.conf" | wc -l` (Result: 563 references)

**Checkpoint**: Baseline count established

---

## Phase 2: Critical Configuration (Blocking)

**Purpose**: Core configuration files that affect application identity - MUST complete before other changes

**⚠️ CRITICAL**: These files define the application identity and must be updated first

- [x] T002 [US2] [US3] Update package name in package.json from "memoryloop" to "loopi"
- [x] T003 [US2] Update PWA name in public/manifest.json: change "name" and "short_name" from "MemoryLoop" to "Loopi"
- [x] T004 [P] [US1] [US3] Update container names in docker-compose.yml: memoryloop-app → loopi-app, memoryloop-postgres → loopi-postgres, memoryloop-nginx → loopi-nginx, memoryloop-network → loopi-network
- [x] T005 [P] [US1] [US3] Update docker-compose.prod.yml: container names, image ghcr.io/nicholaspsmith/memoryloop → ghcr.io/nicholaspsmith/loopi, paths /opt/memoryloop → /opt/loopi
- [x] T006 [P] [US1] Rename nginx/memoryloop.conf to nginx/loopi.conf and update: upstream name, SSL certificate paths, server references
- [x] T007 [US3] Regenerate package-lock.json by running `npm install`

**Checkpoint**: Application identity files updated - proceed to environment and scripts

---

## Phase 3: Environment Templates

**Purpose**: Update environment variable templates for deployment

- [ ] T008 [P] [US3] Update .env.example: SMTP_FROM noreply@memoryloop.com → noreply@loopi.com, GITHUB_REPO nicholaspsmith/memoryloop → nicholaspsmith/loopi
- [ ] T009 [P] [US1] [US3] Update .env.production.example: all memoryloop references including DATABASE_URL comments, NEXTAUTH_URL, paths

**Checkpoint**: Environment templates ready for new deployments

---

## Phase 4: Deployment Scripts

**Purpose**: Update all deployment and operations scripts

- [ ] T010 [P] [US1] [US3] Update scripts/deploy.sh: DEPLOY_DIR /opt/memoryloop → /opt/loopi, IMAGE_NAME ghcr.io/nicholaspsmith/memoryloop → ghcr.io/nicholaspsmith/loopi, container name references
- [ ] T011 [P] [US3] Update scripts/backup-db.sh: DEPLOY_DIR, CONTAINER_NAME memoryloop-postgres → loopi-postgres, backup file prefix memoryloop- → loopi-
- [ ] T012 [P] [US3] Update scripts/rollback.sh: DEPLOY_DIR, IMAGE_NAME, container references
- [ ] T013 [P] [US3] Update scripts/monitor.sh: DEPLOY_DIR, grep patterns for container names, dashboard title
- [ ] T014 [P] [US3] Update scripts/setup-vps.sh: DEPLOY_DIR /opt/memoryloop → /opt/loopi
- [ ] T015 [P] [US3] Update scripts/docker-entrypoint.sh: echo message "Starting MemoryLoop" → "Starting Loopi"

**Checkpoint**: All deployment scripts updated

---

## Phase 5: GitHub Actions

**Purpose**: Update CI/CD workflow files

- [ ] T016 [P] [US4] Update .github/workflows/deploy.yml: deploy paths /opt/memoryloop → /opt/loopi, scp targets, nginx config reference
- [ ] T017 [P] [US4] Update .github/workflows/ci.yml: optionally update test database name memoryloop_test → loopi_test (or keep for compatibility)
- [ ] T018 [P] [US4] Update .github/workflows/integration.yml: optionally update test database name (or keep for compatibility)

**Checkpoint**: CI/CD workflows ready for renamed repository

---

## Phase 6: User Story 2 - Brand Consistency (Priority: P1)

**Goal**: All user-facing text displays "Loopi" instead of "MemoryLoop"

**Independent Test**: Search entire UI for "MemoryLoop" - should find zero instances

### Source Code Updates

- [ ] T019 [P] [US2] Update lib/email/templates.ts: email subject lines "Reset your MemoryLoop password" → "Reset your Loopi password"
- [ ] T020 [P] [US2] Update lib/email/client.ts: default SMTP_FROM noreply@memoryloop.com → noreply@loopi.com
- [ ] T021 [P] [US2] Update lib/email/retry-queue.ts: default SMTP_FROM noreply@memoryloop.com → noreply@loopi.com
- [ ] T022 [P] [US2] Update lib/brand.ts: comment "MemoryLoop Brand Colors" → "Loopi Brand Colors"
- [ ] T023 [US2] Check and update app/layout.tsx if it contains MemoryLoop metadata
- [ ] T024 [US2] Check and update components/ui/Logo.tsx if it contains MemoryLoop alt text

**Checkpoint**: All user-facing brand references updated

---

## Phase 7: User Story 3 - Developer Experience (Priority: P2)

**Goal**: All developer documentation references "Loopi"

**Independent Test**: Clone repo, read README, verify all references say "Loopi"

### Primary Documentation

- [ ] T025 [P] [US3] Update README.md: title, description, clone URL github.com/nicholaspsmith/memoryloop → github.com/nicholaspsmith/loopi, production URL, all "MemoryLoop" text
- [ ] T026 [P] [US3] Update CONTRIBUTING.md: all references to memoryloop, clone commands, security email
- [ ] T027 [P] [US3] Update CLAUDE.md: project instruction header "Claude Code Instructions for memoryloop" → "Claude Code Instructions for loopi"
- [ ] T028 [P] [US3] Update ARCHITECTURE.md: check for and update any memoryloop references

### Operations Documentation

- [ ] T029 [P] [US3] Update docs/deployment.md: all container names, paths /opt/memoryloop → /opt/loopi, URLs, clone commands
- [ ] T030 [P] [US3] Update docs/operations.md: all container names memoryloop-_ → loopi-_, paths, log commands
- [ ] T031 [P] [US3] Update docs/uptime-monitoring.md: URL memoryloop.nicholaspsmith.com → loopi.nicholaspsmith.com
- [ ] T032 [P] [US3] Update docs/github-secrets-setup.md: check for and update any memoryloop references
- [ ] T033 [P] [US3] Update docs/github-branch-protection.md: badge URLs if present

**Checkpoint**: All developer documentation updated

---

## Phase 8: Configuration Files

**Purpose**: Update project configuration and tool configs

- [ ] T034 [P] [US3] Update .serena/project.yml: project_name 'memoryloop' → 'loopi'
- [ ] T035 [P] [US3] Update .serena/memories/project_overview.md: any memoryloop references
- [ ] T036 [P] [US3] Update .serena/memories/suggested_commands.md: any memoryloop references
- [ ] T037 [US3] Update .specify/memory/constitution.md: header "memoryloop Constitution" → "loopi Constitution"

**Checkpoint**: Tool configurations updated

---

## Phase 9: Agent Configurations

**Purpose**: Update Claude agent configuration files

- [ ] T038 [P] [US3] Update .claude/agents/db-agent.md: any memoryloop references
- [ ] T039 [P] [US3] Update .claude/agents/deploy-agent.md: any memoryloop references
- [ ] T040 [P] [US3] Update .claude/agents/git-agent.md: any memoryloop references
- [ ] T041 [P] [US3] Update .claude/agents/review-agent.md: any memoryloop references
- [ ] T042 [P] [US3] Update .claude/agents/spec-agent.md: any memoryloop references
- [ ] T043 [P] [US3] Update .claude/agents/test-agent.md: any memoryloop references
- [ ] T044 [P] [US3] Update .claude/agents/ui-agent.md: any memoryloop references

**Checkpoint**: Agent configurations updated

---

## Phase 10: Speckit Scripts

**Purpose**: Update speckit workflow scripts

- [ ] T045 [US3] Update .specify/scripts/bash/setup-git-hooks.sh: echo messages and comments mentioning "MemoryLoop"

**Checkpoint**: Speckit scripts updated

---

## Phase 11: Database and Migration Docs (Low Priority)

**Purpose**: Update historical documentation (optional - these are historical records)

- [ ] T046 [P] Update drizzle/MIGRATION_SUMMARY.md: path references (optional - historical)
- [ ] T047 [P] Update drizzle/MIGRATION_0010_GUIDE.md: path references (optional - historical)
- [ ] T048 [P] Update drizzle/0011_cleanup_orphaned_flashcards.md: path references (optional - historical)

**Checkpoint**: Migration docs updated (optional)

---

## Phase 12: Polish & Verification

**Purpose**: Final verification and cleanup

- [ ] T049 Run verification grep to confirm source code references removed: `grep -ri "memoryloop" --include="*.ts" --include="*.tsx" --include="*.json" --exclude-dir=specs --exclude-dir=tests --exclude-dir=node_modules`
- [ ] T050 Run build to verify no broken references: `npm run build`
- [ ] T051 Run tests to verify nothing broken: `npm test`
- [ ] T052 Run linting to verify code quality: `npm run lint`
- [ ] T053 Update this tasks.md to mark verification complete

**Checkpoint**: All codebase changes verified

---

## Phase 13: Infrastructure (Manual - Post-Merge)

**Purpose**: Infrastructure changes after code is merged to main

**⚠️ MANUAL STEPS**: These require VPS access and DNS management

- [ ] T054 [US1] DNS: Create A record for loopi.nicholaspsmith.com pointing to VPS IP (see quickstart.md)
- [ ] T055 [US1] SSL: Generate Let's Encrypt certificate for loopi.nicholaspsmith.com (see quickstart.md)
- [ ] T056 [US1] VPS: Rename directory /opt/memoryloop to /opt/loopi
- [ ] T057 [US1] VPS: Update /opt/loopi/.env with new domain references
- [ ] T058 [US1] VPS: Deploy with new configuration (docker compose down/up)
- [ ] T059 [US1] Verify health check at https://loopi.nicholaspsmith.com/api/health

**Checkpoint**: Production running on new domain

---

## Phase 14: Repository Rename (Manual - Post-Deploy)

**Purpose**: Rename GitHub repository after successful deployment

- [ ] T060 [US4] GitHub: Rename repository from memoryloop to loopi via Settings → General
- [ ] T061 [US4] Verify GitHub Actions continue working after rename
- [ ] T062 [US4] Update local git remote URL if needed: `git remote set-url origin git@github.com:nicholaspsmith/loopi.git`

**Checkpoint**: Repository renamed

---

## Phase 15: Cleanup (Optional)

**Purpose**: Post-migration cleanup tasks

- [ ] T063 [US1] Configure nginx redirect from old domain to new domain (see quickstart.md)
- [ ] T064 Clean up old Docker images after stability period (1 week)
- [ ] T065 Update any external links pointing to old domain

**Checkpoint**: Migration complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start here
- **Phase 2 (Critical Config)**: Depends on Phase 1 - BLOCKS all subsequent phases
- **Phase 3 (Env Templates)**: Depends on Phase 2
- **Phase 4 (Scripts)**: Depends on Phase 2, can parallel with Phase 3
- **Phase 5 (GitHub Actions)**: Depends on Phase 2, can parallel with Phases 3-4
- **Phase 6 (Brand/Source)**: Depends on Phase 2
- **Phase 7 (Docs)**: Depends on Phase 2, can parallel with Phase 6
- **Phase 8-10 (Config)**: Depends on Phase 2, can parallel with Phases 6-7
- **Phase 11 (Migration Docs)**: Optional, can parallel
- **Phase 12 (Verification)**: Depends on ALL previous code phases (1-11)
- **Phase 13 (Infrastructure)**: Depends on Phase 12 AND code merged to main
- **Phase 14 (Repo Rename)**: Depends on Phase 13 (successful deployment)
- **Phase 15 (Cleanup)**: Depends on Phase 14

### User Story Mapping

| Story | Description           | Key Phases         |
| ----- | --------------------- | ------------------ |
| US1   | Production URL Access | 2, 4, 5, 9, 13, 14 |
| US2   | Brand Consistency     | 2, 3, 6            |
| US3   | Developer Experience  | 2-10               |
| US4   | GitHub Repository     | 5, 14              |

### Parallel Opportunities

**Within Phase 2 (after T002-T003):**

```
T004, T005, T006 can run in parallel (different files)
```

**Within Phase 4:**

```
All script updates (T010-T015) can run in parallel
```

**Within Phase 6:**

```
T019, T020, T021, T022 can run in parallel
```

**Within Phase 7:**

```
All documentation updates can run in parallel
```

**Across Phases (after Phase 2):**

```
Phases 3, 4, 5, 6, 7, 8, 9, 10 can all run in parallel
```

---

## Implementation Strategy

### MVP First (Code Changes Only)

1. Complete Phases 1-12 (all automated code changes)
2. Create PR and merge to main
3. **STOP**: Production still on old domain, but code is ready

### Full Deployment

1. After merge: Complete Phase 13 (Infrastructure)
2. After successful deploy: Complete Phase 14 (Repo Rename)
3. After stability: Complete Phase 15 (Cleanup)

### Atomic Commit Strategy

Commits should be grouped by category for clean history:

1. `chore: rename package and PWA manifest to Loopi` (T002-T003, T007)
2. `chore: update Docker configs for Loopi rename` (T004-T006)
3. `chore: update environment templates for Loopi` (T008-T009)
4. `chore: update deployment scripts for Loopi` (T010-T015)
5. `ci: update GitHub Actions for Loopi rename` (T016-T018)
6. `chore: update brand references in source code` (T019-T024)
7. `docs: update documentation for Loopi rename` (T025-T033)
8. `chore: update tool configs for Loopi rename` (T034-T045)

---

## Notes

- Database name (POSTGRES_DB=memoryloop) intentionally NOT changed - would require migration
- Historical spec files in specs/ intentionally NOT changed - preserve context
- Test database names in CI can optionally be kept as memoryloop_test for simplicity
- Sentry DSN unchanged - project identity separate from app name
