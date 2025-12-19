import { describe, it, expect, beforeAll } from 'vitest'
import { initializeSchema } from '@/lib/db/schema'

/**
 * Contract Tests for Authentication API
 *
 * These tests verify API contracts for authentication endpoints.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('POST /api/auth/signup', () => {
  beforeAll(async () => {
    // Initialize test database
    await initializeSchema()
  })

  it('should return 201 and user data for valid signup', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      }),
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data).toHaveProperty('user')
    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('email', 'test@example.com')
    expect(data.user).toHaveProperty('name', 'Test User')
    expect(data.user).not.toHaveProperty('passwordHash')
  })

  it('should return 400 for missing email', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'SecurePass123!',
        name: 'Test User',
      }),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should return 400 for weak password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test2@example.com',
        password: '123',
        name: 'Test User',
      }),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should return 409 for duplicate email', async () => {
    // First signup
    await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      }),
    })

    // Duplicate signup
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'Test User 2',
      }),
    })

    expect(response.status).toBe(409)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })
})

describe('POST /api/auth/signin', () => {
  beforeAll(async () => {
    // Create test user
    await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'signin@example.com',
        password: 'SecurePass123!',
        name: 'Signin Test User',
      }),
    })
  })

  it('should return 200 and session for valid credentials', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'signin@example.com',
        password: 'SecurePass123!',
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('user')
    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('email', 'signin@example.com')
    expect(data.user).not.toHaveProperty('passwordHash')
  })

  it('should return 401 for invalid email', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'SecurePass123!',
      }),
    })

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should return 401 for invalid password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'signin@example.com',
        password: 'WrongPassword123!',
      }),
    })

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })

  it('should return 400 for missing credentials', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data).toHaveProperty('error')
  })
})

describe('POST /api/auth/signout', () => {
  it('should return 200 for successful signout', async () => {
    const response = await fetch('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('success', true)
  })
})

describe('GET /api/auth/session', () => {
  it('should return 200 with null for unauthenticated request', async () => {
    const response = await fetch('http://localhost:3000/api/auth/session')

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('user', null)
  })

  it('should return 200 with user data for authenticated request', async () => {
    // First sign in
    const signinResponse = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'signin@example.com',
        password: 'SecurePass123!',
      }),
    })

    // Extract session cookie
    const cookies = signinResponse.headers.get('set-cookie')

    // Check session with cookie
    const response = await fetch('http://localhost:3000/api/auth/session', {
      headers: {
        Cookie: cookies || '',
      },
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('user')
    expect(data.user).toHaveProperty('id')
    expect(data.user).toHaveProperty('email')
    expect(data.user).not.toHaveProperty('passwordHash')
  })
})
