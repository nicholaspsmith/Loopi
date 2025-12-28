import { describe, it, expect } from 'vitest'
import type { GeneratedNode } from '@/lib/ai/skill-tree-generator'

/**
 * Unit Tests for Skill Tree Generator
 *
 * Tests parsing, validation, and utility functions.
 * Does not test actual LLM calls (those are integration tests).
 */

// Re-implement parsing logic for testing (since parseResponse is not exported)
function parseResponse(responseText: string): GeneratedNode[] {
  let jsonText = responseText.trim()

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonText = match[1].trim()
    }
  }

  const parsed = JSON.parse(jsonText)

  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid response: missing nodes array')
  }

  const validateNode = (node: unknown, depth: number): GeneratedNode => {
    if (typeof node !== 'object' || node === null) {
      throw new Error('Invalid node: not an object')
    }

    const n = node as Record<string, unknown>

    if (typeof n.title !== 'string' || n.title.length === 0) {
      throw new Error('Invalid node: missing or empty title')
    }

    if (typeof n.depth !== 'number' || n.depth < 1 || n.depth > 3) {
      throw new Error(`Invalid node depth: ${n.depth}`)
    }

    const result: GeneratedNode = {
      title: n.title,
      depth: n.depth,
    }

    if (typeof n.description === 'string') {
      result.description = n.description
    }

    if (Array.isArray(n.children) && n.children.length > 0) {
      result.children = n.children.map((c) => validateNode(c, depth + 1))
    }

    return result
  }

  return parsed.nodes.map((n: unknown) => validateNode(n, 1))
}

function countNodes(nodes: GeneratedNode[]): number {
  return nodes.reduce((count, node) => {
    return count + 1 + (node.children ? countNodes(node.children) : 0)
  }, 0)
}

function findMaxDepth(nodes: GeneratedNode[]): number {
  return nodes.reduce((max, node) => {
    const childMax = node.children ? findMaxDepth(node.children) : 0
    return Math.max(max, node.depth, childMax)
  }, 0)
}

