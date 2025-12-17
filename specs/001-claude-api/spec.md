# Feature Specification: Claude API Integration with User API Keys

**Feature Branch**: `001-claude-api`
**Created**: 2025-12-17
**Status**: Draft
**Input**: User description: "Implement Claude API integration. Use Ollama as a fallback only. Claude API key will be entered by user through user interface. It will be stored securely. Each user can only hit the Claude API if they entered their API key through the user interface."
**Related Issue**: https://github.com/nicholaspsmith/memoryloop/issues/153

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter and Save API Key (Priority: P1)

A user wants to provide their own Claude API key to enable AI-powered chat functionality without relying on the system owner's credentials.

**Why this priority**: This is the foundational capability that enables the entire feature. Without the ability to enter and store an API key, users cannot access Claude API functionality. This represents the core value proposition of the feature - allowing users to bring their own API access.

**Independent Test**: Can be fully tested by navigating to settings, entering a valid API key, saving it, and verifying the key is stored and can be retrieved. Delivers immediate value by allowing users to configure their own API access.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they navigate to account settings, **Then** they see an API key management section with a secure input field
2. **Given** a user enters a valid Claude API key, **When** they click save, **Then** the key is securely stored and a success message is displayed
3. **Given** a user has previously saved an API key, **When** they return to settings, **Then** they see a masked version of their key (e.g., "sk-ant-...xyz123") and options to update or remove it
4. **Given** a user enters an invalid API key format, **When** they attempt to save, **Then** they see a validation error before the save attempt

---

### User Story 2 - Use Claude API with Personal Key (Priority: P1)

A user with a saved API key wants to have conversations with Claude using their own API credentials, knowing that API costs will be charged to their account.

**Why this priority**: This is the second essential piece - actually using the stored API key to make requests. Without this, storing the key provides no value. Together with Story 1, this forms the complete MVP that delivers the core user value.

**Independent Test**: Can be fully tested by a user with a saved API key starting a new chat conversation, sending a message, and receiving a response from Claude API. System logs should confirm the user's personal API key was used. Delivers the core feature value of personalized API access.

**Acceptance Scenarios**:

1. **Given** a user has a valid API key saved, **When** they send a message in chat, **Then** the system uses their personal Claude API key to generate the response
2. **Given** a user has a valid API key saved, **When** they generate flashcards, **Then** the system uses their personal Claude API key for the flashcard generation request
3. **Given** a user's API key is used successfully, **When** the conversation completes, **Then** the user's API usage is tracked against their own Anthropic account (not the system owner's)

---

### User Story 3 - API Key Validation and Feedback (Priority: P2)

A user wants immediate feedback when entering their API key to know if it's valid and working before saving it.

**Why this priority**: While not essential for basic functionality, this significantly improves user experience by preventing users from saving invalid keys. Users can still save and test keys without this, but validation prevents frustration and support issues.

**Independent Test**: Can be fully tested by entering various API key formats (valid, invalid, malformed) and observing the real-time validation feedback. Delivers value by reducing user errors and improving confidence in the configuration process.

**Acceptance Scenarios**:

1. **Given** a user enters an API key, **When** they trigger validation (via button or auto-check), **Then** the system tests the key with a minimal API call and displays success or error feedback
2. **Given** a user's API key fails validation, **When** they see the error message, **Then** they receive helpful information about why it failed (e.g., "Invalid key format", "Authentication failed", "Rate limit exceeded")
3. **Given** a user's API key is validated successfully, **When** the validation completes, **Then** they see a confirmation message and the save button becomes enabled

---

### User Story 4 - Fallback to Ollama (Priority: P2)

A user without a saved API key still wants to use the application with limited functionality using the local Ollama instance as a fallback.

**Why this priority**: This enables users to try the application before committing to API costs and provides graceful degradation. It's not critical for the primary user flow but supports user onboarding and resilience.

**Independent Test**: Can be fully tested by using the application without saving an API key and verifying that chat and flashcard generation still work using Ollama. Delivers value by allowing trial usage and providing a safety net.

**Acceptance Scenarios**:

1. **Given** a user has no API key saved, **When** they send a chat message, **Then** the system falls back to Ollama and displays a notice that they're using the local fallback
2. **Given** a user has no API key saved, **When** they attempt to generate flashcards, **Then** the system uses Ollama and may display a recommendation to add their Claude API key for better results
3. **Given** a user is using Ollama fallback, **When** they navigate to settings, **Then** they see a prominent call-to-action to add their Claude API key for enhanced features

---

### User Story 5 - Update or Remove API Key (Priority: P3)

A user wants to update their existing API key (e.g., after rotating keys for security) or remove it entirely.

**Why this priority**: This is important for ongoing management but not critical for initial usage. Users can work around this by contacting support or using the application as-is. It's essential for production but can be added after core functionality is proven.

**Independent Test**: Can be fully tested by a user with an existing API key updating it to a new value or removing it, then verifying the changes take effect in subsequent API calls. Delivers value for ongoing key management and security hygiene.

**Acceptance Scenarios**:

1. **Given** a user has an existing API key, **When** they update it to a new valid key, **Then** the new key is stored securely and subsequent requests use the updated key
2. **Given** a user wants to remove their API key, **When** they click delete/remove, **Then** they see a confirmation dialog explaining they'll fall back to Ollama
3. **Given** a user confirms API key removal, **When** the deletion completes, **Then** the key is permanently removed and subsequent requests use Ollama fallback

---

### Edge Cases

- What happens when a user's API key becomes invalid (e.g., revoked, quota exceeded) mid-conversation?
- How does the system handle API key rotation while a chat session is in progress?
- What happens if both the user's API key AND Ollama are unavailable?
- How does the system behave if a user enters a valid-format key that belongs to a different account?
- What happens when a user has multiple browser tabs open and updates their API key in one tab?
- How does the system handle very long API keys or special characters in the key?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated settings page where users can enter, view (masked), update, and remove their Claude API key
- **FR-002**: System MUST securely store user API keys using encryption at rest
- **FR-003**: System MUST use a user's personal Claude API key when available for all AI-powered features (chat, flashcard generation)
- **FR-004**: System MUST fall back to Ollama when a user has no API key configured
- **FR-005**: System MUST validate API key format before allowing save (basic format check: starts with "sk-ant-")
- **FR-006**: System MUST provide real-time API key validation by making a test request to the Claude API
- **FR-007**: System MUST display masked API keys in the UI (showing only first 7 and last 4 characters, e.g., "sk-ant-...xyz123")
- **FR-008**: System MUST prevent users without an API key from accessing Claude API features
- **FR-009**: System MUST display clear indicators to users showing whether they're using Claude API or Ollama fallback
- **FR-010**: System MUST handle API key errors gracefully and provide actionable error messages
- **FR-011**: System MUST allow users to delete their stored API key at any time
- **FR-012**: System MUST NOT expose API keys in client-side code, logs, or error messages
- **FR-013**: System MUST associate API keys with specific user accounts (one key per user)
- **FR-014**: System MUST track which AI provider (Claude API or Ollama) was used for each conversation and flashcard generation
- **FR-015**: System MUST re-validate user API keys when they return authentication errors from Claude API

### Key Entities *(include if feature involves data)*

- **User API Key**: Encrypted string associated with a user account, represents their personal Claude API credentials
  - Belongs to exactly one User
  - Must be encrypted before storage
  - Optional (nullable) - users can use the app without one
  - Can be validated, updated, or deleted

- **AI Provider Configuration**: Tracks which AI provider (Claude API or Ollama) is being used per request
  - Associated with Messages and Flashcard generation requests
  - Determines routing of AI requests
  - Provides audit trail for user API usage

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully save their Claude API key and use it for chat within 2 minutes of first attempt
- **SC-002**: 95% of users with valid API keys successfully generate responses using Claude API without errors
- **SC-003**: Users without API keys can still complete basic chat flows using Ollama fallback
- **SC-004**: API key validation provides feedback within 3 seconds of user input
- **SC-005**: Zero API keys are exposed in application logs, client-side code, or error messages during security audit
- **SC-006**: System gracefully handles Claude API errors and falls back to Ollama in 100% of failure cases
- **SC-007**: Users can identify which AI provider is being used for their current session within 1 glance at the UI

## Assumptions

- Users have access to their own Claude API keys (can obtain them from Anthropic's console)
- Ollama is already configured and running on the system for fallback scenarios
- Users understand basic concept of API keys and API usage costs
- Application already has a user authentication system to associate keys with specific users
- Encryption at rest will use industry-standard AES-256 encryption
- Database already supports encrypted field storage or encryption can be added
- Users will be responsible for their own API costs when using their personal keys
- Session management exists to maintain user identity across requests

## Dependencies

- Existing user authentication and session management system
- Ollama installation and configuration (for fallback)
- Database schema migration capability to add encrypted API key field
- Anthropic Claude API documentation for validation and error handling patterns

## Out of Scope

- Cost tracking or billing features for API usage
- Admin interface to view or manage user API keys
- API key sharing between multiple users
- Support for other AI provider keys (OpenAI, etc.)
- Automatic API key rotation or expiration
- Usage quotas or rate limiting per user
- Historical API usage analytics or reporting
