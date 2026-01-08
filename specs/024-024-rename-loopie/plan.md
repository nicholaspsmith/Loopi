# Implementation Plan: Rename MemoryLoop to Loopi

**Branch**: `024-024-rename-loopi` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-024-rename-loopi/spec.md`

## Summary

Comprehensive project rename from "MemoryLoop" to "Loopi" across all 120 files containing references. The rename spans configuration files, scripts, documentation, source code, and requires infrastructure coordination for DNS, SSL, and repository rename. Database names remain unchanged to avoid data migration complexity.

## Technical Context

**Language/Version**: TypeScript 5.7 / Node.js 20+ / Next.js 16
**Primary Dependencies**: Next.js, React 19, NextAuth, Drizzle ORM, LanceDB
**Storage**: PostgreSQL (users, auth), LanceDB (flashcards, embeddings) - names unchanged
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web application (Docker containerized)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: N/A (rename has no performance impact)
**Constraints**: Zero downtime preferred, redirects from old domain required
**Scale/Scope**: 120 files affected, 4-phase rollout

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Notes                                                      |
| ---------------------- | ------- | ---------------------------------------------------------- |
| I. Documentation-First | ✅ PASS | Spec complete with all files catalogued                    |
| II. Test-First (TDD)   | ✅ PASS | Verification via grep after changes (no new logic to test) |
| III. Modularity        | ✅ PASS | Changes are isolated to string replacements                |
| IV. Simplicity (YAGNI) | ✅ PASS | Minimal scope - only rename, no refactoring                |
| V. Observability       | ✅ PASS | Monitoring unchanged (Sentry DSN same)                     |
| VI. Atomic Commits     | ✅ PASS | Commits grouped by category (config, scripts, docs, code)  |

**Gate Status**: ✅ PASS - No violations to justify

## Project Structure

### Documentation (this feature)

```text
specs/024-024-rename-loopi/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (infrastructure requirements)
├── quickstart.md        # Phase 1 output (rollout guide)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

This feature modifies existing files across the repository. No new directories or structural changes.

```text
# Files by category (120 total)

## Critical Configuration (6 files)
package.json                    # name: "loopi"
package-lock.json               # regenerated
public/manifest.json            # PWA name
docker-compose.yml              # container names
docker-compose.prod.yml         # container names, image, paths
nginx/memoryloop.conf           # rename to loopi.conf

## Environment Templates (2 files)
.env.example                    # SMTP_FROM, GITHUB_REPO
.env.production.example         # all references

## Scripts (6 files)
scripts/deploy.sh               # paths, names
scripts/backup-db.sh            # paths, names
scripts/rollback.sh             # paths, names
scripts/monitor.sh              # grep patterns
scripts/setup-vps.sh            # deploy dir
scripts/docker-entrypoint.sh    # echo messages

## GitHub Actions (3 files)
.github/workflows/ci.yml        # optional: test db name
.github/workflows/deploy.yml    # paths, images
.github/workflows/integration.yml # optional: test db name

## Documentation (8+ files)
README.md                       # all references
CONTRIBUTING.md                 # all references
CLAUDE.md                       # project name
docs/deployment.md              # paths, URLs
docs/operations.md              # container names
docs/uptime-monitoring.md       # URLs
(plus other docs)

## Source Code (6 files)
lib/brand.ts                    # comment
lib/email/templates.ts          # subject lines
lib/email/client.ts             # default SMTP_FROM
lib/email/retry-queue.ts        # default SMTP_FROM
app/layout.tsx                  # metadata if present
components/ui/Logo.tsx          # alt text if present

## Other Files (~89 files)
specs/                          # historical docs (lower priority)
tests/                          # test summaries
drizzle/                        # migration docs
.serena/                        # project config
.claude/                        # agent configs
```

**Structure Decision**: No structural changes. All modifications are in-place string replacements within existing files.

## Implementation Approach

### Phase 1: Codebase Changes (Pre-merge)

Update all code references while keeping production on old domain:

1. **Configuration files** - package.json, manifest, docker-compose files
2. **Scripts** - All deployment and operations scripts
3. **Documentation** - README, docs, contributing guides
4. **Source code** - Email templates, brand references
5. **GitHub Actions** - Workflow files with new image names

### Phase 2: Infrastructure (Post-merge)

Manual steps after code is merged:

1. **DNS**: Create A record for `loopi.nicholaspsmith.com`
2. **SSL**: Generate certificate via certbot
3. **Nginx**: Update config on VPS
4. **Environment**: Update `.env` on VPS with new URLs
5. **Deploy**: Run deployment with new configuration

### Phase 3: Repository Rename (GitHub)

1. Rename repository via GitHub Settings → General → Repository name
2. GitHub automatically redirects old URLs

### Phase 4: Cleanup

1. Set up redirect from old domain to new domain
2. Update any external links
3. Monitor for broken links
4. Clean up old Docker images after stability period

## Complexity Tracking

> No violations to justify - this is a straightforward rename operation.

| Category       | Complexity | Justification                        |
| -------------- | ---------- | ------------------------------------ |
| Code changes   | Low        | String replacements only             |
| Infrastructure | Medium     | DNS, SSL, nginx config coordination  |
| Risk           | Low        | Database unchanged, rollback trivial |

## Dependencies

### External Actions Required (User)

- [ ] DNS: Create A record for `loopi.nicholaspsmith.com`
- [ ] SSL: Run `certbot certonly --standalone -d loopi.nicholaspsmith.com`
- [ ] GitHub: Rename repository after code is merged
- [ ] VPS: Update `/opt/memoryloop/.env` to reference new domain

### Automated by This Feature

- [ ] All codebase references updated
- [ ] GitHub Actions configured for new image names
- [ ] Nginx config updated for new domain

## Verification Plan

After implementation:

```bash
# Verify no source code references remain (excluding specs/tests/docs)
grep -ri "memoryloop" --include="*.ts" --include="*.tsx" --include="*.json" \
  --exclude-dir=specs --exclude-dir=tests --exclude-dir=node_modules

# Should return 0 results

# Verify Docker containers use new names
docker ps --format "{{.Names}}" | grep loopi

# Verify application loads
curl -I https://loopi.nicholaspsmith.com/api/health
```

## Rollback Plan

1. **Code**: Revert merge commit if issues found pre-deployment
2. **DNS**: Point back to old domain (TTL-dependent)
3. **Docker**: Old images retained for rollback
4. **Database**: No changes, no rollback needed

## Out of Scope

- Database user/name rename (requires migration)
- Sentry DSN changes (project remains same)
- Historical git commit messages
- Spec files in `specs/` directory (historical documentation)
