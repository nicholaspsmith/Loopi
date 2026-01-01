'use client'

import SkillNode, { type SkillNodeData } from './SkillNode'

/**
 * SkillTree Component (T031)
 *
 * Renders a hierarchical skill tree with:
 * - Nested node display
 * - Collapsible sections
 * - Selection handling
 */

interface SkillTreeProps {
  nodes: SkillNodeData[]
  onSelectNode?: (nodeId: string) => void
  selectedNodeId?: string | null
  highlightedNodeIds?: string[]
}

export default function SkillTree({
  nodes,
  onSelectNode,
  selectedNodeId = null,
  highlightedNodeIds = [],
}: SkillTreeProps) {
  // Render a node and its children recursively
  const renderNode = (node: SkillNodeData, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isHighlighted = highlightedNodeIds.includes(node.id)

    return (
      <div key={node.id} className="relative">
        {/* Connection line for nested nodes */}
        {level > 0 && (
          <div
            className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
            style={{ left: `${(level - 1) * 24 + 16}px` }}
          />
        )}

        <div style={{ paddingLeft: `${level * 24}px` }}>
          <SkillNode
            node={node}
            onSelect={onSelectNode}
            isSelected={selectedNodeId === node.id}
            isHighlighted={isHighlighted}
          />
        </div>

        {/* Children */}
        {hasChildren && (
          <div className="mt-1">{node.children!.map((child) => renderNode(child, level + 1))}</div>
        )}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg
          className="w-12 h-12 mx-auto mb-3 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        <p>No skill tree generated yet</p>
      </div>
    )
  }

  return <div className="space-y-1">{nodes.map((node) => renderNode(node))}</div>
}
