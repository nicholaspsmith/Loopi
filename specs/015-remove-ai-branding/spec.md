# Feature Specification: Remove AI Branding and Consolidate to Claude Backend

**Feature Branch**: `015-remove-ai-branding`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "I want to obfuscate from the user which LLM we are using or even that we are using an LLM at all. I also want to remove ollama completely from our app and just use Claude. I will set the API key in our CI and in our .env in prod. There will be nowhere in the user interface where a user enters an api key. Nor will there be any mention of AI, Claude, ollama, etc... anywhere in the UI."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seamless Content Generation (Priority: P1)

Users interact with the application to generate flashcards, study materials, and skill trees without any awareness that an AI/LLM is powering these features. The experience feels like native application functionality rather than an AI-powered tool.

**Why this priority**: This is the core user experience change - making AI invisible to users creates a more polished, product-focused experience and removes technical distractions.

**Independent Test**: Can be fully tested by using all content generation features (flashcard creation, skill tree generation, study sessions) and verifying no AI-related terminology appears in the UI, error messages, or loading states.

**Acceptance Scenarios**:

1. **Given** a user is creating flashcards, **When** the system generates content, **Then** no loading messages mention "AI", "Claude", "generating with AI", or similar terminology
2. **Given** a user is viewing any page in the application, **When** they inspect all visible text, **Then** no references to AI, LLM, Claude, Anthropic, or Ollama appear
3. **Given** a user encounters an error during content generation, **When** the error is displayed, **Then** the message describes the issue without mentioning AI providers

---

### User Story 2 - Simplified Settings Experience (Priority: P1)

Users access the settings page without seeing any API key management, provider selection, or AI configuration options. The settings page only shows user account and preference options.

**Why this priority**: Removing API key entry eliminates user friction and confusion, while enabling the business to control costs centrally.

**Independent Test**: Can be fully tested by navigating to settings and verifying no API key input fields, provider badges, or AI-related configuration sections exist.

**Acceptance Scenarios**:

1. **Given** a user navigates to settings, **When** the page loads, **Then** no API key input fields are visible
2. **Given** a user is on any settings page, **When** they view all options, **Then** no AI provider selection or configuration options appear
3. **Given** a user has previously stored an API key, **When** they access the updated application, **Then** their stored key data is removed and no longer accessible

---

### User Story 3 - Backend Claude Integration (Priority: P1)

The application uses Claude exclusively for all AI-powered features, with the API key managed server-side through environment variables. No Ollama code paths remain in the application.

**Why this priority**: Simplifies the codebase, reduces maintenance burden, and ensures consistent AI quality across all users.

**Independent Test**: Can be fully tested by triggering all AI-powered features and verifying they work correctly with the server-side Claude API key, while confirming no Ollama-related code executes.

**Acceptance Scenarios**:

1. **Given** the application is deployed, **When** a user triggers content generation, **Then** the system uses the server-configured Claude API key
2. **Given** the Ollama code has been removed, **When** the application builds and runs, **Then** no Ollama dependencies or code paths exist
3. **Given** the server Claude API key is not configured, **When** a user triggers content generation, **Then** an appropriate error is displayed without revealing the underlying provider

---

### Edge Cases

- What happens when the server-side Claude API key is missing or invalid? Display a generic "Service temporarily unavailable" message without mentioning AI providers.
- What happens when Claude API rate limits are hit? Display "Please try again in a moment" without mentioning API limits or providers.
- What happens to existing user API keys stored in the database? They should be cleaned up/migrated as part of deployment.
- What happens if a user inspects network requests? API endpoint names (`/api/chat/`, `/api/flashcards/`, `/api/goals/`) already use neutral terminology and don't reveal AI provider details.
- What happens when Jina Embeddings API is unavailable? Graceful degradation - semantic search is disabled, core features continue working, warnings are logged, and embedding requests are queued for processing when API becomes available.
- What happens to existing Ollama-generated embeddings in the database? Keep existing embeddings as-is; only new content will use Jina embeddings. No migration required.

