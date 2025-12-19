import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupForm from '@/components/auth/SignupForm'

/**
 * Component Test for SignupForm
 *
 * Tests the SignupForm component behavior.
 */

describe('SignupForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email, password, and name fields', () => {
    render(<SignupForm onSuccess={mockOnSuccess} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<SignupForm onSuccess={mockOnSuccess} />)

    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should render link to login page', () => {
    render(<SignupForm onSuccess={mockOnSuccess} />)

    const loginLink = screen.getByRole('link', { name: /sign in/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute('href', '/login')
  })

  // Note: Browser HTML5 validation (type="email", required) runs before our custom validation
  // These tests would require disabling browser validation to test our React validation logic

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()

    // Mock pending API response
    global.fetch = vi.fn(() => new Promise(() => {})) as typeof fetch

    render(<SignupForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('should call onSuccess callback on successful signup', async () => {
    const user = userEvent.setup()

    // Mock successful API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            data: {
              user: {
                id: '123',
                email: 'test@example.com',
                name: 'Test User',
              },
            },
          }),
      } as Response)
    )

    render(<SignupForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should display error message for duplicate email', async () => {
    const user = userEvent.setup()

    // Mock 409 Conflict response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: 'Email already exists',
          }),
      } as Response)
    )

    render(<SignupForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should display error message on server error', async () => {
    const user = userEvent.setup()

    // Mock 500 server error
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            error: 'Internal server error',
          }),
      } as Response)
    )

    render(<SignupForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/internal server error|something went wrong/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should clear error message when user starts typing', async () => {
    const user = userEvent.setup()

    // Mock failed API response
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: 'Email already exists',
          }),
      } as Response)
    )

    render(<SignupForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const nameInput = screen.getByLabelText(/name/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })

    // Submit with existing email
    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(nameInput, 'Test User')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })

    // Start typing again
    await user.clear(emailInput)
    await user.type(emailInput, 'x')

    await waitFor(() => {
      expect(screen.queryByText(/email already exists/i)).not.toBeInTheDocument()
    })
  })
})
