/**
 * AI Skill Tree Generator
 *
 * Generates hierarchical skill trees for learning goals.
 * Uses the Anthropic SDK for AI-powered skill tree generation.
 * Based on prompting strategy from research.md section 2.
 */

import * as logger from '@/lib/logger'
import { getChatCompletion, CLAUDE_MODEL } from '@/lib/claude/client'

/**
 * Generated skill tree node from LLM
 */
export interface GeneratedNode {
  title: string
  description?: string
  depth: number
  children?: GeneratedNode[]
}

/**
 * Skill tree generation result
 */
export interface SkillTreeGenerationResult {
  nodes: GeneratedNode[]
  metadata: {
    model: string
    generationTimeMs: number
    nodeCount: number
    maxDepth: number
    retryCount: number
  }
}

/**
 * Options for skill tree generation
 */
export interface SkillTreeGenerationOptions {
  maxRetries?: number
  timeout?: number // milliseconds
}

const DEFAULT_OPTIONS: Required<SkillTreeGenerationOptions> = {
  maxRetries: 3,
  timeout: 60000,
}

/**
 * Get the model name being used
 */
function getModelName(): string {
  return CLAUDE_MODEL
}

/**
 * Build the prompt for skill tree generation
 * From research.md: Structured JSON output with few-shot examples
 */
function buildPrompt(topic: string): string {
  return `You are a curriculum designer. Generate a learning skill tree for the topic: "${topic}"

Output JSON in this exact format:
{
  "nodes": [
    {"title": "Category Name", "description": "Brief description", "depth": 1, "children": [
      {"title": "Topic Name", "description": "Brief description", "depth": 2, "children": [
        {"title": "Subtopic Name", "description": "Brief description", "depth": 3}
      ]}
    ]}
  ]
}

Rules:
- 3-6 top-level categories
- 2-5 topics per category
- 0-3 subtopics per topic (optional)
- Titles should be concise (3-5 words)
- Descriptions should be 1 sentence explaining what the learner will know
- Order from foundational to advanced
- Maximum depth is 3 (Category → Topic → Subtopic)

Example for "Python Programming":
{
  "nodes": [
    {"title": "Core Syntax", "description": "Learn Python's fundamental syntax and structure", "depth": 1, "children": [
      {"title": "Variables and Types", "description": "Understand data types and variable assignment", "depth": 2},
      {"title": "Control Flow", "description": "Master conditionals and loops", "depth": 2},
      {"title": "Functions", "description": "Define and use functions effectively", "depth": 2}
    ]},
    {"title": "Data Structures", "description": "Work with Python's built-in data structures", "depth": 1, "children": [
      {"title": "Lists and Tuples", "description": "Store and manipulate sequences", "depth": 2},
      {"title": "Dictionaries", "description": "Use key-value data storage", "depth": 2}
    ]}
  ]
}

Generate a skill tree for "${topic}". Return ONLY valid JSON, no markdown code blocks.`
}

/**
 * Parse and validate the LLM response
 */
function parseResponse(responseText: string): GeneratedNode[] {
  // Try to extract JSON from response (handle markdown code blocks)
  let jsonText = responseText.trim()

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonText = match[1].trim()
    }
  }

  // Parse JSON
  const parsed = JSON.parse(jsonText)

  // Validate structure
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid response: missing nodes array')
  }

  // Validate each node
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

/**
 * Count total nodes in a tree
 */
function countNodes(nodes: GeneratedNode[]): number {
  return nodes.reduce((count, node) => {
    return count + 1 + (node.children ? countNodes(node.children) : 0)
  }, 0)
}

/**
 * Find maximum depth in a tree
 */
function findMaxDepth(nodes: GeneratedNode[]): number {
  return nodes.reduce((max, node) => {
    const childMax = node.children ? findMaxDepth(node.children) : 0
    return Math.max(max, node.depth, childMax)
  }, 0)
}

/**
 * Generate a skill tree for a learning topic
 * Uses the Anthropic SDK for AI-powered skill tree generation
 */
export async function generateSkillTree(
  topic: string,
  options?: SkillTreeGenerationOptions
): Promise<SkillTreeGenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  const model = getModelName()

  let lastError: Error | null = null
  let retryCount = 0

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      logger.info('Generating skill tree', {
        topic,
        model,
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
      })

      const systemPrompt = `You are a curriculum designer. Generate learning skill trees as valid JSON only. No markdown, no explanations, just JSON.`

      const responseText = await getChatCompletion({
        messages: [{ role: 'user', content: buildPrompt(topic) }],
        systemPrompt,
      })

      if (!responseText) {
        throw new Error('Empty response from LLM')
      }

      const nodes = parseResponse(responseText)

      // Validate node count ranges
      if (nodes.length < 2) {
        throw new Error(`Too few categories: ${nodes.length}. Expected 3-6.`)
      }

      if (nodes.length > 8) {
        throw new Error(`Too many categories: ${nodes.length}. Expected 3-6.`)
      }

      const nodeCount = countNodes(nodes)
      const maxDepth = findMaxDepth(nodes)

      logger.info('Skill tree generated successfully', {
        topic,
        model,
        nodeCount,
        maxDepth,
        attempt: attempt + 1,
        generationTimeMs: Date.now() - startTime,
      })

      return {
        nodes,
        metadata: {
          model,
          generationTimeMs: Date.now() - startTime,
          nodeCount,
          maxDepth,
          retryCount,
        },
      }
    } catch (error) {
      // Handle ClassifiedError from Claude client (has .message property but isn't Error instance)
      if (error instanceof Error) {
        lastError = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        lastError = new Error(String((error as { message: string }).message))
      } else {
        lastError = new Error(String(error))
      }
      retryCount = attempt + 1

      logger.warn('Skill tree generation attempt failed', {
        topic,
        model,
        attempt: attempt + 1,
        error: lastError.message,
      })

      // Wait before retry (exponential backoff)
      if (attempt < opts.maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  logger.error('Skill tree generation failed after all retries', lastError!, {
    topic,
    model,
    retryCount,
  })

  throw new Error(
    `Failed to generate skill tree after ${opts.maxRetries} attempts: ${lastError?.message}`
  )
}

/**
 * Flatten generated nodes to array for database insertion
 * Assigns paths and parent relationships
 */
export function flattenGeneratedNodes(
  nodes: GeneratedNode[],
  parentId: string | null = null,
  parentPath: string = ''
): Array<{
  title: string
  description: string | null
  depth: number
  path: string
  parentId: string | null
  sortOrder: number
  children: GeneratedNode[] | undefined
}> {
  const result: Array<{
    title: string
    description: string | null
    depth: number
    path: string
    parentId: string | null
    sortOrder: number
    children: GeneratedNode[] | undefined
  }> = []

  nodes.forEach((node, index) => {
    const path = parentPath ? `${parentPath}.${index + 1}` : String(index + 1)

    result.push({
      title: node.title,
      description: node.description ?? null,
      depth: node.depth,
      path,
      parentId,
      sortOrder: index,
      children: node.children,
    })
  })

  return result
}
