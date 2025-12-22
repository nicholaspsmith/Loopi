# Feature Specification: Ollama Model Deployment

**Feature Branch**: `009-ollama-model-deployment`
**Created**: 2025-12-21
**Status**: Draft
**Input**: User description: "Fix Ollama API error by adding automatic model pulling to deployment script and implementing health checks"

## Problem Statement

The production application is displaying the error: `Error: Ollama API error: Not Found`. Investigation revealed the root cause: the Ollama Docker container starts successfully, but the required models (`nomic-embed-text` for embeddings and `llama3.2` for chat) are never pulled. The base `ollama/ollama:latest` image contains only the Ollama server - models must be explicitly pulled after container startup.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Model Availability on Deployment (Priority: P1)

As a DevOps engineer, I want Ollama models to be automatically pulled during deployment, so that the application can use Ollama services immediately after deployment without manual intervention.

**Why this priority**: This is the core fix for the production error. Without models, the entire Ollama functionality is broken.

**Independent Test**: Deploy to production and verify chat and embedding features work without manual intervention.

**Acceptance Scenarios**:

1. **Given** a fresh deployment, **When** the deployment script completes, **Then** both `nomic-embed-text` and `llama3.2` models are available in the Ollama container
2. **Given** an existing deployment with models already pulled, **When** a re-deployment occurs, **Then** the model pull step completes quickly (idempotent operation)
3. **Given** a deployment in progress, **When** model pulling fails, **Then** the deployment continues with a warning (non-blocking for container startup)

---

### User Story 2 - Health Check API for External Services (Priority: P2)

As a developer, I want a health check endpoint that verifies Ollama and Claude API availability, so that I can quickly diagnose service connectivity issues.

**Why this priority**: Provides observability into external service health, helping prevent and diagnose issues like this in the future.

**Independent Test**: Call `/api/health` endpoint and receive JSON response with status of each external service.

**Acceptance Scenarios**:

1. **Given** Ollama is running with models, **When** I call the health endpoint, **Then** I receive `{ "ollama": "healthy", "model": "llama3.2" }`
2. **Given** Ollama is not running, **When** I call the health endpoint, **Then** I receive `{ "ollama": "unhealthy", "error": "<error message>" }`
3. **Given** Claude API key is valid, **When** I call the health endpoint, **Then** I receive `{ "claude": "healthy" }`
4. **Given** Claude API key is invalid or missing, **When** I call the health endpoint, **Then** I receive `{ "claude": "unhealthy", "error": "<error message>" }`

---

### User Story 3 - Startup Validation (Priority: P3)

As a developer, I want the application to validate external service availability on startup, so that misconfiguration is caught early rather than at runtime.

**Why this priority**: Improves developer experience by failing fast with clear error messages during startup rather than cryptic runtime errors.

**Independent Test**: Start application with invalid Ollama URL and receive clear startup warning message.

**Acceptance Scenarios**:

1. **Given** Ollama is unavailable at startup, **When** the app starts, **Then** a warning is logged but the app continues (graceful degradation)
2. **Given** Claude API key is missing at startup, **When** the app starts, **Then** a warning is logged indicating Claude features are unavailable
3. **Given** all services are available, **When** the app starts, **Then** no warnings are logged and all features work

---

### Edge Cases

- What happens when Ollama is temporarily unavailable during model pull? Retry with exponential backoff, fail with warning after 3 attempts
- What happens when network is slow and model download takes too long? Set reasonable timeout (5 minutes per model), continue deployment with warning
- What happens when Ollama container runs out of disk space during model pull? Capture error message, log clearly, continue deployment
- What happens when health check is called during model download? Return "degraded" status with progress info if available

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Deployment script MUST pull `nomic-embed-text` model after Ollama container is healthy
- **FR-002**: Deployment script MUST pull `llama3.2` model after Ollama container is healthy
- **FR-003**: Model pull operations MUST be idempotent (skip if model already exists)
- **FR-004**: Model pull failures MUST log warnings but NOT block deployment
- **FR-005**: System MUST provide `/api/health` endpoint returning JSON with service status
- **FR-006**: Health endpoint MUST check Ollama connectivity by listing available models
- **FR-007**: Health endpoint MUST verify Claude API key validity without making billable requests
- **FR-008**: Health endpoint MUST return appropriate HTTP status codes (200 for healthy, 503 for unhealthy)
- **FR-009**: Application SHOULD log warnings on startup if external services are unavailable
- **FR-010**: Health endpoint response time MUST be under 5 seconds

### Key Entities

- **Ollama Service**: Local LLM inference service running in Docker container on port 11434
- **Required Models**: `nomic-embed-text` (768-dimension embeddings), `llama3.2` (chat completions)
- **Health Status**: Object containing service name, status (healthy/unhealthy/degraded), optional error message
- **Deployment Script**: `scripts/deploy.sh` - orchestrates production deployment on VPS

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero "Ollama API error: Not Found" errors in production logs after deployment
- **SC-002**: Health endpoint returns accurate status for Ollama within 2 seconds
- **SC-003**: Health endpoint returns accurate status for Claude API within 2 seconds
- **SC-004**: Model pull step adds less than 60 seconds to deployment time when models already exist
- **SC-005**: Application starts successfully even when Ollama is temporarily unavailable
- **SC-006**: 100% of deployments result in working Ollama functionality

## Assumptions

- Ollama container has network access to download models from Ollama registry
- VPS has sufficient disk space for models (~4GB for llama3.2, ~300MB for nomic-embed-text)
- Docker volume `/opt/memoryloop/data/ollama` persists models between deployments
- Claude API key is provided via environment variable `ANTHROPIC_API_KEY`
