# Quickstart: Ollama Model Deployment Testing

## Prerequisites

- Docker and Docker Compose installed
- Access to VPS or local Docker environment
- Project cloned and dependencies installed (`npm install`)

## Test Scenarios

### Scenario 1: Verify Deploy Script Model Pulling

**Purpose**: Confirm models are pulled during deployment

**Steps**:

1. Remove existing Ollama models (if any):

   ```bash
   docker exec memoryloop-ollama ollama rm nomic-embed-text || true
   docker exec memoryloop-ollama ollama rm llama3.2 || true
   ```

2. Run deploy script:

   ```bash
   ./scripts/deploy.sh
   ```

3. Verify models exist:
   ```bash
   docker exec memoryloop-ollama ollama list
   ```

**Expected Output**:

```
NAME                    ID              SIZE      MODIFIED
nomic-embed-text:latest abc123          274 MB    Just now
llama3.2:latest         def456          2.0 GB    Just now
```

### Scenario 2: Verify Health Endpoint Reports Model Status

**Purpose**: Confirm health endpoint shows Ollama model availability

**Steps**:

1. Start the application:

   ```bash
   npm run dev
   ```

2. Call health endpoint:
   ```bash
   curl http://localhost:3000/api/health | jq
   ```

**Expected Output (healthy)**:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T10:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "ollama": {
      "status": "healthy",
      "models": ["nomic-embed-text:latest", "llama3.2:latest"]
    },
    "environment": { "status": "healthy" }
  }
}
```

**Expected Output (missing models)**:

```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-21T10:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "ollama": {
      "status": "unhealthy",
      "message": "Missing models: nomic-embed-text, llama3.2"
    },
    "environment": { "status": "healthy" }
  }
}
```

### Scenario 3: Verify Deployment Continues on Model Pull Failure

**Purpose**: Confirm deployment doesn't fail if model pull fails

**Steps**:

1. Simulate network failure (disconnect Ollama container from internet):

   ```bash
   docker network disconnect bridge memoryloop-ollama
   ```

2. Run deploy script:

   ```bash
   ./scripts/deploy.sh
   ```

3. Check output for warning messages

**Expected Output**:

- Script completes with exit code 0
- Warning messages appear: "Warning: Failed to pull nomic-embed-text"
- Health check reports unhealthy for Ollama

### Scenario 4: Verify Idempotent Model Pull

**Purpose**: Confirm model pull is fast when models already exist

**Steps**:

1. Ensure models are already pulled:

   ```bash
   docker exec memoryloop-ollama ollama list
   ```

2. Time the deploy script:
   ```bash
   time ./scripts/deploy.sh 2>&1 | grep -E "(Pulling|models|ready)"
   ```

**Expected Output**:

- Model pull step completes in under 5 seconds
- Messages indicate models already present

## Manual Verification Checklist

- [ ] Fresh deployment pulls both models successfully
- [ ] Re-deployment skips model pull (already present)
- [ ] Health endpoint shows model availability
- [ ] Health endpoint returns 503 when models missing
- [ ] Deployment continues with warning if model pull fails
- [ ] Chat feature works after deployment
- [ ] Embedding generation works after deployment
