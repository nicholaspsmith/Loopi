'use client'

/**
 * SkillNode Component (T030)
 *
 * Renders a single skill tree node with:
 * - Title and description
 * - Mastery indicator
 * - Card count badge
 */

export interface SkillNodeData {
  id: string
  title: string
  description: string | null
  depth: number
  path: string
  sortOrder: number
  isEnabled: boolean
  masteryPercentage: number
  cardCount: number
  children?: SkillNodeData[]
}

interface SkillNodeProps {
  node: SkillNodeData
  onSelect?: (nodeId: string) => void
  isSelected?: boolean
}

export default function SkillNode({ node, onSelect, isSelected = false }: SkillNodeProps) {
  // Depth-based styling
  const depthStyles = {
    1: 'text-lg font-semibold', // Category
    2: 'text-base font-medium', // Topic
    3: 'text-sm', // Subtopic
  }

  const textStyle = depthStyles[node.depth as keyof typeof depthStyles] || 'text-sm'

  // Mastery color
  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-blue-500'
    if (percentage >= 20) return 'bg-yellow-500'
    return 'bg-gray-300 dark:bg-gray-600'
  }

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
      `}
      onClick={() => onSelect?.(node.id)}
    >
      {/* Mastery Indicator */}
      <div className="flex-shrink-0">
        <div
          className={`w-3 h-3 rounded-full ${getMasteryColor(node.masteryPercentage)}`}
          title={`${node.masteryPercentage}% mastery`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${textStyle} text-gray-900 dark:text-gray-100 truncate`}>
            {node.title}
          </span>
          {node.cardCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
              {node.cardCount} cards
            </span>
          )}
        </div>
        {node.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {node.description}
          </p>
        )}
      </div>

      {/* Mastery Percentage */}
      <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
        {node.masteryPercentage}%
      </div>
    </div>
  )
}
