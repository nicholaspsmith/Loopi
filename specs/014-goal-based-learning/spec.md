# Feature Specification: Memoryloop v2 - Goal-Based Learning Platform

**Feature Branch**: `014-goal-based-learning`
**Created**: 2025-12-27
**Status**: Draft
**Input**: Transform Memoryloop from a chat-based flashcard generator into a goal-based learning platform with AI-generated skill trees and mastery tracking.

## Overview

Memoryloop v2 represents a fundamental pivot from a freeform chat interface to a structured, goal-based learning experience. Users define what they want to learn, the system generates a hierarchical skill tree, and users progress through topics with spaced repetition and mastery tracking.

**Target Users**: Professionals learning new skills (tech, marketing, creative fields)

**Key Differentiator**: Unlike ChatGPT (no study system) or Anki (no AI, poor UX), Memoryloop generates structured learning paths AND helps users retain knowledge through varied study modes and progress visualization.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Learning Goal with Skill Tree (Priority: P1)

A professional wants to learn a new skill. They enter their learning goal, and the system generates a structured skill tree breaking down the topic into learnable chunks.

**Why this priority**: This is the core entry point that replaces the chat interface. Without this, users cannot begin their learning journey.

**Independent Test**: Can be tested by creating a goal "Learn Kubernetes" and verifying a hierarchical tree of topics is generated and displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the home page, **When** they enter "Kubernetes administration" as a learning goal, **Then** the system generates a skill tree with categories (Core Concepts, Networking, Storage, Security) and subtopics under each.
2. **Given** a generated skill tree, **When** the user views it, **Then** they can see the hierarchical structure with checkboxes to select/deselect topics.
3. **Given** a skill tree with topics, **When** the user deselects "Security (Advanced)", **Then** that branch is excluded from their learning path.
4. **Given** a confirmed skill tree, **When** the user saves it, **Then** a new Learning Goal is created and appears in their dashboard.

---

### User Story 2 - Generate Cards for Skill Tree Node (Priority: P1)

A user wants to create study materials for a specific topic in their skill tree. They select a node and generate flashcards or quiz questions scoped to that topic.

**Why this priority**: Card generation is the core content creation mechanism. Without this, users have nothing to study.

**Independent Test**: Can be tested by selecting a skill node "Pods" and generating 10 flashcards, then verifying they appear in the deck.

**Acceptance Scenarios**:

1. **Given** a skill tree with node "Pods" selected, **When** the user clicks "Generate Cards", **Then** the system generates flashcards specific to Kubernetes Pods.
2. **Given** generated cards, **When** the user views them, **Then** they can edit, delete, or approve each card before adding to their deck.
3. **Given** a set of approved cards, **When** the user confirms, **Then** cards are added to the deck and linked to the skill node for mastery tracking.
4. **Given** cards the user finds unsatisfactory (incorrect, unclear, or misaligned with topic), **When** the user types refinement feedback "Make these more practical with real commands", **Then** the system regenerates improved cards.

---

### User Story 3 - Study with Multiple Modes (Priority: P1)

A user wants to study their cards using different formats to reinforce learning. They can choose flashcard mode, multiple choice, timed challenges, or mixed mode.

**Why this priority**: Multiple study modes increase engagement and retention. This differentiates from basic flashcard apps.

**Independent Test**: Can be tested by starting a study session and switching between flashcard, multiple choice, and timed modes.

**Acceptance Scenarios**:

1. **Given** a deck with 20 cards, **When** the user selects "Flashcard Mode", **Then** they see cards one at a time with flip-to-reveal interaction.
2. **Given** a deck with cards, **When** the user selects "Multiple Choice Mode", **Then** each card is presented as a question with 4 answer options.
3. **Given** a study session, **When** the user selects "Timed Challenge", **Then** they have a countdown timer and earn points for speed and accuracy.
4. **Given** any study mode, **When** the user rates their recall, **Then** the FSRS algorithm updates the card's next review date.

---

### User Story 4 - View Mastery Dashboard (Priority: P2)

