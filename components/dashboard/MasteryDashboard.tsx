'use client'

/**
 * MasteryDashboard Component (T064)
 *
 * Visual representation of skill tree with mastery levels.
 */

interface MasteryNode {
  id: string
  title: string
  depth: number
  mastery: number
  cardCount: number
  children?: MasteryNode[]
}

interface MasteryDashboardProps {
  nodes: MasteryNode[]
}

export default function MasteryDashboard({ nodes }: MasteryDashboardProps) {
  const renderNode = (node: MasteryNode, isLast: boolean = false) => {
    const barWidth = Math.max(5, node.mastery)
    const barColor =
      node.mastery >= 80 ? 'bg-green-500' : node.mastery >= 50 ? 'bg-yellow-500' : 'bg-red-500'

    return (
      <div key={node.id} className="mb-2">
        <div className="flex items-center gap-3">
          {/* Tree line prefix */}
          {node.depth > 0 && (
            <span className="text-gray-400 dark:text-gray-600 font-mono text-sm">
              {isLast ? '└─' : '├─'}
            </span>
          )}

          {/* Node title */}
          <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[150px]">
            {node.title}
          </span>

          {/* Mastery bar */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
              {node.mastery}%
            </span>
          </div>

          {/* Card count */}
          <span className="text-xs text-gray-500 dark:text-gray-500 w-16 text-right">
            {node.cardCount} cards
          </span>
        </div>

        {/* Render children with indentation */}
        {node.children && node.children.length > 0 && (
          <div className="ml-6">
            {node.children.map((child, index) =>
              renderNode(child, index === node.children!.length - 1)
            )}
          </div>
        )}
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No skill trees to display. Create a learning goal to get started.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Skill Mastery</h3>
      <div className="space-y-1">{nodes.map((node) => renderNode(node))}</div>
    </div>
  )
}
