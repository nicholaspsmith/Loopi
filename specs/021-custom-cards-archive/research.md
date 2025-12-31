# Research: Custom Cards & Archive Settings

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

### 2. Bulk Archive Implementation

**Decision**: New settings page with multi-select table and confirmation modal

**Rationale**:

- Settings is the appropriate location for goal management
- Multi-select allows efficient bulk operations
- Confirmation prevents accidental archiving
- Matches existing UI patterns in the app

**Components**:

- Goal list with checkboxes
- "Select All" / "Deselect All" controls
- Archive button (enabled when ≥1 selected)
- Confirmation modal with goal count

**Validation**:

- At least 1 goal selected
- User must confirm action
- Goals must be owned by user
- Goals must not already be archived

## Dependencies

| Dependency  | Version | Usage                                    |
| ----------- | ------- | ---------------------------------------- |
| zod         | 4.2.1   | Form validation for custom card creation |
| drizzle-orm | 0.45.1  | Database queries and updates             |

## Integration Points

1. **Node Detail View → Custom Card Form**
   - Add "Add Custom Card" button to node detail view
   - Modal or expandable form for card creation

2. **Settings Page → Goal Management**
   - New route: `app/(protected)/settings/goals/page.tsx`
   - List of user's active goals with selection checkboxes

3. **Goal Page → Remove Archive Button**
   - Remove archive button from goal detail page
   - Users directed to settings for archive functionality
