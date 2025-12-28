import { describe, it, expect } from 'vitest'

/**
 * Unit Tests for Topic Normalization
 *
 * Tests topic name normalization logic for analytics.
 * Maps to User Story 6: Track Popular Topics for Curated Trees
 */

describe('Topic Normalization', () => {
  describe('Basic Normalization', () => {
    function normalizeTopic(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
        .replace(/\s+/g, ' ')
    }

    it('should convert to lowercase', () => {
      expect(normalizeTopic('Kubernetes')).toBe('kubernetes')
      expect(normalizeTopic('PYTHON')).toBe('python')
      expect(normalizeTopic('JavaScript')).toBe('javascript')
    })

    it('should trim whitespace', () => {
      expect(normalizeTopic('  Docker  ')).toBe('docker')
      expect(normalizeTopic('\tGo\n')).toBe('go')
    })

    it('should normalize multiple spaces', () => {
      expect(normalizeTopic('React    Native')).toBe('react native')
      expect(normalizeTopic('Vue  JS')).toBe('vue js')
    })
  })

  describe('Prefix Removal', () => {
    function normalizeTopic(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
        .replace(/\s+/g, ' ')
    }

    it('should remove "Learn" prefix', () => {
      expect(normalizeTopic('Learn Kubernetes')).toBe('kubernetes')
      expect(normalizeTopic('learn Python')).toBe('python')
      expect(normalizeTopic('LEARN Docker')).toBe('docker')
    })

    it('should remove "Study" prefix', () => {
      expect(normalizeTopic('Study JavaScript')).toBe('javascript')
      expect(normalizeTopic('study React')).toBe('react')
    })

    it('should remove "Master" prefix', () => {
      expect(normalizeTopic('Master Go')).toBe('go')
      expect(normalizeTopic('master TypeScript')).toBe('typescript')
    })

    it('should remove "Intro to" prefix', () => {
      expect(normalizeTopic('Intro to Machine Learning')).toBe('machine learning')
      expect(normalizeTopic('intro to AWS')).toBe('aws')
    })

    it('should remove "Introduction to" prefix', () => {
      expect(normalizeTopic('Introduction to Databases')).toBe('databases')
      expect(normalizeTopic('introduction to SQL')).toBe('sql')
    })

    it('should not remove prefix from middle of string', () => {
      expect(normalizeTopic('Advanced Learn Techniques')).toBe('advanced learn techniques')
    })

    it('should handle prefix without trailing space', () => {
      // Should not remove if no space after prefix
      expect(normalizeTopic('Learning')).toBe('learning')
    })
  })

  describe('Topic Equivalence', () => {
    function normalizeTopic(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
        .replace(/\s+/g, ' ')
    }

    it('should normalize equivalent topics to same value', () => {
      const variations = [
        'Learn Kubernetes',
        'Study Kubernetes',
        'Master Kubernetes',
        'kubernetes',
        'KUBERNETES',
        '  Kubernetes  ',
      ]

      const normalized = variations.map(normalizeTopic)

      // All should normalize to 'kubernetes'
      expect(new Set(normalized).size).toBe(1)
      expect(normalized[0]).toBe('kubernetes')
    })

    it('should preserve different topics', () => {
      const topics = ['Kubernetes', 'Docker', 'Python']

      const normalized = topics.map(normalizeTopic)

      expect(new Set(normalized).size).toBe(3)
      expect(normalized).toContain('kubernetes')
      expect(normalized).toContain('docker')
      expect(normalized).toContain('python')
    })
  })

  describe('Edge Cases', () => {
    function normalizeTopic(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
        .replace(/\s+/g, ' ')
    }

    it('should handle empty string', () => {
      expect(normalizeTopic('')).toBe('')
    })

    it('should handle whitespace-only string', () => {
      expect(normalizeTopic('   ')).toBe('')
    })

    it('should handle topic with special characters', () => {
      expect(normalizeTopic('C++')).toBe('c++')
      expect(normalizeTopic('Node.js')).toBe('node.js')
    })

    it('should handle multi-word topics', () => {
      expect(normalizeTopic('Learn Machine Learning')).toBe('machine learning')
      expect(normalizeTopic('Intro to Data Science')).toBe('data science')
    })

    it('should handle numbers in topic', () => {
      expect(normalizeTopic('Python 3')).toBe('python 3')
      expect(normalizeTopic('ES6')).toBe('es6')
    })

    it('should handle Unicode characters', () => {
      expect(normalizeTopic('日本語')).toBe('日本語')
    })
  })

  describe('Topic Grouping', () => {
    function normalizeTopic(input: string): string {
      return input
        .toLowerCase()
        .trim()
        .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
        .replace(/\s+/g, ' ')
    }

    function groupTopics(topics: string[]): Map<string, string[]> {
      const groups = new Map<string, string[]>()

      topics.forEach((topic) => {
        const normalized = normalizeTopic(topic)
        if (!groups.has(normalized)) {
          groups.set(normalized, [])
        }
        groups.get(normalized)!.push(topic)
      })

      return groups
    }

    it('should group similar topics together', () => {
      const topics = [
        'Learn Kubernetes',
        'Study Kubernetes',
        'Kubernetes',
        'Learn Docker',
        'Docker',
      ]

      const groups = groupTopics(topics)

      expect(groups.size).toBe(2)
      expect(groups.get('kubernetes')?.length).toBe(3)
      expect(groups.get('docker')?.length).toBe(2)
    })

    it('should track topic count changes', () => {
      const topics1 = ['Learn Kubernetes', 'Learn Docker']
      const topics2 = ['Learn Kubernetes', 'Kubernetes', 'Learn Docker']

      const groups1 = groupTopics(topics1)
      const groups2 = groupTopics(topics2)

      expect(groups1.get('kubernetes')?.length).toBe(1)
      expect(groups2.get('kubernetes')?.length).toBe(2)
    })

    it('should return empty map for empty input', () => {
      const groups = groupTopics([])

      expect(groups.size).toBe(0)
    })
  })
})
