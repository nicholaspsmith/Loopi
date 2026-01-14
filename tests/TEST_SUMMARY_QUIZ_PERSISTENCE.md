# Test Summary: Quiz Progress Persistence Feature

## Overview

Comprehensive test suite for the quiz session persistence feature that allows users to resume study sessions after browser refresh.

## Test Files Created

### 1. Unit Tests - Database Operations

**File**: `tests/unit/db/study-sessions.test.ts`
**Test Count**: 34 tests
**Status**: All passing ✓

#### Test Coverage:

- **createStudySession** (3 tests)
  - Session creation with proper expiry for default modes (24 hours)
  - Session creation with 30-minute expiry for timed mode
  - Guided mode session creation with node tracking

- **getActiveSessionForUser** (4 tests)
  - Finding active sessions for a user
  - Filtering by goalId
  - Returning null when no active session exists
  - Automatically abandoning expired sessions

- **getActiveSessionWithGoal** (2 tests)
  - Returning session with goal title
  - Returning null when no active session exists

- **getSessionById** (2 tests)
  - Retrieving session by ID
  - Returning null for non-existent session

- **updateSessionProgress** (3 tests)
  - Updating current index
  - Updating timed mode state (time remaining, score)
  - Updating lastActivityAt timestamp

- **addSessionResponse** (4 tests)
  - Adding response to empty responses array
  - Appending response to existing responses
  - Updating timed mode data with response
  - Handling non-existent session gracefully

- **completeSession** (2 tests)
  - Marking session as completed with timestamp
  - Session not found by getActiveSessionForUser after completion

- **abandonSession** (2 tests)
  - Marking session as abandoned
  - Session not found by getActiveSessionForUser after abandonment

- **abandonConflictingSessions** (4 tests)
  - Abandoning all active sessions for user/goal
  - Excluding specified session from abandonment
  - Not abandoning sessions for different goals
  - Returning 0 when no conflicting sessions exist

- **cleanupExpiredSessions** (4 tests)
  - Marking expired sessions as abandoned
  - Not affecting non-expired sessions
  - Not affecting already completed sessions
  - Returning 0 when no expired sessions exist

- **Session Expiry Calculation** (4 tests)
  - 24-hour expiry for flashcard mode
  - 24-hour expiry for multiple_choice mode
  - 24-hour expiry for mixed mode
  - 30-minute expiry for timed mode

### 2. API Contract Tests

**File**: `tests/contract/study-session-persistence.test.ts`
**Test Count**: 31 tests
**Status**: All passing ✓

#### Test Coverage:

- **POST /api/study/session** (6 tests)
  - Creating and persisting a new study session
  - Creating timed mode session with proper settings
  - Abandoning conflicting sessions when creating new one
  - 401 when not authenticated
  - 400 for invalid mode
  - 404 for non-existent goal

- **GET /api/study/session/active** (4 tests)
  - Returning active session for goal with progress info
  - Returning no session when none exists
  - 401 when not authenticated
  - Including timed mode data when applicable

- **POST /api/study/session/resume** (5 tests)
  - Resuming session with fresh card data
  - 401 when not authenticated
  - 400 for invalid sessionId format
  - 404 for non-existent session
  - 403 when trying to resume another user's session
  - 400 for completed session

- **POST /api/study/session/progress** (7 tests)
  - Saving progress with response
  - Saving progress without response
  - Handling sendBeacon text/plain content type
  - Saving timed mode updates
  - 401 when not authenticated
  - 400 for invalid request data
  - 404 for non-existent session

- **DELETE /api/study/session/abandon** (5 tests)
  - Abandoning active session
  - Success when abandoning already abandoned session
  - 401 when not authenticated
  - 400 for invalid sessionId format
  - 404 for non-existent session

- **POST /api/study/session/complete** (2 tests)
  - Completing session and marking as completed
  - 401 when not authenticated

- **End-to-End Session Flow** (1 test)
  - Complete lifecycle: create → save progress → resume → continue → complete

### 3. Component Tests

