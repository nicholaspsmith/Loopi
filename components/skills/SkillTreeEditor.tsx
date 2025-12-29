'use client'

import { useState } from 'react'
import Link from 'next/link'
import SkillTree from './SkillTree'
import { type SkillNodeData } from './SkillNode'

/**
 * SkillTreeEditor Component (T032)
 *
 * Wrapper for SkillTree with editing capabilities:
 * - Enable/disable nodes via checkboxes
 * - Regenerate tree functionality
 * - Bulk operations
 */

interface SkillTreeEditorProps {
  goalId: string
  nodes: SkillNodeData[]
  onNodesChange?: (nodes: SkillNodeData[]) => void
  onRegenerate?: (feedback?: string) => Promise<void>
}

export default function SkillTreeEditor({
  goalId,
  nodes,
  onNodesChange,
  onRegenerate,
}: SkillTreeEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Handle node toggle
  const handleToggleNode = async (nodeId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/skill-tree/nodes/${nodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to update node')
      }

      // Update local state
      const updateNodes = (nodeList: SkillNodeData[]): SkillNodeData[] => {
        return nodeList.map((node) => {
          if (node.id === nodeId) {
            return { ...node, isEnabled: enabled }
          }
          if (node.children) {
            return { ...node, children: updateNodes(node.children) }
          }
          return node
        })
      }

      onNodesChange?.(updateNodes(nodes))
    } catch (error) {
      console.error('Failed to toggle node:', error)
    }
  }

  // Handle regenerate
  const handleRegenerate = async () => {
    if (!onRegenerate) return

    setIsRegenerating(true)
    try {
      await onRegenerate(feedback || undefined)
      setShowRegenerateDialog(false)
      setFeedback('')
    } catch (error) {
      console.error('Failed to regenerate:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  // Count enabled/disabled nodes
  const countNodes = (nodeList: SkillNodeData[]): { enabled: number; total: number } => {
    return nodeList.reduce(
      (acc, node) => {
        acc.total += 1
        if (node.isEnabled) acc.enabled += 1
        if (node.children) {
          const childCounts = countNodes(node.children)
          acc.enabled += childCounts.enabled
          acc.total += childCounts.total
        }
        return acc
      },
      { enabled: 0, total: 0 }
    )
  }

  const nodeCounts = countNodes(nodes)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isEditing
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isEditing ? 'Done Editing' : 'Edit Topics'}
          </button>

          {onRegenerate && (
            <button
              onClick={() => setShowRegenerateDialog(true)}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {selectedNodeId && (
            <Link
              href={`/goals/${goalId}/generate?nodeId=${selectedNodeId}`}
              className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Generate Cards
            </Link>
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {nodeCounts.enabled} of {nodeCounts.total} topics enabled
          </span>
        </div>
      </div>

      {/* Skill Tree */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <SkillTree
          nodes={nodes}
          isEditing={isEditing}
          onToggleNode={handleToggleNode}
          onSelectNode={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* Regenerate Dialog */}
      {showRegenerateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Regenerate Skill Tree
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will replace your current skill tree with a new automatically generated one. Any
              flashcards linked to the old tree will be unlinked.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feedback (optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'More detail on networking', 'Simpler breakdown', 'Focus on practical skills'"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRegenerateDialog(false)
                  setFeedback('')
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isRegenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isRegenerating && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