A user wants to see their learning progress across all goals and topics. They view a dashboard showing mastery levels, upcoming reviews, and time invested.

**Why this priority**: Progress visibility motivates continued learning. Important but not blocking for core study functionality.

**Independent Test**: Can be tested by studying cards for a week and verifying the dashboard shows accurate mastery percentages.

**Acceptance Scenarios**:

1. **Given** a user with an active learning goal, **When** they view the dashboard, **Then** they see their skill tree with mastery percentages per node (0-100%).
2. **Given** cards due for review, **When** the user views the dashboard, **Then** they see "12 cards due today, 24 due this week".
3. **Given** study history, **When** the user views metrics, **Then** they see total time invested and retention rate.
4. **Given** mastery milestones reached, **When** viewing progress, **Then** they see earned titles ("Kubernetes Apprentice") and achievements.

---

### User Story 5 - Earn Achievements and Titles (Priority: P3)

A user wants recognition for their learning milestones. They earn titles and achievements based on mastery, not arbitrary streaks or daily requirements.

**Why this priority**: Gamification increases engagement but is not essential for core learning functionality.

**Independent Test**: Can be tested by mastering 50 cards and verifying an achievement is unlocked.

**Acceptance Scenarios**:

1. **Given** a user who masters their first 10 cards, **When** they check achievements, **Then** they see "First Steps" achievement unlocked.
2. **Given** 50% mastery of a learning goal, **When** viewing their profile, **Then** they see a title upgrade (e.g., "Apprentice" to "Practitioner").
3. **Given** a user who has studied 7 days in any rolling 7-day window, **When** they check achievements, **Then** they see "Week Warrior" achievement (retroactive, not streak-based).
4. **Given** any achievement unlock, **When** it triggers, **Then** a celebratory animation plays (confetti, etc.).

---

### User Story 6 - Track Popular Topics for Curated Trees (Priority: P3)

The system tracks what topics users are learning to prioritize creating curated, domain-specific skill trees mapped to real-world standards.

**Why this priority**: Analytics-driven feature that improves long-term content quality but does not affect individual user experience.

**Independent Test**: Can be tested by having 10 users create "AWS" goals and verifying analytics show AWS as a high-demand topic.

**Acceptance Scenarios**:

1. **Given** multiple users creating learning goals, **When** analyzing patterns, **Then** the system normalizes and counts topic frequency.
2. **Given** a topic with 50+ users, **When** an admin reviews analytics, **Then** they see it flagged for curated tree creation.
3. **Given** a curated tree exists for a topic, **When** a user creates a goal for that topic, **Then** they can choose between AI-generated or curated tree.

---

### Edge Cases

- What happens when the LLM generates a skill tree that is too shallow or too deep? User can request regeneration with "more detail" or "simpler breakdown".
- What happens when card generation produces low-quality content? User can reject and request regeneration with specific feedback.
- What happens when a user has no cards due for review? Dashboard shows "All caught up!" with option to study ahead or generate new content.
- What happens when a user abandons a learning goal? Goals can be paused or archived, with data retained for potential resumption.
- What happens when the same topic is learned by multiple users? Each user gets their own skill tree instance but analytics track aggregate demand.

## Requirements _(mandatory)_

### Functional Requirements

**Goal Management**

- **FR-001**: System MUST allow users to create learning goals by entering a topic description
- **FR-002**: System MUST generate hierarchical skill trees from learning goal descriptions
- **FR-003**: System MUST allow users to select/deselect nodes in their skill tree
- **FR-004**: System MUST support multiple concurrent learning goals per user
- **FR-005**: System MUST allow users to pause, resume, or archive learning goals

**Skill Tree Generation**

- **FR-006**: System MUST generate skill trees with 2-4 levels of depth (Goal, Category, Topic, Subtopic)
- **FR-007**: System MUST allow users to request skill tree regeneration with feedback
- **FR-008**: System MUST support both AI-generated and curated skill trees (curated post-MVP)
- **FR-009**: System MUST track mastery percentage for each skill tree node

**Card Generation**

