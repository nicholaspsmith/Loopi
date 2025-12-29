# Feature Specification: Unified Code Navigation MCP Wrapper

**Feature Branch**: `016-unified-code-nav`
**Created**: 2025-12-29
**Status**: Draft (Quick Spec - To Be Expanded)

## Summary

Enhance lance-context MCP server to act as an MCP client to Serena, providing a unified code navigation interface. This reduces CLAUDE.md complexity and agent cognitive load by exposing one set of tools instead of two.

## Problem

- Currently two separate MCP servers: lance-context (vector search) and Serena (symbolic navigation)
- CLAUDE.md has ~50 lines of separate instructions for each
- Agents must understand both and choose correctly, consuming context window
- Context window is the primary limitation for agent effectiveness

## Solution

lance-context becomes a unified wrapper:

- Keeps native vector/semantic search functionality
- Acts as MCP client to Serena for symbolic operations
- Exposes unified tools to Claude agents
- Simplifies CLAUDE.md instructions significantly

## Architecture

```
Claude Agent → lance-context (unified) → Serena (symbolic)
                    ↓
              Vector Search (native)
```

## User Story 1 - Unified Code Search (Priority: P1)

Agents can use a single MCP server for all code navigation needs without choosing between tools.

**Acceptance Scenarios**:

1. **Given** an agent needs to find a symbol, **When** it calls lance-context, **Then** the request is routed to Serena
2. **Given** an agent needs semantic search, **When** it calls lance-context, **Then** native vector search handles it
3. **Given** CLAUDE.md instructions, **When** reviewing tool guidance, **Then** only one tool section exists

## Requirements

- **FR-001**: lance-context MUST act as MCP client to Serena
- **FR-002**: lance-context MUST expose Serena's symbolic tools (get_symbols_overview, find_symbol, etc.)
- **FR-003**: lance-context MUST keep native vector search functionality
- **FR-004**: CLAUDE.md MUST be simplified to reference only lance-context
- **FR-005**: .mcp.json MUST only configure lance-context (Serena becomes internal)

## Success Criteria

- **SC-001**: CLAUDE.md code navigation instructions reduced by 50%+
- **SC-002**: All existing Serena functionality accessible via lance-context
- **SC-003**: No regression in vector search capabilities

## Technical Notes

- lance-context is Node.js, Serena is Python
- Use MCP protocol for inter-server communication
- lance-context spawns Serena as subprocess or connects via stdio
- Consider using @anthropic-ai/sdk MCP client utilities

## Out of Scope (for now)

- Smart query routing (auto-detect symbolic vs semantic)
- Caching/optimization
- New navigation features beyond what Serena provides
