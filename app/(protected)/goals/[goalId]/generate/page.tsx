'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

/**
 * Card Generation Page (Simplified)
 *
 * Flow:
 * 1. User lands with nodeId in URL params
 * 2. Select card count
 * 3. Generate cards (cards are created directly as active)
 * 4. Redirect to goal page
 */

interface NodeInfo {
  id: string
  title: string
  description: string | null
  cardCount?: number
  children?: NodeInfo[]
}

export default function GeneratePage({ params }: { params: Promise<{ goalId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nodeId = searchParams.get('nodeId')
  const bulkGenerate = searchParams.get('bulkGenerate') === 'true'

  const [goalId, setGoalId] = useState<string | null>(null)
  const [node, setNode] = useState<NodeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [count, setCount] = useState(5)

  // Bulk generation state
  const [bulkProgress, setBulkProgress] = useState<{
    current: number
    total: number
    currentNode: string
  } | null>(null)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setGoalId(p.goalId))
  }, [params])

  // Helper: Collect all descendant nodes (flatten the tree)
  const collectDescendants = (node: NodeInfo): NodeInfo[] => {
    const descendants = [node]
    if (node.children) {
      node.children.forEach((child) => {
        descendants.push(...collectDescendants(child))
      })
    }
    return descendants
  }

  // Helper: Get nodes needing cards
  const getEmptyNodes = (node: NodeInfo): NodeInfo[] => {
    return collectDescendants(node).filter((n) => (n.cardCount ?? 0) === 0)
  }

  // Fetch node info
  useEffect(() => {
    if (!goalId || !nodeId) return

    const fetchNode = async () => {
      try {
        const response = await fetch(`/api/goals/${goalId}/skill-tree`)
        if (!response.ok) throw new Error('Failed to load skill tree')
        const data = await response.json()

        // Find the node in the tree
        const findNode = (nodes: NodeInfo[]): NodeInfo | null => {
          for (const n of nodes) {
            if (n.id === nodeId) return n
            if (n.children) {
              const found = findNode(n.children)
              if (found) return found
            }
          }
          return null
        }

        const foundNode = findNode(data.nodes || [])
        if (foundNode) {
          setNode(foundNode)
        } else {
          setError('Node not found')
        }
      } catch {
        setError('Failed to load node information')
      }
    }

    fetchNode()
  }, [goalId, nodeId])

  // Generate cards for a single node
  const handleGenerate = async () => {
    if (!goalId || !nodeId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, count, cardType: 'mixed' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate cards')
      }

      const result = await response.json()
      const duplicateInfo =
        result.duplicatesFiltered > 0 ? ` (${result.duplicatesFiltered} duplicates filtered)` : ''
      setSuccess(
        `Created ${result.created} cards${duplicateInfo} in ${(result.metadata.generationTimeMs / 1000).toFixed(1)}s! Redirecting...`
      )

      // Redirect to goal page after short delay
      setTimeout(() => {
        router.push(`/goals/${goalId}`)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards')
    } finally {
      setLoading(false)
    }
  }

  // Bulk generate cards for all empty nodes
  const handleBulkGenerate = async () => {
    if (!goalId || !node) return

    const emptyNodes = getEmptyNodes(node)
    if (emptyNodes.length === 0) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const errors: string[] = []
    let totalCreated = 0
    let totalDuplicatesFiltered = 0
    let completed = 0

    // Process in batches of 3 to avoid overwhelming the API
    const batchSize = 3
    for (let i = 0; i < emptyNodes.length; i += batchSize) {
      const batch = emptyNodes.slice(i, i + batchSize)

      // Update progress to show first node in batch
      setBulkProgress({
        current: completed,
        total: emptyNodes.length,
        currentNode: batch.map((n) => n.title).join(', '),
      })

      const results = await Promise.allSettled(
        batch.map(async (emptyNode) => {
          const response = await fetch(`/api/goals/${goalId}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId: emptyNode.id, count: 5, cardType: 'mixed' }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || 'Failed to generate cards')
          }

          return { node: emptyNode, result: await response.json() }
        })
      )

      // Process results
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          totalCreated += result.value.result.created
          totalDuplicatesFiltered += result.value.result.duplicatesFiltered || 0
        } else {
          errors.push(`${batch[idx].title}: ${result.reason?.message || 'Unknown error'}`)
        }
      })

      completed += batch.length
    }

    setBulkProgress(null)
    setLoading(false)

    // Handle complete failure case
    if (totalCreated === 0 && errors.length === emptyNodes.length) {
      setError(`Failed to generate cards for all ${emptyNodes.length} topics. Please try again.`)
      return
    }

    if (errors.length > 0) {
      setError(`Completed with errors:\n${errors.join('\n')}`)
    }

    if (totalCreated > 0) {
      const duplicateInfo =
        totalDuplicatesFiltered > 0 ? ` (${totalDuplicatesFiltered} duplicates filtered)` : ''
      setSuccess(
        `Created ${totalCreated} cards${duplicateInfo} across ${emptyNodes.length - errors.length} topics! Redirecting...`
      )
      setTimeout(() => {
        router.push(`/goals/${goalId}`)
        router.refresh()
      }, 2000)
    }
  }

  if (!nodeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No node selected</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Please select a node from the skill tree to generate cards.
        </p>
        {goalId && (
          <Link href={`/goals/${goalId}`} className="text-blue-600 hover:underline">
            Back to Goal
          </Link>
        )}
      </div>
    )
  }

  // Bulk generation mode
  if (bulkGenerate && node) {
    const emptyNodes = getEmptyNodes(node)

    return (
      <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {goalId && (
            <Link
              href={`/goals/${goalId}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Goal
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Generate Cards for Empty Topics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Starting from: <span className="font-medium">{node.title}</span>
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 whitespace-pre-line">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        {/* Progress */}
        {bulkProgress && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-900 dark:text-blue-100 font-medium">
                Generating cards for: {bulkProgress.currentNode}
              </span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Progress: {bulkProgress.current} / {bulkProgress.total} topics
            </div>
            <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* No empty nodes */}
        {emptyNodes.length === 0 && !loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">All topics already have cards!</p>
            {goalId && (
              <Link
                href={`/goals/${goalId}`}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Back to Goal
              </Link>
            )}
          </div>
        )}

        {/* List of empty nodes and generate button */}
        {emptyNodes.length > 0 && !success && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Topics to Generate Cards For ({emptyNodes.length})
            </h2>
            <div className="mb-6 max-h-96 overflow-y-auto">
              <ul className="space-y-2">
                {emptyNodes.map((emptyNode) => (
                  <li
                    key={emptyNode.id}
                    className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>{emptyNode.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                5 cards will be generated for each topic (mixed flashcards and multiple choice)
              </p>
              <button
                onClick={handleBulkGenerate}
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Generate 5 Cards per Topic
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Single node generation mode
  return (
    <div className="flex flex-col min-h-screen p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        {goalId && (
          <Link
            href={`/goals/${goalId}`}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Goal
          </Link>
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generate More Cards</h1>
        {node && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Adding cards to: <span className="font-medium">{node.title}</span>
          </p>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Generation Form */}
      {!success && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Cards
            </label>
            <select
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5 cards</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value={20}>20 cards</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cards will be created immediately and available for study.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Generate {count} Cards
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