## Requirements _(mandatory)_

### Functional Requirements

**UI Changes:**

- **FR-001**: System MUST remove all visible text containing "AI", "artificial intelligence", "Claude", "Anthropic", "Ollama", or "LLM" from the user interface
- **FR-002**: System MUST remove API key input fields from the settings page
- **FR-003**: System MUST remove provider selection/badge components from the UI
- **FR-004**: System MUST update loading states to use neutral terminology (e.g., "Generating..." instead of "AI is generating...")
- **FR-005**: System MUST update error messages to use neutral terminology without mentioning AI providers

**Backend Changes:**

- **FR-006**: System MUST remove all Ollama-related code, dependencies, and configuration
- **FR-007**: System MUST use a server-side environment variable (ANTHROPIC_API_KEY) for Claude API access
- **FR-007a**: System MUST use a server-side environment variable (JINA_API_KEY) for Jina Embeddings API access
- **FR-008**: System MUST NOT accept or process user-provided API keys
- **FR-009**: System MUST verify no api_keys database table or related operations exist (already removed in migration 0006)
- **FR-010**: System MUST update all AI-related API routes to use the server-configured API key
- **FR-010a**: System MUST replace Ollama embeddings with Jina Embeddings API for vector search functionality
- **FR-010b**: System MUST implement a database-backed queue for failed embedding requests that persists across restarts
- **FR-010c**: System MUST fail to start if ANTHROPIC_API_KEY or JINA_API_KEY environment variables are missing

**Infrastructure Changes:**

- **FR-011**: CI/CD pipeline MUST be updated to include ANTHROPIC_API_KEY and JINA_API_KEY as secrets
- **FR-012**: Production environment MUST be configured with ANTHROPIC_API_KEY and JINA_API_KEY
- **FR-013**: Docker configuration MUST be updated to remove Ollama service and add ANTHROPIC_API_KEY and JINA_API_KEY

### Key Entities

- **Environment Configuration**: Server-side secrets including ANTHROPIC_API_KEY and JINA_API_KEY, managed through CI/CD and production environment variables
- **User Settings**: Simplified to exclude API key and AI provider preferences (removed fields: api_keys table, provider selection)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero instances of AI-related terminology visible in the user interface across all pages and states
- **SC-002**: Settings page load time remains under 1 second (no regression from removing features)
- **SC-003**: All content generation features (flashcards, skill trees, study materials) function correctly using server-side API key
- **SC-004**: Application builds and runs with zero Ollama-related code or dependencies
- **SC-005**: Users can complete all core workflows without encountering any AI-provider-specific messaging
- **SC-006**: Error scenarios display user-friendly messages that do not expose technical implementation details

## Clarifications

### Session 2025-12-29

- Q: How should Jina embeddings be integrated? → A: Jina Embeddings API (cloud service, requires API key via JINA_API_KEY environment variable)
- Q: What should happen when Jina API is unavailable? → A: Graceful degradation with queued retry - semantic search disabled, core features work, log warnings, queue embedding requests for processing when API becomes available
- Q: What happens to existing Ollama-generated embeddings? → A: Keep existing embeddings, only generate new ones with Jina (no migration required)
- Q: How should failed embedding requests be queued? → A: Database-backed queue (persistent, survives restarts)
- Q: What should happen if the application starts with BOTH API keys missing? → A: Fail to start - require both ANTHROPIC_API_KEY and JINA_API_KEY for application boot

## Assumptions

- The ANTHROPIC_API_KEY will be provisioned and managed by the system administrator
- The JINA_API_KEY will be provisioned and managed by the system administrator for vector embeddings
- API costs will be absorbed by the service rather than passed to users
- Existing user API key data can be safely deleted without data retention requirements
- No regulatory or compliance requirements mandate disclosing AI usage to users
