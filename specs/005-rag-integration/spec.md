# Feature Specification: RAG Integration for Enhanced Chat Responses

**Feature Branch**: `005-rag-integration`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "Implement RAG (Retrieval-Augmented Generation) to enhance chat responses with semantic search over conversation history. When users ask questions, the system should search for semantically similar past messages using vector embeddings in LanceDB, build context from those messages, and include that context in the Claude API call. This allows Claude to provide responses informed by the user's entire conversation history, not just the current conversation. The feature should automatically determine when to use RAG (skip for greetings, enable for substantive questions), search up to 5 similar messages with a 2000 token limit, format them as context, and prepend to the system prompt. Users should see a visual indicator that RAG is enabled."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Context Retrieval (Priority: P1)

A user asks a question related to a topic they discussed in previous conversations, and receives a response that demonstrates Claude remembers and builds upon that context without requiring the user to repeat information.

**Why this priority**: This is the core value proposition - enabling Claude to leverage the user's entire conversation history, not just the current chat. Without this, RAG provides no benefit.

**Independent Test**: Can be fully tested by having two separate conversations about the same topic (e.g., "What is LanceDB?" followed hours later by "How do I query it?"), and verifying the second response references information from the first conversation.

**Acceptance Scenarios**:

1. **Given** a user has previously discussed vector databases in a past conversation, **When** they ask "How does semantic search work?" in a new conversation, **Then** Claude's response references their previous vector database discussion
2. **Given** a user asks a substantive question (>10 characters, not a greeting), **When** the system processes their message, **Then** it searches for up to 5 semantically similar messages from their history
3. **Given** similar past messages are found, **When** building the AI prompt, **Then** context from those messages is prepended to the system prompt with a maximum of 2000 tokens
4. **Given** a user asks a greeting like "hi" or "hello", **When** the system processes their message, **Then** it skips RAG context retrieval to avoid unnecessary overhead

---

### User Story 2 - RAG Status Visibility (Priority: P2)

A user wants to know when their responses are being enhanced with RAG so they understand why Claude seems to "remember" past conversations.

**Why this priority**: Transparency builds trust and helps users understand the system's capabilities. Not critical for functionality but important for user experience.

**Independent Test**: Can be fully tested by viewing the chat interface and verifying a visual indicator (banner, icon, or label) appears informing users that RAG is active.

**Acceptance Scenarios**:

1. **Given** a user is in the chat interface, **When** they view the page, **Then** they see a visual indicator that RAG is enabled (e.g., "RAG enabled - responses enhanced with your conversation history")
2. **Given** the RAG indicator is visible, **When** a user hovers or clicks for more information, **Then** they receive a brief explanation of what RAG means

---

### User Story 3 - Graceful Degradation (Priority: P2)

The system continues to function normally even when RAG components fail (no embeddings available, LanceDB errors, embedding generation failures).

**Why this priority**: Ensures reliability - RAG should enhance responses but never break the chat experience. Critical for production stability but not required for initial demonstration.

**Independent Test**: Can be fully tested by simulating RAG failures (disconnected LanceDB, missing embeddings) and verifying chat still works with standard (non-RAG) responses.

**Acceptance Scenarios**:

1. **Given** no embeddings exist in LanceDB for the user, **When** they send a message, **Then** chat works normally without RAG context (falls back to standard prompt)
2. **Given** LanceDB is unavailable or returns an error, **When** RAG context retrieval fails, **Then** the error is logged and chat continues with standard prompt
3. **Given** embedding generation fails for a message, **When** saving the message, **Then** it stores with null embedding and chat continues normally

---

### Edge Cases

