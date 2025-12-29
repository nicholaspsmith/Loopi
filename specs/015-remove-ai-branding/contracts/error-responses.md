# Error Response Contracts

**Feature**: 015-remove-ai-branding
**Purpose**: Define neutral error messages that don't reveal AI provider details

## Error Response Format

All API routes returning errors should use this format:

```typescript
interface ErrorResponse {
  error: string // User-friendly message (neutral)
  code?: string // Internal error code for debugging (optional)
}
```

## Error Mapping

### Content Generation Errors

These errors occur during flashcard generation, skill tree generation, and chat.

| Internal Cause            | HTTP Status | User Message                                                  | Internal Code         |
| ------------------------- | ----------- | ------------------------------------------------------------- | --------------------- |
| Missing ANTHROPIC_API_KEY | 503         | "Service temporarily unavailable."                            | `SERVICE_UNAVAILABLE` |
| Invalid API key           | 503         | "Service configuration error. Please contact support."        | `CONFIG_ERROR`        |
| API quota exceeded        | 503         | "Service temporarily unavailable. Please try again later."    | `QUOTA_EXCEEDED`      |
| Rate limit hit            | 429         | "Please wait a moment and try again."                         | `RATE_LIMITED`        |
| Network error             | 503         | "Unable to connect to service. Please check your connection." | `NETWORK_ERROR`       |
| Malformed request         | 400         | "Invalid request. Please try again."                          | `BAD_REQUEST`         |
| Unknown error             | 500         | "Something went wrong. Please try again."                     | `INTERNAL_ERROR`      |

### Health Check Response

The `/api/health` endpoint should return neutral status:

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    database: 'up' | 'down'
    contentGeneration: 'up' | 'down' // Replaces "claude" and "ollama"
  }
  timestamp: string
}
```

**Note**: Do not include `claude`, `ollama`, or `ai` in any field names.

## Loading State Text

UI components should use these neutral loading messages:

| Context               | Message                          |
| --------------------- | -------------------------------- |
| Generating flashcards | "Generating flashcards..."       |
| Creating skill tree   | "Building your learning path..." |
| Chat response         | "Thinking..."                    |
| General loading       | "Loading..."                     |

## Implementation Notes

1. **Never expose** these terms to users:
   - Claude, Anthropic
   - Ollama, LLaMA
   - AI, artificial intelligence, LLM
   - API key, token, quota

2. **Logging**: Internal logs can still use specific error details for debugging, but user-facing responses must be neutral.

3. **Error codes**: The `code` field is for internal use only and should not be displayed to users.
