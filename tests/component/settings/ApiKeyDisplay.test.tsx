import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiKeyDisplay from '@/components/settings/ApiKeyDisplay'

/**
 * Component Tests for ApiKeyDisplay Component
 *
 * Tests display of existing API key with masked preview and delete functionality.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('ApiKeyDisplay Component', () => {
  describe('Basic rendering', () => {
    it('should display masked API key preview', () => {
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      expect(screen.getByText(/sk-ant-\.\.\.\w+/)).toBeInTheDocument()
    })

    it('should render delete button', () => {
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      expect(screen.getByRole('button', { name: /delete|remove/i })).toBeInTheDocument()
    })

    it('should show last validated timestamp when provided', () => {
      const mockOnDelete = vi.fn()
      const lastValidated = new Date('2025-01-15T10:30:00Z').toISOString()

      render(
        <ApiKeyDisplay
          keyPreview="sk-ant-...abc123"
          onDelete={mockOnDelete}
          lastValidatedAt={lastValidated}
        />
      )

      expect(screen.getByText(/last validated/i)).toBeInTheDocument()
    })

    it('should show validation status indicator', () => {
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyDisplay
          keyPreview="sk-ant-...abc123"
          onDelete={mockOnDelete}
          isValid={true}
        />
      )

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show warning when API key is invalid', () => {
      const mockOnDelete = vi.fn()
      render(
        <ApiKeyDisplay
          keyPreview="sk-ant-...abc123"
          onDelete={mockOnDelete}
          isValid={false}
        />
      )

      expect(screen.getAllByText(/invalid|expired/i)[0]).toBeInTheDocument()
    })
  })

  describe('Delete functionality', () => {
    it('should show confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      expect(screen.getByText(/confirm|sure/i)).toBeInTheDocument()
    })

    it('should call onDelete when confirmed', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    it('should not call onDelete when cancelled', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const cancelButton = screen.getByRole('button', { name: /cancel|no/i })
      await user.click(cancelButton)

      expect(mockOnDelete).not.toHaveBeenCalled()
    })

    it('should show loading state while deleting', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      expect(screen.getByText(/deleting/i)).toBeInTheDocument()
    })

    it('should show success message after delete', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn().mockResolvedValue(undefined)
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      expect(await screen.findByText(/deleted successfully/i)).toBeInTheDocument()
    })

    it('should show error message if delete fails', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn().mockRejectedValue(new Error('Delete failed'))
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      expect(await screen.findByText(/failed/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for delete button', () => {
      const mockOnDelete = vi.fn()
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      expect(deleteButton).toHaveAccessibleName()
    })

    it('should announce status changes to screen readers', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn().mockResolvedValue(undefined)
      render(<ApiKeyDisplay keyPreview="sk-ant-...abc123" onDelete={mockOnDelete} />)

      const deleteButton = screen.getByRole('button', { name: /delete|remove/i })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm|yes/i })
      await user.click(confirmButton)

      const successMessage = await screen.findByText(/deleted successfully/i)
      expect(successMessage).toBeInTheDocument()
    })
  })
})
