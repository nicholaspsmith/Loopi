# UI Text Replacements for AI Branding Removal (T024)

Make these EXACT text replacements in the following files:

## File 1: /Users/nick/Code/memoryloop/app/(protected)/goals/new/page.tsx

1. Line 12 (comment): `* - Option to generate AI skill tree` → `* - Option to generate skill tree automatically`
2. Line 34: `What do you want to master? AI will help break it down into manageable topics.` → `What do you want to master? We'll help break it down into manageable topics.`

## File 2: /Users/nick/Code/memoryloop/app/(protected)/decks/new/page.tsx

1. Line 123: `conversation with Claude to generate flashcards` → `conversation to generate flashcards`

## File 3: /Users/nick/Code/memoryloop/app/layout.tsx

1. Line 10: `Claude-powered flashcard learning platform with spaced repetition` → `Flashcard learning platform with spaced repetition`

## File 4: /Users/nick/Code/memoryloop/app/(protected)/settings/page.tsx

1. Line 14: `AI Provider` → `Service Status`
2. Line 31: `Claude AI Active` → `Service Active`
3. Line 35: `Your AI-powered features are using Claude for skill tree generation, card creation, and` → `Skill tree generation, card creation, and study assistance are ready to use.`

## File 5: /Users/nick/Code/memoryloop/app/(protected)/goals/page.tsx

1. Line 133: `Create a learning goal and let AI generate a personalized skill tree` → `Create a learning goal to generate a personalized skill tree`

## File 6: /Users/nick/Code/memoryloop/components/goals/GoalForm.tsx

1. Line 139: `Generate skill tree with AI` → `Generate skill tree automatically`
2. Line 142: `AI will break down your learning goal` → `Your learning goal will be broken down`

## File 7: /Users/nick/Code/memoryloop/components/decks/AddCardsToDeck.tsx

1. Line 233: `Create flashcards by chatting with Claude` → `Create flashcards by starting a conversation`

## File 8: /Users/nick/Code/memoryloop/components/chat/Message.tsx

1. Line 32: `Message from ${isUser ? 'You' : 'Claude'}` → `Message from ${isUser ? 'You' : 'Assistant'}`
2. Line 43: `{isUser ? 'You' : 'Claude'}` → `{isUser ? 'You' : 'Assistant'}`

## File 9: /Users/nick/Code/memoryloop/components/chat/MessageList.tsx

1. Line 78: `aria-label="Claude is thinking"` → `aria-label="Assistant is thinking"`
2. Line 80: `>Claude<` → `>Assistant<`

## File 10: /Users/nick/Code/memoryloop/components/chat/GenerateFlashcardsButton.tsx

1. Line 68: `Can only generate flashcards from Claude responses` → `Can only generate flashcards from assistant responses`

## File 11: /Users/nick/Code/memoryloop/components/decks/DeckActions.tsx

1. Line 33: `aria-label="Generate deck with AI"` → `aria-label="Generate deck automatically"`
2. Line 44: `AI Generate` → `Auto Generate`

## File 12: /Users/nick/Code/memoryloop/components/decks/AIGenerationDialog.tsx

1. Line 193: `AI Deck Generation` → `Smart Deck Generation`
2. Line 259: `AI is ranking cards by relevance` → `Ranking cards by relevance`

## File 13: /Users/nick/Code/memoryloop/components/chat/ChatInterface.tsx

1. Line 12 (comment): `streaming responses from Claude` → `streaming responses from the assistant`

## File 14: /Users/nick/Code/memoryloop/components/skills/SkillTreeEditor.tsx

1. Line 179: `with a new AI-generated one` → `with a new automatically generated one`
2. Line 184: `Feedback for AI (optional)` → `Feedback (optional)`

## After completion

Run this grep to verify no user-visible AI/Claude terms remain:

```bash
grep -rn "AI\|Claude\|Anthropic\|Ollama\|LLM" app/ components/ --include="*.tsx" | grep -v "// "
```
