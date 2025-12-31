import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
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
 * - Background job polling flow
 */

describe('GenerateFlashcardsButton', () => {
  const mockMessageId = '123e4567-e89b-12d3-a456-426614174000'
  const mockConversationId = '789e0123-e89b-12d3-a456-426614174001'
  const mockJobId = 'job-123'

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
    // Mock job creation (202)
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        job: {
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        message: 'Flashcard generation started...',
      }),
    })

    // Mock job status polling (pending state)
    ;(global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: mockJobId,
        type: 'flashcard_generation',
        status: 'pending',
        createdAt: new Date().toISOString(),
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

    // Wait for job creation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flashcards/generate',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    // Check for loading state (GenerationPlaceholder should be shown)
    await waitFor(
      () => {
        expect(screen.getByText(/preparing to generate flashcards/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('should call API and update state on successful generation', async () => {
    // Mock job creation (202)
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        job: {
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        message: 'Flashcard generation started...',
      }),
    })

    // Mock job status polling - first processing, then completed
    ;(global.fetch as unknown as Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'processing',
          createdAt: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'completed',
          result: {
            count: 1,
            flashcardIds: ['fc-1'],
          },
          createdAt: new Date().toISOString(),
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

    // Verify API call
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

    // Wait for processing state
    await waitFor(
      () => {
        expect(screen.getByText(/generating flashcards/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Button should show "Flashcards Generated" after success
    await waitFor(
      () => {
        const generatedButton = screen.getByRole('button', {
          name: /flashcards generated/i,
        })
        expect(generatedButton).toBeInTheDocument()
        expect(generatedButton).toBeDisabled()
      },
      { timeout: 5000 }
    )
  })

  it('should show success message with count (FR-018)', async () => {
    // Mock job creation (202)
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        job: {
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        message: 'Flashcard generation started...',
      }),
    })

    // Mock job status polling - completed with 3 flashcards
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: mockJobId,
        type: 'flashcard_generation',
        status: 'completed',
        result: {
          count: 3,
          flashcardIds: ['fc-1', 'fc-2', 'fc-3'],
        },
        createdAt: new Date().toISOString(),
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

    // Wait for job creation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Wait for success message
    await waitFor(
      () => {
        expect(screen.getByText(/3 flashcards generated/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('should handle duplicate generation error (FR-017)', async () => {
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
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
      expect(screen.getByText(/flashcards have already been generated/i)).toBeInTheDocument()
    })
  })

  it('should handle insufficient content error (FR-019)', async () => {
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
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
      expect(screen.getByText(/insufficient educational content/i)).toBeInTheDocument()
    })
  })

  it('should handle network errors gracefully', async () => {
    ;(global.fetch as unknown as Mock).mockRejectedValueOnce(new Error('Network error'))

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
      expect(screen.getByText(/failed to generate flashcards/i)).toBeInTheDocument()
    })

    // Button should be re-enabled to allow retry
    const retryButton = screen.getByRole('button', {
      name: /generate flashcards/i,
    })
    expect(retryButton).toBeEnabled()
  })

  it('should not allow clicking while generation is in progress', async () => {
    // Mock job creation (202)
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        job: {
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        message: 'Flashcard generation started...',
      }),
    })

    // Mock job status polling (stays pending)
    ;(global.fetch as unknown as Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: mockJobId,
        type: 'flashcard_generation',
        status: 'pending',
        createdAt: new Date().toISOString(),
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

    // Wait for polling to start
    await waitFor(
      () => {
        expect(screen.getByText(/preparing to generate flashcards/i)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Try clicking again immediately - should not work since isPolling=true
    fireEvent.click(button)

    // Should only call the generate endpoint once (polling calls are to different endpoint)
    await waitFor(() => {
      const generateCalls = (global.fetch as unknown as Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === '/api/flashcards/generate'
      )
      expect(generateCalls.length).toBe(1)
    })
  })

  it('should handle job failure', async () => {
    // Mock job creation (202)
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        success: true,
        job: {
          id: mockJobId,
          type: 'flashcard_generation',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        message: 'Flashcard generation started...',
      }),
    })

    // Mock job status polling - failed with error
    ;(global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: mockJobId,
        type: 'flashcard_generation',
        status: 'failed',
        error: 'AI service unavailable',
        createdAt: new Date().toISOString(),
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

    // Wait for job creation
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flashcards/generate',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    // Wait for job status to be polled
    await waitFor(
      () => {
        const jobStatusCalls = (global.fetch as unknown as Mock).mock.calls.filter(
          (call: unknown[]) => call[0] === `/api/jobs/${mockJobId}`
        )
        expect(jobStatusCalls.length).toBeGreaterThan(0)
      },
      { timeout: 5000 }
    )

    // After failure, button should return to enabled state (allow retry)
    await waitFor(
      () => {
        const retryButton = screen.getByRole('button', {
          name: /generate flashcards/i,
        })
        expect(retryButton).toBeEnabled()
      },
      { timeout: 5000 }
    )
  })
})
