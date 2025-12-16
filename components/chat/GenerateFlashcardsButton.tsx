'use client'

import { useState } from 'react'

/**
 * GenerateFlashcardsButton Component
 *
 * Button to generate flashcards from Claude (assistant) messages
 *
 * Maps to:
 * - FR-008: "Generate Flashcards" action for assistant messages
 * - FR-017: Duplicate prevention (disabled when already generated)
 * - FR-018: Loading feedback during generation
 */

interface GenerateFlashcardsButtonProps {
  messageId: string
  conversationId: string
  hasFlashcards: boolean
  onGenerated?: (count: number) => void
}

export default function GenerateFlashcardsButton({
  messageId,
  conversationId,
  hasFlashcards: initialHasFlashcards,
  onGenerated,
}: GenerateFlashcardsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasFlashcards, setHasFlashcards] = useState(initialHasFlashcards)
  const [message, setMessage] = useState<string>('')
  const [flashcardCount, setFlashcardCount] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (isGenerating || hasFlashcards) return

    setIsGenerating(true)
    setMessage('')

    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      })

      const data = await response.json()

      if (response.ok) {
        // Success (FR-018)
        const count = data.count || 0
        setHasFlashcards(true)
        setFlashcardCount(count)
        setMessage(`${count} flashcard${count === 1 ? '' : 's'} generated!`)
        onGenerated?.(count)
      } else {
        // Error handling
        if (data.code === 'FLASHCARDS_ALREADY_EXIST') {
          // FR-017: Duplicate prevention
          setHasFlashcards(true)
          setMessage('Flashcards have already been generated from this message')
        } else if (data.code === 'INSUFFICIENT_CONTENT') {
          // FR-019: Insufficient content
          setMessage('Insufficient educational content for flashcard generation')
        } else if (data.code === 'INVALID_MESSAGE_ROLE') {
          setMessage('Can only generate flashcards from Claude responses')
        } else {
          setMessage(data.error || 'Failed to generate flashcards')
        }
      }
    } catch (error) {
      console.error('Error generating flashcards:', error)
      setMessage('Failed to generate flashcards. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <button
        onClick={handleGenerate}
        disabled={isGenerating || hasFlashcards}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          hasFlashcards
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : isGenerating
              ? 'bg-gray-100 text-gray-500 cursor-wait'
              : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isGenerating
          ? 'Generating flashcards...'
          : hasFlashcards
            ? '✓ Flashcards Generated'
            : '📝 Generate Flashcards'}
      </button>

      {message && (
        <p
          className={`text-sm ${
            flashcardCount !== null
              ? 'text-green-600'
              : 'text-amber-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
