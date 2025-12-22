import { describe, it, expect } from 'vitest'
import { validateCommitMessage } from '../../../../scripts/hooks/commit-msg-validator'

describe('commit-msg-validator', () => {
  describe('subject line validation', () => {
    // T014: Test case: subject line >72 chars returns error
    it('should return error when subject line exceeds 72 characters', () => {
      const longSubject =
        'This is a very long commit message that definitely exceeds the seventy-two character limit'
      const result = validateCommitMessage(longSubject)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'subject-length',
          message: expect.stringContaining('72'),
        })
      )
    })

    it('should accept subject line with exactly 72 characters', () => {
      // Exactly 72 chars
      const exactSubject =
        'Add feature that does something useful for users in the application here'
      expect(exactSubject.length).toBe(72) // Verify test data

      const result = validateCommitMessage(exactSubject)
      expect(result.errors.filter((e) => e.rule === 'subject-length')).toHaveLength(0)
    })
  })

  describe('imperative mood validation', () => {
    // T015: Test case: past tense prefix ("Added", "Fixed") returns error
    it('should return error for past tense prefix "Added"', () => {
      const result = validateCommitMessage('Added new feature')

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'imperative-mood',
          message: expect.stringContaining('imperative'),
        })
      )
    })

    it('should return error for past tense prefix "Fixed"', () => {
      const result = validateCommitMessage('Fixed the bug')

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'imperative-mood',
        })
      )
    })

    it('should return error for past tense prefix "Updated"', () => {
      const result = validateCommitMessage('Updated the readme')

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'imperative-mood',
        })
      )
    })

    it('should accept imperative mood "Add"', () => {
      const result = validateCommitMessage('Add new feature')
      expect(result.errors.filter((e) => e.rule === 'imperative-mood')).toHaveLength(0)
    })

    it('should accept imperative mood "Fix"', () => {
      const result = validateCommitMessage('Fix the bug')
      expect(result.errors.filter((e) => e.rule === 'imperative-mood')).toHaveLength(0)
    })
  })

  describe('body format validation', () => {
    // T016: Test case: body with extra content (not just Co-Authored-By) returns error
    it('should return error when body contains extra content beyond Co-Authored-By', () => {
      const commitMsg = `Add feature

This is some extra body content that should not be here.

Co-Authored-By: Claude <noreply@anthropic.com>`

      const result = validateCommitMessage(commitMsg)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'body-format',
          message: expect.stringContaining('Co-Authored-By'),
        })
      )
    })

    it('should accept body with only Co-Authored-By line', () => {
      const commitMsg = `Add feature

Co-Authored-By: Claude <noreply@anthropic.com>`

      const result = validateCommitMessage(commitMsg)
      expect(result.errors.filter((e) => e.rule === 'body-format')).toHaveLength(0)
    })

    it('should accept subject-only commit (no body)', () => {
      const result = validateCommitMessage('Add feature')
      expect(result.errors.filter((e) => e.rule === 'body-format')).toHaveLength(0)
    })
  })

  describe('AI attribution validation', () => {
    // T017: Test case: forbidden AI attribution text returns error
    it('should return error for "Generated with Claude Code"', () => {
      const commitMsg = `Add feature

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`

      const result = validateCommitMessage(commitMsg)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'ai-attribution',
          message: expect.stringContaining('AI attribution'),
        })
      )
    })

    it('should return error for emoji robot in commit', () => {
      const commitMsg = `Add feature

🤖 This commit was made by AI

Co-Authored-By: Claude <noreply@anthropic.com>`

      const result = validateCommitMessage(commitMsg)

      expect(result.valid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          rule: 'ai-attribution',
        })
      )
    })
  })

  describe('multiple responsibilities warning', () => {
    // T018: Test case: multiple responsibilities returns warning
    it('should return warning for commit with "and" suggesting multiple changes', () => {
      const result = validateCommitMessage('Add feature and fix bug')

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          rule: 'multiple-responsibilities',
          message: expect.stringContaining('multiple'),
        })
      )
      // Should still be valid (warning, not error)
      expect(result.errors).toHaveLength(0)
    })

    it('should return warning for commit listing multiple items', () => {
      const result = validateCommitMessage('Update auth, add tests, fix typo')

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          rule: 'multiple-responsibilities',
        })
      )
    })
  })

  describe('valid commit messages', () => {
    // T019: Test case: valid commit message passes
    it('should pass for a properly formatted commit message', () => {
      const commitMsg = `Add user authentication feature

Co-Authored-By: Claude <noreply@anthropic.com>`

      const result = validateCommitMessage(commitMsg)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass for subject-only commit', () => {
      const result = validateCommitMessage('Fix login validation error')

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should pass for commit with co-author on single line', () => {
      const result = validateCommitMessage(
        'Refactor database queries\n\nCo-Authored-By: Claude <noreply@anthropic.com>'
      )

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty commit message', () => {
      const result = validateCommitMessage('')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle whitespace-only commit message', () => {
      const result = validateCommitMessage('   \n\n   ')

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should trim subject line before validation', () => {
      const result = validateCommitMessage('  Add feature  ')

      expect(result.errors.filter((e) => e.rule === 'imperative-mood')).toHaveLength(0)
    })
  })
})