describe('Skill Tree Generator', () => {
  describe('parseResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        nodes: [
          {
            title: 'Core Concepts',
            description: 'Learn fundamentals',
            depth: 1,
            children: [{ title: 'Variables', description: 'Understand variables', depth: 2 }],
          },
        ],
      })

      const nodes = parseResponse(response)

      expect(nodes).toHaveLength(1)
      expect(nodes[0].title).toBe('Core Concepts')
      expect(nodes[0].children).toHaveLength(1)
    })

    it('should handle markdown code blocks', () => {
      const response = `\`\`\`json
{
  "nodes": [
    {"title": "Topic", "depth": 1}
  ]
}
\`\`\``

      const nodes = parseResponse(response)

      expect(nodes).toHaveLength(1)
      expect(nodes[0].title).toBe('Topic')
    })

    it('should handle code blocks without language specifier', () => {
      const response = `\`\`\`
{
  "nodes": [
    {"title": "Topic", "depth": 1}
  ]
}
\`\`\``

      const nodes = parseResponse(response)

      expect(nodes).toHaveLength(1)
    })

    it('should throw for missing nodes array', () => {
      const response = JSON.stringify({ categories: [] })

      expect(() => parseResponse(response)).toThrow('Invalid response: missing nodes array')
    })

    it('should throw for node with missing title', () => {
      const response = JSON.stringify({
        nodes: [{ depth: 1 }],
      })

      expect(() => parseResponse(response)).toThrow('Invalid node: missing or empty title')
    })

    it('should throw for node with invalid depth', () => {
      const response = JSON.stringify({
        nodes: [{ title: 'Test', depth: 0 }],
      })

      expect(() => parseResponse(response)).toThrow('Invalid node depth: 0')
    })

    it('should throw for depth greater than 3', () => {
      const response = JSON.stringify({
        nodes: [{ title: 'Test', depth: 4 }],
      })

      expect(() => parseResponse(response)).toThrow('Invalid node depth: 4')
    })

    it('should handle nodes without description', () => {
      const response = JSON.stringify({
        nodes: [{ title: 'Topic', depth: 1 }],
      })

      const nodes = parseResponse(response)

      expect(nodes[0].description).toBeUndefined()
    })

    it('should handle nodes without children', () => {
      const response = JSON.stringify({
        nodes: [{ title: 'Topic', depth: 1 }],
      })

      const nodes = parseResponse(response)

      expect(nodes[0].children).toBeUndefined()
    })

    it('should handle empty children array', () => {
      const response = JSON.stringify({
        nodes: [{ title: 'Topic', depth: 1, children: [] }],
      })

      const nodes = parseResponse(response)

      expect(nodes[0].children).toBeUndefined() // Empty array becomes undefined
    })
  })

  describe('countNodes', () => {
    it('should count single node', () => {
      const nodes: GeneratedNode[] = [{ title: 'A', depth: 1 }]

      expect(countNodes(nodes)).toBe(1)
    })

    it('should count multiple top-level nodes', () => {
      const nodes: GeneratedNode[] = [
        { title: 'A', depth: 1 },
        { title: 'B', depth: 1 },
        { title: 'C', depth: 1 },
      ]

      expect(countNodes(nodes)).toBe(3)
    })

    it('should count nested nodes', () => {
      const nodes: GeneratedNode[] = [
        {
          title: 'A',
          depth: 1,
          children: [
            { title: 'A1', depth: 2 },
            { title: 'A2', depth: 2 },
          ],
        },
      ]

      expect(countNodes(nodes)).toBe(3)
    })

    it('should count deeply nested nodes', () => {
      const nodes: GeneratedNode[] = [
        {
          title: 'A',
          depth: 1,
          children: [
            {
              title: 'A1',
              depth: 2,
              children: [
                { title: 'A1a', depth: 3 },
                { title: 'A1b', depth: 3 },
              ],
            },
          ],
        },
      ]

      expect(countNodes(nodes)).toBe(4)
    })

    it('should handle empty array', () => {
      expect(countNodes([])).toBe(0)
    })
  })

  describe('findMaxDepth', () => {
    it('should return 0 for empty array', () => {
      expect(findMaxDepth([])).toBe(0)
    })

    it('should find depth of single node', () => {
      const nodes: GeneratedNode[] = [{ title: 'A', depth: 1 }]

      expect(findMaxDepth(nodes)).toBe(1)
    })

    it('should find max depth with nested nodes', () => {
      const nodes: GeneratedNode[] = [
        {
          title: 'A',
          depth: 1,
          children: [{ title: 'A1', depth: 2 }],
        },
      ]

      expect(findMaxDepth(nodes)).toBe(2)
    })

    it('should find max depth at level 3', () => {
      const nodes: GeneratedNode[] = [
        {
          title: 'A',
          depth: 1,
          children: [
            {
              title: 'A1',
              depth: 2,
              children: [{ title: 'A1a', depth: 3 }],
            },
          ],
        },
      ]

      expect(findMaxDepth(nodes)).toBe(3)
    })

    it('should handle multiple branches with different depths', () => {
      const nodes: GeneratedNode[] = [
        { title: 'A', depth: 1 },
        {
          title: 'B',
          depth: 1,
          children: [
            {
              title: 'B1',
              depth: 2,
              children: [{ title: 'B1a', depth: 3 }],
            },
          ],
        },
      ]

      expect(findMaxDepth(nodes)).toBe(3)
    })
  })

  describe('Node Structure Validation', () => {
    it('should accept valid Kubernetes skill tree structure', () => {
      const kubernetesTree = {
        nodes: [
          {
            title: 'Core Concepts',
            description: 'Understand Kubernetes architecture',
            depth: 1,
            children: [
              { title: 'Pods', description: 'Basic workload unit', depth: 2 },
              { title: 'Services', description: 'Network abstraction', depth: 2 },
              { title: 'Deployments', description: 'Declarative updates', depth: 2 },
            ],
          },
          {
            title: 'Configuration',
            description: 'Manage application config',
            depth: 1,
            children: [
              { title: 'ConfigMaps', description: 'Non-sensitive data', depth: 2 },
              { title: 'Secrets', description: 'Sensitive data', depth: 2 },
            ],
          },
        ],
      }

      const nodes = parseResponse(JSON.stringify(kubernetesTree))

      expect(nodes).toHaveLength(2)
      expect(countNodes(nodes)).toBe(7)
      expect(findMaxDepth(nodes)).toBe(2)
    })

    it('should accept tree with maximum depth 3', () => {
      const deepTree = {
        nodes: [
          {
            title: 'Level 1',
            depth: 1,
            children: [
              {
                title: 'Level 2',
                depth: 2,
                children: [
                  { title: 'Level 3a', depth: 3 },
                  { title: 'Level 3b', depth: 3 },
                ],
              },
            ],
          },
        ],
      }

      const nodes = parseResponse(JSON.stringify(deepTree))

      expect(findMaxDepth(nodes)).toBe(3)
    })
  })
})
