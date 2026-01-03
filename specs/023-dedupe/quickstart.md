# Quickstart: Duplicate Detection

**Feature**: 023-dedupe
**Date**: 2026-01-03

## Overview

This guide covers testing and validating the duplicate detection feature.

---

## Prerequisites

1. Running PostgreSQL database with existing flashcards/goals
2. LanceDB initialized with flashcard embeddings
3. Valid Jina API key in environment (`JINA_API_KEY`)
4. User account with existing content for testing

---

## Scenario 1: Flashcard Duplicate Warning

**Goal**: Verify that creating a similar flashcard triggers a warning.

### Setup

```bash
# Ensure you have at least one flashcard in the system
# Example: "What is photosynthesis? → The process by which plants convert sunlight to energy"
```

### Test Steps

1. **Navigate to flashcard creation**
   - Log in to the application
   - Go to a goal's flashcard section
   - Click "Add Flashcard" or similar

2. **Enter a similar question**

   ```
   Question: "Define photosynthesis"
   Answer: "Plants converting light into chemical energy"
   ```

3. **Submit the form**
   - Click "Create" or "Save"

4. **Verify warning appears**
   - A modal should appear showing:
     - "Similar flashcard found" message
     - The existing card: "What is photosynthesis?"
     - Similarity score (e.g., "92% similar")
     - "Create Anyway" and "Cancel" buttons

5. **Test override**
   - Click "Create Anyway"
   - Verify the new flashcard is created

6. **Test cancel**
   - Repeat steps 2-4
   - Click "Cancel"
   - Verify no new flashcard is created
   - Verify form is still showing with entered data

### Expected Results

- ✅ Warning modal appears for similar content
- ✅ "Create Anyway" creates the card
- ✅ "Cancel" returns to form without creating
- ✅ Similarity score is displayed as percentage

---

## Scenario 2: Goal Duplicate Warning

**Goal**: Verify that creating a similar goal triggers a warning.

### Setup

```bash
# Ensure you have at least one goal in the system
# Example: "Learn Python programming"
```

### Test Steps

1. **Navigate to goal creation**
   - Log in to the application
   - Go to Goals page
   - Click "New Goal" or similar

2. **Enter a similar goal**

   ```
   Title: "Master Python development"
   Description: "Become proficient in Python programming language"
   ```

3. **Submit the form**

4. **Verify warning appears**
   - Modal shows existing goal: "Learn Python programming"
   - Similarity score displayed

5. **Test override and cancel** (same as Scenario 1)

### Expected Results

- ✅ Warning for similar goals
- ✅ Both title and description considered for similarity

---

## Scenario 3: AI Batch Deduplication

**Goal**: Verify AI-generated cards are automatically deduplicated.

### Setup

```bash
# Ensure you have existing flashcards on a topic
# Example: Goal "Learn Machine Learning" with cards about basic concepts
```

### Test Steps

1. **Trigger AI card generation**
   - Go to a goal with existing cards
   - Click "Generate More Cards" or trigger skill tree generation

2. **Wait for generation to complete**

3. **Verify dedup summary**
   - Response should show: "X cards created, Y duplicates filtered"
   - Only unique cards are saved

4. **Verify no duplicates in collection**
   - Check the card list
   - Confirm no near-identical questions exist

### Expected Results

- ✅ AI-generated duplicates are filtered
- ✅ Summary shows filtered count
- ✅ Only unique cards appear in collection

---

## Scenario 4: Short Content Bypass

**Goal**: Verify that very short content bypasses duplicate check.

### Test Steps

1. **Create a very short flashcard**

   ```
   Question: "Yes?"
   Answer: "No"
   ```

2. **Submit the form**

3. **Verify no duplicate check**
   - Card should be created without warning
   - No delay from embedding generation

### Expected Results

- ✅ Content < 10 characters bypasses dedup
- ✅ No warning modal appears
- ✅ Creation is fast (no embedding API call)

---

## Scenario 5: Service Failure Graceful Degradation

**Goal**: Verify that embedding service failures don't block creation.

### Test Steps (requires simulating failure)

1. **Temporarily break Jina API**
   - Set invalid `JINA_API_KEY` or mock failure

2. **Attempt to create flashcard**

3. **Verify graceful degradation**
   - Card is created without duplicate check
   - Warning message shown: "Duplicate check skipped"

4. **Restore Jina API**

### Expected Results

- ✅ Creation proceeds despite service failure
- ✅ User is informed that check was skipped
- ✅ No error thrown to user

---

## Verification Checklist

### Flashcard Deduplication

- [ ] Warning appears for similar questions (≥85% similarity)
- [ ] No warning for distinct questions (<85% similarity)
- [ ] "Create Anyway" creates the card
- [ ] "Cancel" aborts creation
- [ ] Similarity score displayed as percentage
- [ ] Short content (<10 chars) bypasses check

### Goal Deduplication

- [ ] Warning appears for similar goals
- [ ] Title + description both considered
- [ ] Override and cancel work correctly

### AI Batch Deduplication

- [ ] Duplicates within batch are filtered
- [ ] Duplicates against existing cards filtered
- [ ] Filter summary displayed to user

### Error Handling

- [ ] Service failure → creation proceeds with warning
- [ ] Timeout → creation proceeds with warning
- [ ] User isolation → only own content compared

---

## Common Issues

### No warning appears for similar content

1. Check that existing content has embeddings in LanceDB
2. Verify `JINA_API_KEY` is set correctly
3. Check similarity threshold (default 85%)

### Warning appears for unrelated content

1. Similarity threshold may be too low
2. Check if content is genuinely unrelated (NLP can find unexpected similarities)

### Slow duplicate check

1. Verify LanceDB is properly indexed
2. Check Jina API latency
3. Ensure user has reasonable number of cards (<1000)
