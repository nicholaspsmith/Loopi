import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'

/**
 * Component Test for LoginForm
 *
 * Tests the LoginForm component behavior.
 * Following TDD - these should FAIL until component is implemented.
 */

describe('LoginForm', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email and password fields', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should render link to signup page', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />)

    const signupLink = screen.getByRole('link', { name: /sign up/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute('href', '/signup')
  })

  // Note: Browser HTML5 validation (type="email", required) runs before our custom validation
  // These tests would require disabling browser validation to test our React validation logic

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })

  it('should call onSuccess callback on successful login', async () => {
    const user = userEvent.setup()
    const { signIn } = await import('next-auth/react')

    // Mock successful sign in
    vi.mocked(signIn).mockResolvedValueOnce({
      ok: true,
      error: undefined,
      status: 200,
      url: '',
      code: undefined,
    })

    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'SecurePass123!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('should display error message on failed login', async () => {
    const user = userEvent.setup()
    const { signIn } = await import('next-auth/react')

    // Mock failed sign in
    vi.mocked(signIn).mockResolvedValueOnce({
      ok: false,
      error: 'CredentialsSignin',
      status: 401,
      url: '',
      code: 'credentials',
    })

    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'WrongPassword!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('should clear error message when user starts typing', async () => {
    const user = userEvent.setup()
    const { signIn } = await import('next-auth/react')

    // Mock failed sign in
    vi.mocked(signIn).mockResolvedValueOnce({
      ok: false,
      error: 'CredentialsSignin',
      status: 401,
      url: '',
      code: 'credentials',
    })

    render(<LoginForm onSuccess={mockOnSuccess} />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Submit with wrong credentials
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'WrongPassword!')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    // Start typing again
    await user.clear(passwordInput)
    await user.type(passwordInput, 'x')

    await waitFor(() => {
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
    })
  })
})
