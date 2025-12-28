'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import CardPreview, { type GeneratedCardData } from '@/components/cards/CardPreview'

/**
 * Card Generation Page (T044)
 *
 * Flow:
 * 1. User lands with nodeId in URL params
 * 2. Select card type and count
 * 3. Generate cards (loading state)
 * 4. Preview and edit cards
 * 5. Optionally refine with feedback
 * 6. Commit approved cards
 */

interface NodeInfo {
  id: string
  title: string
  description: string | null
}

interface GenerationResult {
  cards: GeneratedCardData[]
  nodeId: string
  nodeTitle: string
  generatedAt: string
  metadata: {
    generationTimeMs: number
    model: string
    retryCount: number
  }
}

export default function GeneratePage({ params }: { params: Promise<{ goalId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nodeId = searchParams.get('nodeId')

  const [goalId, setGoalId] = useState<string | null>(null)
  const [node, setNode] = useState<NodeInfo | null>(null)
  const [cards, setCards] = useState<GeneratedCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [refining, setRefining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [cardType, setCardType] = useState<'flashcard' | 'multiple_choice' | 'mixed'>('flashcard')
  const [count, setCount] = useState(10)
  const [refineFeedback, setRefineFeedback] = useState('')
  const [showRefineInput, setShowRefineInput] = useState(false)

  // Unwrap params
  useEffect(() => {
    params.then((p) => setGoalId(p.goalId))
  }, [params])

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

  // Generate cards
  const handleGenerate = async () => {
    if (!goalId || !nodeId) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, count, cardType }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate cards')
      }

      const result: GenerationResult = await response.json()
      setCards(result.cards)
      setSuccess(
        `Generated ${result.cards.length} cards in ${(result.metadata.generationTimeMs / 1000).toFixed(1)}s`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cards')
    } finally {
      setLoading(false)
    }
  }

  // Refine cards
  const handleRefine = async () => {
    if (!goalId || !nodeId || !refineFeedback.trim()) return

    setRefining(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/generate/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, cards, feedback: refineFeedback }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to refine cards')
      }

      const result = await response.json()
      setCards(result.cards)
      setRefineFeedback('')
      setShowRefineInput(false)
      setSuccess(`Cards refined based on: "${result.refinementApplied}"`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine cards')
    } finally {
      setRefining(false)
    }
  }

  // Commit cards
  const handleCommit = async () => {
    if (!goalId || !nodeId) return

    const approvedCards = cards.filter((c) => c.approved)
    if (approvedCards.length === 0) {
      setError('No approved cards to commit')
      return
    }

    setCommitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/goals/${goalId}/generate/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, cards }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to commit cards')
      }

      const result = await response.json()
      setSuccess(`Committed ${result.committed} cards! Redirecting...`)

      // Redirect to goal page after short delay
      setTimeout(() => {
        router.push(`/goals/${goalId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit cards')
    } finally {
      setCommitting(false)
    }
  }

  // Update card
  const handleUpdateCard = (tempId: string, updates: Partial<GeneratedCardData>) => {
    setCards((prev) =>
      prev.map((card) => (card.tempId === tempId ? { ...card, ...updates } : card))
    )
  }

  // Remove card
  const handleRemoveCard = (tempId: string) => {
    setCards((prev) => prev.filter((card) => card.tempId !== tempId))
  }

  // Toggle all approval
  const handleToggleAll = (approved: boolean) => {
    setCards((prev) => prev.map((card) => ({ ...card, approved })))
  }

  const approvedCount = cards.filter((c) => c.approved).length

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

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Generate Cards</h1>
        {node && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Creating cards for: <span className="font-medium">{node.title}</span>
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
      {cards.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Generation Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Card Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Type
              </label>
              <select
                value={cardType}
                onChange={(e) =>
                  setCardType(e.target.value as 'flashcard' | 'multiple_choice' | 'mixed')
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="flashcard">Flashcards</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="mixed">Mixed (Both)</option>
              </select>
            </div>

            {/* Count */}
            <div>
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
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Generate Cards
              </>
            )}
          </button>
        </div>
      )}

      {/* Cards Preview */}
      {cards.length > 0 && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {approvedCount} of {cards.length} approved
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  Approve All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={() => handleToggleAll(false)}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Reject All
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRefineInput(!showRefineInput)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Refine
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || approvedCount === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {committing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Committing...
                  </>
                ) : (
                  <>Commit {approvedCount} Cards</>
                )}
              </button>
            </div>
          </div>

          {/* Refine Input */}
          {showRefineInput && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                How should the cards be improved?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder="e.g., Make questions more practical, add code examples..."
                  className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !refineFeedback.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {refining ? 'Refining...' : 'Apply'}
                </button>
              </div>
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-4">
            {cards.map((card, index) => (
              <CardPreview
                key={card.tempId}
                card={card}
                index={index}
                onUpdate={handleUpdateCard}
                onRemove={handleRemoveCard}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
