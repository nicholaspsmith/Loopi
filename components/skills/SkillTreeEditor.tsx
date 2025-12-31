'use client'

import { useState } from 'react'
import Link from 'next/link'
import SkillTree from './SkillTree'
import { type SkillNodeData } from './SkillNode'

/**
 * SkillTreeEditor Component (T032)
 *
 * Wrapper for SkillTree with card generation capabilities.
 * Shows skill tree and allows generating more cards for mastered nodes.
 */

interface SkillTreeEditorProps {
  goalId: string
  nodes: SkillNodeData[]
}

export default function SkillTreeEditor({ goalId, nodes }: SkillTreeEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Count enabled nodes (all nodes are enabled by default now)
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

  // Find a node by ID in the tree
  const findNode = (nodeList: SkillNodeData[], nodeId: string): SkillNodeData | null => {
    for (const node of nodeList) {
      if (node.id === nodeId) return node
      if (node.children) {
        const found = findNode(node.children, nodeId)
        if (found) return found
      }
    }
    return null
  }

  // Get selected node data
  const selectedNode = selectedNodeId ? findNode(nodes, selectedNodeId) : null

  // Only show Generate Cards if node is fully mastered (100%) or has no cards
  const canGenerateCards =
    selectedNode && (selectedNode.masteryPercentage === 100 || selectedNode.cardCount === 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {nodeCounts.total} topics
          </span>
        </div>

        <div className="flex items-center gap-4">
          {canGenerateCards && (
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
              Generate More Cards
            </Link>
          )}
        </div>
      </div>

      {/* Skill Tree */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <SkillTree nodes={nodes} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
      </div>
    </div>
  )
}
