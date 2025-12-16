import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GenerateFlashcardsButton from '@/components/chat/GenerateFlashcardsButton'

/**
 * Component Tests for GenerateFlashcardsButton
 *
 * Tests the flashcard generation button behavior including:
 * - FR-008: "Generate Flashcards" action for assistant messages
 * - FR-017: Duplicate prevention (button state change after generation)
 * - FR-018: Loading feedback during generation
 */

describe('GenerateFlashcardsButton', () => {
  const mockMessageId = '123e4567-e89b-12d3-a456-426614174000'
  const mockConversationId = '789e0123-e89b-12d3-a456-426614174001'

  beforeEach(() => {
    // Reset fetch mock
    global.fetch = vi.fn()
    vi.clearAllMocks()
  })

  it('should render "Generate Flashcards" button initially', () => {
    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    expect(button).toBeInTheDocument()
    expect(button).toBeEnabled()
  })

  it('should show "Flashcards Generated" when hasFlashcards is true (FR-017)', () => {
    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={true}
      />
    )

    const button = screen.getByRole('button', {
      name: /flashcards generated/i,
    })
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('should show loading state during generation (FR-018)', async () => {
    // Mock slow API response
    ;(global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 201,
                json: async () => ({
                  success: true,
                  flashcards: [],
                  count: 0,
                  sourceMessage: { id: mockMessageId, hasFlashcards: true },
                }),
              }),
            100
          )
        )
    )

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    // Check for loading state
    await waitFor(() => {
      const loadingButton = screen.getByRole('button', {
        name: /generating/i,
      })
      expect(loadingButton).toBeInTheDocument()
      expect(loadingButton).toBeDisabled()
    })
  })

  it('should call API and update state on successful generation', async () => {
    const mockFlashcards = [
      {
        id: 'fc1',
        question: 'What is quantum entanglement?',
        answer: 'A phenomenon where particles remain connected',
        userId: 'user1',
        conversationId: mockConversationId,
        messageId: mockMessageId,
        questionEmbedding: null,
        createdAt: Date.now(),
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          state: 0,
        },
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        flashcards: mockFlashcards,
        count: 1,
        sourceMessage: { id: mockMessageId, hasFlashcards: true },
      }),
    })

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flashcards/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: mockMessageId }),
        })
      )
    })

    // Button should show "Flashcards Generated" after success
    await waitFor(() => {
      const generatedButton = screen.getByRole('button', {
        name: /flashcards generated/i,
      })
      expect(generatedButton).toBeInTheDocument()
      expect(generatedButton).toBeDisabled()
    })
  })

  it('should show success message with count (FR-018)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        flashcards: [{}, {}, {}], // 3 flashcards
        count: 3,
        sourceMessage: { id: mockMessageId, hasFlashcards: true },
      }),
    })

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/3 flashcards generated/i)).toBeInTheDocument()
    })
  })

  it('should handle duplicate generation error (FR-017)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Flashcards have already been generated from this message',
        code: 'FLASHCARDS_ALREADY_EXIST',
        existingFlashcardIds: ['fc1', 'fc2'],
      }),
    })

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/flashcards have already been generated/i)
      ).toBeInTheDocument()
    })
  })

  it('should handle insufficient content error (FR-019)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Insufficient educational content for flashcard generation',
        code: 'INSUFFICIENT_CONTENT',
      }),
    })

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/insufficient educational content/i)
      ).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/failed to generate flashcards/i)
      ).toBeInTheDocument()
    })

    // Button should be re-enabled to allow retry
    const retryButton = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    expect(retryButton).toBeEnabled()
  })

  it('should not allow clicking while generation is in progress', async () => {
    ;(global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 201,
                json: async () => ({
                  success: true,
                  flashcards: [],
                  count: 0,
                }),
              }),
            500
          )
        )
    )

    render(
      <GenerateFlashcardsButton
        messageId={mockMessageId}
        conversationId={mockConversationId}
        hasFlashcards={false}
      />
    )

    const button = screen.getByRole('button', {
      name: /generate flashcards/i,
    })

    fireEvent.click(button)

    // Try clicking again immediately
    fireEvent.click(button)

    // Should only call fetch once
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
