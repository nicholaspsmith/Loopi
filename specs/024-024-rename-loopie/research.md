# Research: Rename MemoryLoop to Loopi

**Feature**: 024-024-rename-loopi
**Date**: 2026-01-08

## Infrastructure Requirements

### DNS Configuration

**Decision**: Create A record for `loopi.nicholaspsmith.com` pointing to existing VPS IP

**Rationale**:

- Simplest approach - single A record
- VPS IP unchanged, no load balancer complexity
- Can set low TTL (300s) initially for quick rollback

**Alternatives Considered**:

- CNAME to existing domain: Rejected - SSL certificate issues
- New subdomain with redirect: Rejected - adds latency

### SSL Certificate

**Decision**: Generate new Let's Encrypt certificate via certbot standalone mode

**Rationale**:

- Free, automated renewal
- Already using Let's Encrypt for current domain
- Standalone mode avoids nginx complexity during cert generation

**Commands**:

```bash
# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Generate certificate
sudo certbot certonly --standalone -d loopi.nicholaspsmith.com

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

### Repository Rename Impact

**Decision**: Rename via GitHub Settings after code merge

**Rationale**:

- GitHub automatically redirects old URLs
- Clone commands will continue to work (with redirect warning)
- Existing forks will need manual remote URL update

**Impact Analysis**:
| Area | Impact |
|------|--------|
| Clone URLs | Auto-redirect |
| Issues/PRs | Preserved |
| Actions | Continue working |
| Webhooks | May need update |
| External links | Auto-redirect |

## File Categories Analysis

### High Priority (Must Change)

Files that directly affect application behavior:

| File                   | References | Risk                   |
| ---------------------- | ---------- | ---------------------- |
| `package.json`         | 1          | Low - package name     |
| `public/manifest.json` | 2          | Medium - PWA name      |
| `docker-compose*.yml`  | 20         | High - container names |
| `nginx/*.conf`         | 7          | High - routing         |
| `lib/email/*.ts`       | 3          | Medium - user-facing   |

### Medium Priority (Should Change)

Files that affect operations and developer experience:

| Category       | Count | Risk             |
| -------------- | ----- | ---------------- |
| Scripts        | 6     | Low - operations |
| GitHub Actions | 3     | Medium - CI/CD   |
| Documentation  | 8+    | Low - DX         |

### Low Priority (Optional)

Historical documentation in specs/, tests/, drizzle/:

| Category       | Count | Recommendation    |
| -------------- | ----- | ----------------- |
| Spec docs      | ~50   | Skip (historical) |
| Test summaries | ~10   | Skip (historical) |
| Migration docs | ~5    | Skip (historical) |

## Search Patterns

### Primary Replacements

```bash
# Case-sensitive replacements needed:
"MemoryLoop" → "Loopi"       # Brand name (title case)
"memoryloop" → "loopi"       # Technical references
"MEMORYLOOP" → "LOOPI"        # Environment variables (if any)

# URL patterns:
"memoryloop.nicholaspsmith.com" → "loopi.nicholaspsmith.com"
"nicholaspsmith/memoryloop" → "nicholaspsmith/loopi"

# Path patterns:
"/opt/memoryloop" → "/opt/loopi"
"memoryloop-app" → "loopi-app"
"memoryloop-postgres" → "loopi-postgres"
"memoryloop-nginx" → "loopi-nginx"
"memoryloop-network" → "loopi-network"
```

### Exclusions

```bash
# Do not change:
- Database name: POSTGRES_DB=memoryloop (migration required)
- Database user: POSTGRES_USER=memoryloop (migration required)
- Historical spec files in specs/ (preserve context)
- Test summary files (historical documentation)
```

## Risk Assessment

| Risk                      | Likelihood | Impact | Mitigation                        |
| ------------------------- | ---------- | ------ | --------------------------------- |
| DNS propagation delay     | Medium     | Low    | Use low TTL, test before cutover  |
| SSL cert issues           | Low        | High   | Test cert generation on staging   |
| Broken redirects          | Low        | Medium | Verify all URL patterns           |
| Docker image pull failure | Low        | High   | Test new image name before deploy |
| GitHub Actions failure    | Low        | Medium | Test workflow after repo rename   |

## Decisions Summary

1. **DNS**: A record with 300s TTL
2. **SSL**: Let's Encrypt standalone mode
3. **Docker**: Rename containers and network in compose files
4. **VPS Path**: Change `/opt/memoryloop` to `/opt/loopi`
5. **Database**: Keep existing names (no migration)
6. **Specs**: Skip historical documentation updates
