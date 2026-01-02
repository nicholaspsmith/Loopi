# Research: Custom Cards & Goal Management

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Research Topics

### 1. Custom Card Creation

**Decision**: Simple form with question/answer fields, linked to specific node

**Rationale**:

- Custom cards supplement auto-generated content
- Cards should use the same FSRS system as auto-generated cards
- Initialize as "New" state (state: 0) so they go through learning process

**Validation**:

- Question: 5-1000 characters
- Answer: 5-5000 characters
- Node must exist and belong to user's goal

### 2. Multi-Select Goal Management

**Decision**: Add checkboxes to goals page with floating action bar for bulk operations

**Rationale**:

- Goals page is the natural location for goal management
- Multi-select with checkboxes is familiar UI pattern
- Floating action bar appears when 1+ goals selected (similar to email clients)
- No need for separate settings page

**Components**:

- Checkbox on each goal card
- "Select All" / "Deselect All" controls
- Floating action bar with Archive and Delete buttons
- Confirmation modals for each action

**UI Behavior**:

- Checkboxes visible on hover or when any goal is selected
- Action bar slides up from bottom when selection exists
- Escape key clears selection
- Clicking outside goals area clears selection

### 3. Goal Limits

**Decision**: Hard limits to encourage focus and prevent system abuse

| Limit Type     | Maximum | Rationale                                                |
| -------------- | ------- | -------------------------------------------------------- |
| Active goals   | 6       | Research shows 3-7 concurrent goals is optimal for focus |
| Archived goals | 6       | Keeps archive manageable, encourages cleanup             |
| Total goals    | 12      | Hard cap for system health                               |

**Rationale**:

- Prevents goal sprawl which leads to abandonment
- Encourages users to complete or delete goals rather than accumulate
- Simplifies UI (no pagination needed for 12 items max)
- Reduces database load per user

**Enforcement Points**:

1. Goal creation API - check active count before creating
2. Archive API - check archived count before archiving
3. Frontend - disable buttons and show limit indicators

**Error Messages**:

- Active limit: "Maximum 6 active goals reached. Archive or delete a goal to create a new one."
- Archive limit: "Maximum 6 archived goals reached. Delete an archived goal first."
- Total limit: "Maximum 12 total goals reached. Delete a goal to continue."

### 4. Bulk Delete Implementation

**Decision**: Permanent deletion with confirmation dialog

**Rationale**:

- Users explicitly requested ability to delete goals
- Confirmation dialog prevents accidental deletion
- No soft-delete or trash - keeps system simple

**Cascade Behavior**:

- Deleting a goal deletes: skill tree, skill nodes, flashcards, review logs
- Database foreign keys handle cascade with ON DELETE CASCADE

### 5. Goal Restoration

**Decision**: Allow restoring archived goals to active status with limit check

**Rationale**:

- Users may want to resume work on previously archived goals
- Restoring is simpler than recreating a goal with all its data
- Limit check ensures system constraints remain enforced

**Constraints**:

- Can only restore when active goals < 6
- Restoring clears `archivedAt` timestamp and sets status to 'active'
- No bulk restore - single goal at a time (simpler UX)

**UI Behavior**:

- "Restore" button appears on archived goal cards
- Button disabled with tooltip when at active goal limit
- No confirmation dialog needed (non-destructive action)

## Dependencies

| Dependency  | Version | Usage                                    |
| ----------- | ------- | ---------------------------------------- |
| zod         | 4.2.1   | Form validation for custom card creation |
| drizzle-orm | 0.45.1  | Database queries and updates             |

## Integration Points

1. **Node Detail View -> Custom Card Form**
   - Add "Add Custom Card" button to node detail view
   - Modal form for card creation

2. **Goals Page -> Multi-Select**
   - Add checkboxes to goal cards
   - Floating action bar for bulk operations

3. **Goal Creation API -> Limit Check**
   - Check limits before creating new goal
   - Return appropriate error if limit exceeded

4. **Archive API -> Limit Check**
   - Check archived count before archiving
   - Return appropriate error if limit exceeded

5. **Restore API -> Limit Check**
   - Check active count before restoring
   - Return appropriate error if limit exceeded
