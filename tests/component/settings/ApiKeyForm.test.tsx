import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeyForm from '@/components/settings/ApiKeyForm'

/**
 * Component Tests for ApiKeyForm Component
 *
 * Tests API key input form functionality, validation, and save/delete operations.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('ApiKeyForm Component', () => {
  describe('Basic rendering', () => {
    it('should render API key input field', () => {
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument()
    })

    it('should render save button', () => {
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    it('should show masked key preview when existingKeyPreview is provided', () => {
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} existingKeyPreview="sk-ant-...abc123" />)

      expect(screen.getByText(/sk-ant-\.\.\.abc123/)).toBeInTheDocument()
    })

    it('should render delete button when existingKeyPreview is provided', () => {
      const mockOnSave = vi.fn()
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyForm
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          existingKeyPreview="sk-ant-...abc123"
        />
      )

      expect(screen.getByRole('button', { name: /delete|remove/i })).toBeInTheDocument()
    })
  })

  describe('Input validation', () => {
    it('should disable save button when input is empty', () => {
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('should enable save button when valid API key is entered', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'sk-ant-api03-valid-key-long-enough-for-validation-1234567890')

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeEnabled()
    })

    it('should show error for invalid API key format', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      // Use a long key that doesn't start with sk-ant- to trigger the prefix error
      await user.type(input, 'invalid-key-that-is-long-enough-to-pass-length-check-xxxxxxxxxxxxxxxxxxxx')
      await user.tab() // Trigger blur event

      expect(await screen.findByText(/must start with "sk-ant-"/i)).toBeInTheDocument()
    })

    it('should show error for API key that is too short', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'sk-ant-short')
      await user.tab()

      expect(await screen.findByText(/too short/i)).toBeInTheDocument()
    })
  })

  describe('Saving API key', () => {
    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      const testKey = 'sk-ant-api03-test-key-long-enough-for-validation-1234567890abcdef'
      await user.type(input, testKey)

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(mockOnSave).toHaveBeenCalledWith(testKey)
      expect(mockOnSave).toHaveBeenCalledTimes(1)
    })

    it('should clear input after successful save', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn().mockResolvedValue(undefined)
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i) as HTMLInputElement
      await user.type(input, 'sk-ant-api03-test-key-long-enough-for-validation-1234567890')
      await user.click(screen.getByRole('button', { name: /save/i }))

      // Wait for form to clear
      await vi.waitFor(() => {
        expect(input.value).toBe('')
      })
    })

    it('should show loading state while saving', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'sk-ant-api03-test-key-long-enough-for-validation-1234567890')
      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(screen.getByText(/saving/i)).toBeInTheDocument()
    })

    it('should show success message after save', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn().mockResolvedValue(undefined)
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'sk-ant-api03-test-key-long-enough-for-validation-1234567890')
      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(await screen.findByText(/saved successfully/i)).toBeInTheDocument()
    })

    it('should show error message if save fails', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'))
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'sk-ant-api03-test-key-long-enough-for-validation-1234567890')
      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(await screen.findByText(/failed/i)).toBeInTheDocument()
    })
  })

  describe('Deleting API key', () => {
    it('should show confirmation dialog before delete', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyForm
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          existingKeyPreview="sk-ant-...abc123"
        />
      )

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })

    it('should call onDelete when deletion is confirmed', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyForm
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          existingKeyPreview="sk-ant-...abc123"
        />
      )

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it('should not call onDelete when deletion is cancelled', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyForm
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          existingKeyPreview="sk-ant-...abc123"
        />
      )

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel|no/i })
      await user.click(cancelButton)

      expect(mockOnDelete).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      expect(input).toHaveAccessibleName()
    })

    it('should associate error messages with input', async () => {
      const user = userEvent.setup()
      const mockOnSave = vi.fn()
      render(<ApiKeyForm onSave={mockOnSave} />)

      const input = screen.getByLabelText(/API Key/i)
      await user.type(input, 'invalid')
      await user.tab()

      expect(input).toHaveAccessibleDescription()
    })
  })
})
