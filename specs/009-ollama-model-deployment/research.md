# Research: Ollama Model Deployment

## Decision 1: Ollama Model Pull Location

**Decision**: Add model pulling to `scripts/deploy.sh` after Ollama container health check

**Rationale**:

- The deploy.sh script is the single entry point for production deployments
- Model pull is idempotent (Ollama skips if model already exists)
- Keeps all deployment logic centralized

**Alternatives Considered**:

- Docker entrypoint script: Would require rebuilding the Ollama image
- GitHub Actions workflow: Would add complexity and require VPS-to-Ollama communication
- Manual post-deployment step: Not automated, prone to human error

## Decision 2: Model Pull Failure Handling

**Decision**: Log warning but continue deployment if model pull fails

**Rationale**:

- The application can still function without Ollama (Claude API fallback exists)
- Blocking deployment for model pull failure could cause extended downtime
- Health check will report unhealthy status, alerting operators

**Alternatives Considered**:

- Block deployment: Too risky, could cause extended outages
- Retry with exponential backoff: Adds complexity, model pull already retries internally

## Decision 3: Health Check Enhancement

**Decision**: Enhance existing `/api/health` endpoint to verify model availability

**Rationale**:

- Endpoint already exists and checks Ollama connectivity
- Adding model verification is a natural extension
- No new endpoints needed (YAGNI)

**Alternatives Considered**:

- New `/api/health/ollama` endpoint: Unnecessary, existing endpoint sufficient
- Separate model check script: Would duplicate health check logic

## Decision 4: Required Models

**Decision**: Pull `nomic-embed-text` and `llama3.2` models

**Rationale**:

- `nomic-embed-text`: Used by `lib/embeddings/ollama.ts` (EMBEDDING_MODEL constant)
- `llama3.2`: Used by `lib/claude/client.ts` (OLLAMA_MODEL constant)
- Both are required for full application functionality

**Source Code References**:

- `lib/embeddings/ollama.ts:11`: `export const EMBEDDING_MODEL = 'nomic-embed-text'`
- `lib/claude/client.ts:30`: `export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'`

## Decision 5: Claude API Key Validation

**Decision**: Check for presence of `ANTHROPIC_API_KEY` environment variable only

**Rationale**:

- Making an API call to validate the key would incur costs
- The Anthropic SDK throws errors immediately on invalid keys
- Presence check is sufficient for health reporting

**Alternatives Considered**:

- Validate with API call: Would cost money for each health check
- No validation: Would miss configuration issues