- **FR-010**: System MUST generate cards scoped to specific skill tree nodes
- **FR-011**: System MUST support multiple card formats (flashcard, multiple choice)
  - _Note: Scenario-based format deferred to post-MVP_
- **FR-012**: System MUST allow users to review, edit, and delete generated cards before committing
- **FR-013**: System MUST support refinement chat scoped to current generation context
- **FR-014**: System MUST link cards to skill tree nodes for mastery calculation

**Study Modes**

- **FR-015**: System MUST provide flashcard study mode with flip-to-reveal interaction
- **FR-016**: System MUST provide multiple choice quiz mode
- **FR-017**: System MUST provide timed challenge mode with scoring
- **FR-018**: System MUST provide mixed mode combining all formats
- **FR-019**: System MUST update spaced repetition scheduling after each study session

**Mastery and Progress**

- **FR-020**: System MUST calculate mastery percentage per skill node based on card performance
- **FR-021**: System MUST display cards due for review with FSRS predictions
- **FR-022**: System MUST track and display time invested per goal
- **FR-023**: System MUST track and display overall retention rate

**Engagement**

- **FR-024**: System MUST award achievements based on mastery milestones (not streaks)
- **FR-025**: System MUST assign titles/ranks based on learning progress
- **FR-026**: System MUST display celebratory animations on milestone achievements
- **FR-027**: System MUST NOT implement streak counters or daily requirements

**Analytics**

- **FR-028**: System MUST track normalized topic frequency across all users
- **FR-029**: System MUST surface high-demand topics for curated tree prioritization

**Deprecation**

- **FR-030**: System MUST remove freeform chat interface (Conversation, Message entities)
- **FR-031**: System MUST merge Quiz page functionality into study modes
- **FR-032**: System MUST replace current home/landing flow with goal-based entry

### Key Entities

- **LearningGoal**: A user's declared learning objective with status (active/paused/completed/archived), containing one skill tree
- **SkillTree**: Hierarchical breakdown of a learning goal, either AI-generated or linked to a curated source
- **SkillNode**: Individual node in a skill tree with title, depth level, parent reference, and calculated mastery score
- **CuratedSkillTree**: Pre-defined skill tree mapped to real-world standards (AWS certs, CompTIA, etc.) - post-MVP
- **Deck**: Collection of cards, now linked to a learning goal and optionally to specific skill nodes
- **Card**: Study content (flashcard or quiz question) linked to a skill node for mastery tracking
- **Achievement**: Earned recognition for reaching mastery milestones
- **UserTitle**: Current rank/title based on overall learning progress
- **TopicAnalytics**: Aggregate tracking of topic popularity across users

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a learning goal and receive a skill tree in under 30 seconds
- **SC-002**: Users can generate 10 cards for a topic in under 60 seconds
- **SC-003**: Users can complete a 20-card study session in under 10 minutes
- **SC-004**: 80% of users who create a learning goal return to study within 7 days
- **SC-005**: Average user retention rate (cards remembered on review) exceeds 85%
- **SC-006**: Users rate card quality as "good" or "excellent" for 70%+ of generated cards
- **SC-007**: Dashboard accurately reflects mastery progress within 1% of calculated values
- **SC-008**: Zero users report feeling "guilted" or "obligated" to study (no punishing mechanics)
- **SC-009**: System tracks topic demand and surfaces top 10 topics monthly for curation review

## Assumptions

- Local Ollama LLM quality can be improved through better prompting to generate acceptable skill trees and cards
- FSRS algorithm (already implemented) will continue to handle spaced repetition scheduling
- Existing authentication and user management will be retained
- LanceDB will continue to be used for vector search (semantic card search)
- PostgreSQL will store relational data (goals, trees, nodes, analytics)

## Out of Scope (Post-MVP)

- Domain-specific curated skill trees (start with AI-generated only)
- Leaderboards or competitive features
- Social features (sharing goals, studying with friends)
- Mobile-native apps (web-responsive only for MVP)
- Importing existing Anki decks
- API key integration for premium LLM quality
