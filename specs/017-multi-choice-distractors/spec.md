# Feature Specification: Multi-Choice Study Mode with AI-Generated Distractors

**Feature Branch**: `017-multi-choice-distractors`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "We need to fully implement multi choice study type. When a user studies flashcards in multiple choice mode, they should be shown 4 options. 3 of which are plausible-sounding but incorrect options. And the other 1 being the correct answer. Whether the user correctly chooses the right answer or chooses one of the incorrect answers should be taken into account using the fsrs algorithm."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Study Flashcards in Multiple Choice Mode (Priority: P1)

A user wants to study their flashcards using multiple choice format instead of traditional flip-and-reveal. When studying, they see the flashcard question along with 4 answer options - one correct answer and three plausible-sounding but incorrect alternatives (distractors). The user selects an option and receives immediate feedback on whether they were correct. Their performance (correct/incorrect) updates the flashcard's spaced repetition schedule.

**Why this priority**: This is the core feature - without multiple choice presentation with quality distractors, the feature has no value. Users need engaging, quiz-like study sessions that challenge their recall.

**Independent Test**: Can be tested by starting a study session in multiple choice mode, answering questions, and verifying that FSRS scheduling is updated based on correct/incorrect answers.

**Acceptance Scenarios**:

1. **Given** a user has flashcards due for review, **When** they start a study session in multiple choice mode, **Then** they see the flashcard question with 4 shuffled answer options displayed.

2. **Given** a multiple choice question is displayed, **When** the user selects the correct answer quickly, **Then** they see positive feedback and the flashcard is scheduled as "Good" (rating 3) in the spaced repetition system.

3. **Given** a multiple choice question is displayed, **When** the user selects the correct answer slowly, **Then** they see positive feedback and the flashcard is scheduled as "Hard" (rating 2) in the spaced repetition system.

4. **Given** a multiple choice question is displayed, **When** the user selects an incorrect answer, **Then** they see the correct answer highlighted and the flashcard is scheduled as "Again" (rating 1) in the spaced repetition system.

5. **Given** a flashcard with a correct answer, **When** distractors are generated, **Then** all three distractors are plausible-sounding alternatives that are clearly incorrect but related to the topic.

---

### User Story 2 - Distractor Quality and Variety (Priority: P1)

The system generates high-quality distractors that make the multiple choice format educationally valuable. Distractors should be contextually relevant, plausible enough to require genuine knowledge to distinguish, but clearly incorrect to someone who knows the material.

**Why this priority**: Poor-quality distractors (obviously wrong, unrelated, or absurd) would make multiple choice trivially easy and defeat the purpose of the study mode. Quality distractors are essential for effective learning.

**Independent Test**: Can be tested by generating distractors for various flashcard topics and evaluating their plausibility and educational value.

**Acceptance Scenarios**:

1. **Given** a flashcard about a technical concept, **When** distractors are generated, **Then** they are semantically related to the topic but factually incorrect.

2. **Given** a flashcard with a numerical or specific factual answer, **When** distractors are generated, **Then** they include similar but incorrect values or facts.

3. **Given** the same flashcard studied multiple times, **When** distractors are generated for each session, **Then** the distractors vary between sessions to prevent memorization of option positions.

---

### User Story 3 - Graceful Fallback When Distractors Cannot Be Generated (Priority: P2)

When the system cannot generate quality distractors (e.g., AI service unavailable, very short or ambiguous answers), the flashcard should still be studiable through an alternative presentation.

**Why this priority**: Users should not be blocked from studying if distractor generation fails. A fallback ensures continuous study availability.

**Independent Test**: Can be tested by simulating distractor generation failures and verifying fallback behavior.

**Acceptance Scenarios**:

1. **Given** distractor generation fails for a flashcard, **When** the flashcard is presented, **Then** it falls back to standard flip-reveal format with clear indication.

2. **Given** a flashcard with an extremely short answer (e.g., "Yes", "42"), **When** attempting multiple choice mode, **Then** the system either generates creative distractors or gracefully falls back to flip-reveal.

---

### Edge Cases

- What happens when a flashcard answer is very long (multiple sentences)? System truncates display but uses full answer for correctness.
- How does the system handle flashcards with code snippets as answers? Code is displayed in monospace formatting within options.
- What happens if all generated distractors are too similar to the correct answer? System regenerates or falls back to flip-reveal.
- How are distractors handled for yes/no or true/false type answers? System generates contextual variations (e.g., "Yes, because X" vs "No, because Y").
- What happens when a user runs out of time before selecting (in timed mode)? Treated as incorrect answer with "Again" FSRS rating.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display exactly 4 answer options for each multiple choice question (1 correct, 3 distractors).
- **FR-002**: System MUST shuffle the position of the correct answer randomly among the 4 options.
- **FR-003**: System MUST generate 3 plausible-sounding but incorrect distractors for each flashcard's correct answer.
- **FR-004**: Distractors MUST be contextually relevant to the flashcard's topic/subject matter.
- **FR-005**: System MUST provide immediate feedback after answer selection showing whether correct or incorrect.
- **FR-006**: System MUST highlight the correct answer after any selection (correct or incorrect).
- **FR-007**: Correct answers MUST update the flashcard's FSRS schedule based on response time: "Hard" (rating 2) for slow responses, "Good" (rating 3) for fast responses.
- **FR-008**: Incorrect answers MUST update the flashcard's FSRS schedule as "Again" (rating 1).
- **FR-013**: System MUST track response time from question display to answer selection for FSRS rating determination.
- **FR-009**: System MUST generate distractors on-demand at study time (no persistent caching) while maintaining responsive sessions.
- **FR-010**: System MUST vary distractors across study sessions through AI generation randomness to prevent answer position memorization.
- **FR-011**: System MUST fall back to flip-reveal mode if distractor generation fails.
- **FR-012**: System MUST handle flashcards with short answers (single words, numbers) appropriately.

### Key Entities

- **Flashcard**: Existing entity with question and answer; no schema changes needed.
- **Distractor**: A plausible but incorrect answer option generated on-demand (not persisted).
- **StudySession**: Tracks mode (multiple-choice vs flip-reveal) and user responses.
- **FSRS Schedule**: Existing spaced repetition scheduling updated based on correct/incorrect responses.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Multiple choice questions display within 2 seconds of the previous question being answered (including distractor generation).
- **SC-002**: At least 90% of generated distractors are contextually relevant and plausible (not obviously wrong or unrelated).
- **SC-003**: Users complete a 20-card multiple choice session in under 10 minutes.
- **SC-004**: FSRS scheduling correctly distinguishes between incorrect, slow-correct, and fast-correct answers (verified through review intervals reflecting Again/Hard/Good ratings).
- **SC-005**: Fallback to flip-reveal occurs in under 1 second when distractor generation fails.
- **SC-006**: Distractor variety across sessions - same flashcard shows different distractor sets at least 80% of the time when studied within 7 days.

## Clarifications

### Session 2025-12-29

- Q: What is the distractor storage strategy? → A: Generate fresh each session (no persistence, rely on AI randomness for variety)
- Q: What FSRS rating granularity for correct/incorrect answers? → A: Incorrect = "Again" (1), slow correct = "Hard" (2), fast correct = "Good" (3)

## Assumptions

- The existing Multiple Choice Mode UI component (MultipleChoiceMode.tsx) exists but may need enhancement for distractor display.
- The AI service used for distractor generation is the same Claude API used elsewhere in the application.
- Distractors are generated fresh each session (no database persistence required).
- The existing FSRS implementation supports the rating scale needed (Again=1, Hard=2, Good=3).
- Users have already created flashcards before using multiple choice mode.