**File**: `tests/unit/components/study/ResumeSessionDialog.test.tsx`
**Test Count**: 41 tests
**Status**: All passing ✓

#### Test Coverage:

- **Rendering** (9 tests)
  - Not rendering when closed
  - Rendering when open
  - Displaying goal title
  - Formatting mode names (flashcard, multiple_choice)
  - Displaying dialog title, buttons, and warning message

- **Progress Display** (4 tests)
  - Displaying progress percentage
  - Rendering progress bar with correct width
  - Displaying 0% and 100% progress correctly

- **Relative Time Formatting** (5 tests)
  - "just now" for recent activity
  - Minutes, hours, days ago
  - Singular time units

- **Timed Mode Display** (6 tests)
  - Displaying time remaining
  - Displaying score
  - Formatting hours, minutes, seconds
  - Not displaying timed info for non-timed modes

- **User Interactions** (8 tests)
  - Calling onResume when resume button clicked
  - Calling onStartNew when start new button clicked
  - Calling onClose for close button, backdrop click, Escape key
  - Not calling onClose when dialog content clicked
  - Not responding to other keys or when closed

- **Accessibility** (4 tests)
  - Role="dialog" attribute
  - Aria-modal="true" attribute
  - Aria-labelledby pointing to title
  - Aria-label on close button

- **Edge Cases** (5 tests)
  - Handling very long goal titles
  - Handling zero time remaining
  - Handling undefined timed mode fields
  - Handling very high progress percentages
  - Handling fractional percentages by rounding

## Test Statistics

### Overall Summary

- **Total Test Files**: 3
- **Total Tests**: 106
- **Status**: All passing ✓

### Coverage by Category

| Category            | Tests | Status        |
| ------------------- | ----- | ------------- |
| Database Operations | 34    | ✓ All passing |
| API Contracts       | 31    | ✓ All passing |
| Components          | 41    | ✓ All passing |

## Key Features Tested

### Session Lifecycle

1. Creation with proper expiry times (24h default, 30m timed)
2. Progress tracking (current index, responses)
3. Resume functionality with fresh card data
4. Completion with status update
5. Abandonment (explicit and automatic for expired sessions)

### Timed Mode Support

1. Session creation with time and score tracking
2. Progress updates with time remaining and score
3. Display in resume dialog with formatted time

### Multi-Session Handling

1. Conflict detection and resolution
2. Automatic abandonment of conflicting sessions
3. Proper isolation by goal and user

### Security & Validation

1. Authentication checks on all endpoints
2. Ownership verification (403 for other user's sessions)
3. Input validation (UUID format, required fields)
4. Status checks (can't resume completed/abandoned sessions)

### User Experience

1. Progress display with percentage and card count
2. Relative time formatting (e.g., "2 hours ago")
3. Accessible modal dialog with keyboard support
4. Graceful handling of edge cases

## Running the Tests

```bash
# Unit tests (database operations)
npm test -- tests/unit/db/study-sessions.test.ts

# Component tests
npm test -- tests/unit/components/study/ResumeSessionDialog.test.tsx

# API contract tests
npm run test:contract -- tests/contract/study-session-persistence.test.ts

# All tests
npm test  # Unit and component tests
npm run test:contract  # Contract tests
```

## Database Migration

The tests rely on the study_sessions table migration:

- **Migration File**: `drizzle/0012_add_study_sessions.sql`
- **Applied**: Yes (via `npm run db:push`)

## Test Patterns Used

1. **Test Isolation**: Each test cleans up conflicting sessions before running
2. **Mock Authentication**: Using vi.mock for NextAuth auth function
3. **Database Cleanup**: Using beforeAll/afterAll for test fixtures
4. **Async/Await**: All database operations properly awaited
5. **Snapshot Testing**: Progress calculations verified with exact values
6. **Edge Case Coverage**: Testing boundary conditions and error paths

## Notes

- Some tests show Jina API errors in stderr - this is expected in test environment where JINA_API_KEY may not be configured
- LanceDB connections are properly closed in afterAll hooks
- Test database uses isolated worker databases to prevent conflicts