- What happens when a user has thousands of past messages? (Performance: vector search should remain fast with proper indexing)
- How does the system handle very long messages that exceed token limits? (Truncation: format function limits context to 2000 tokens)
- What if semantically similar messages contain contradictory information? (Claude receives all context and reconciles in response)
- How are embeddings kept consistent with message content? (Embeddings generated asynchronously on message creation, immutable once created)
- What happens if a user deletes messages that were used as RAG context? (Future queries won't find deleted messages; no retroactive cleanup needed)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST search for semantically similar messages from the user's conversation history when processing chat requests
- **FR-002**: System MUST use vector embeddings stored in LanceDB to perform semantic similarity search
- **FR-003**: System MUST retrieve up to 5 most similar messages as context for each query
- **FR-004**: System MUST limit RAG context to approximately 2000 tokens to avoid exceeding Claude API limits
- **FR-005**: System MUST automatically determine when to enable RAG based on message characteristics (skip greetings, enable for substantive questions >10 characters)
- **FR-006**: System MUST prepend RAG context to the system prompt before sending to Claude API
- **FR-007**: System MUST format RAG context clearly with message role labels (user/assistant) and content
- **FR-008**: System MUST display a visual indicator in the chat interface informing users that RAG is enabled
- **FR-009**: System MUST gracefully degrade when RAG components fail (missing embeddings, LanceDB errors) by continuing chat without context
- **FR-010**: System MUST log RAG operations for debugging (number of similar messages found, context length, failures)
- **FR-011**: System MUST scope semantic search to the current user's messages only (privacy boundary)
- **FR-012**: System MUST handle cases where no similar messages exist (new users, first conversations) by continuing without RAG context

### Key Entities

- **RAG Context**: Structured data containing similar messages and formatted context string
  - Contains: source messages (array), context string (formatted text), enabled flag (boolean)
  - Built from: semantic search results filtered by user ID
  - Used by: chat API to enhance Claude prompts

- **Message Embeddings**: Vector representations of message content (768-dimensional) stored in LanceDB
  - Generated: Asynchronously after message creation using Ollama nomic-embed-text model
  - Queried: During RAG context retrieval via vector similarity search
  - Lifecycle: Created once, immutable, nullable (null until generated)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users asking follow-up questions about previously discussed topics receive responses that demonstrate context awareness in 90% of cases (when similar messages exist)
- **SC-002**: RAG context retrieval completes within 500ms for queries searching up to 10,000 past messages
- **SC-003**: Chat functionality continues to work (100% uptime) even when RAG components fail
- **SC-004**: Users can identify that RAG is enabled within 1 second of viewing the chat interface
- **SC-005**: System correctly skips RAG for simple greetings (hi, hello, hey) 100% of the time to avoid unnecessary overhead
- **SC-006**: Formatted RAG context stays within 2000 token limit in 100% of cases to prevent API errors

## Assumptions

- Vector embeddings for messages are already being generated and stored in LanceDB (existing infrastructure from previous work)
- LanceDB vector search is functional and performant with proper indexing
- Claude API can handle system prompts augmented with 2000 tokens of additional context
- Users understand that "conversation history" means all their past conversations, not just the current chat thread
- RAG should be enabled by default for all users (no opt-in/opt-out mechanism needed initially)
- Token counting can be approximated as ~4 characters per token for context limiting

## Dependencies

- LanceDB with vector search capabilities and message embeddings table
- Ollama embedding service (nomic-embed-text model) for generating query embeddings
- Existing chat API infrastructure that accepts system prompts
- Message storage in both PostgreSQL (metadata) and LanceDB (content + embeddings)

## Out of Scope

- User controls to toggle RAG on/off per conversation or globally
- Displaying which specific past messages contributed to the context (source citation)
- Cross-user RAG (searching messages from other users)
- Fine-tuning which types of messages are included in RAG context (currently includes all user and assistant messages)
- Caching RAG context for repeated similar queries
- Analytics or metrics on RAG effectiveness (A/B testing, quality scores)
- Manual refresh or re-generation of embeddings for edited messages
- RAG for other features beyond chat (e.g., flashcard generation)

## Clarifications

### Logging Destination (Question 1)
**Question**: Where should RAG operational logs be sent for production monitoring and debugging?

**Answer**: Standard application logs with structured JSON format

**Rationale**: RAG logs (similar message count, context length, failures) will be integrated into the existing application logging infrastructure using structured JSON for easy parsing and filtering. This avoids introducing additional logging systems while maintaining production observability.
