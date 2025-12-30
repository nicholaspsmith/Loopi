# Implementation Plan: Background Flashcard Generation

**Branch**: `018-background-flashcard-generation` | **Spec**: [spec.md](./spec.md)

## Summary

Convert LLM-dependent generation operations (flashcard, distractor, skill tree) from blocking synchronous calls to background jobs. Users see loading placeholders during generation and receive automatic UI updates on completion.

## Key Decisions

- **Job Processing**: Inline with database state (no external workers)
- **Polling**: 3-second interval with adaptive backoff
- **Rate Limiting**: 20 jobs/hour/user/type (sliding window)
- **Stale Detection**: 5-minute timeout resets stuck jobs
- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)

## New Files

```
lib/jobs/
├── processor.ts          # Job executor with state machine
├── types.ts              # Job payload/result types
└── handlers/
    ├── flashcard-job.ts  # Wraps generateFlashcardsFromContent()
    ├── distractor-job.ts # Wraps generateDistractors()
    └── skill-tree-job.ts # Wraps generateSkillTree()

lib/db/operations/background-jobs.ts  # Job CRUD + rate limiting

app/api/jobs/
├── route.ts              # POST (create), GET (list)
└── [jobId]/route.ts      # GET (status), POST (retry)

hooks/useJobStatus.ts                  # Polling hook
components/ui/GenerationPlaceholder.tsx # Loading/error states
```

## Modified Files

- `app/api/flashcards/generate/route.ts` - Queue job instead of sync call
- `app/api/study/distractors/route.ts` - Queue job for async generation
- `app/api/goals/[goalId]/skill-tree/route.ts` - Queue job for tree generation

## Implementation Reference

See [quickstart.md](./quickstart.md) for detailed code examples when implementing.
