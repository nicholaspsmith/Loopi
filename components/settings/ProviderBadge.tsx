'use client'

import type { AIProvider } from '@/lib/types/api-key'

interface ProviderBadgeProps {
  provider: AIProvider | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

/**
 * ProviderBadge Component
 *
 * Displays which AI provider was used for a message (Claude or Ollama)
 */
export default function ProviderBadge({
  provider,
  size = 'md',
  showTooltip = false,
}: ProviderBadgeProps) {
  if (!provider) {
    return null
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  // Provider-specific styling
  const providerConfig = {
    claude: {
      label: 'Claude',
      classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      ariaLabel: 'AI Provider: Claude',
      tooltip: 'Generated using your Claude API key',
    },
    ollama: {
      label: 'Ollama',
      classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ariaLabel: 'AI Provider: Ollama',
      tooltip: 'Generated using local Ollama (free)',
    },
  }

  const config = providerConfig[provider]

  return (
    <div className="relative inline-block">
      <span
        role="status"
        aria-label={config.ariaLabel}
        className={`
          inline-flex items-center rounded font-medium
          ${sizeClasses[size]}
          ${config.classes}
        `}
        title={showTooltip ? config.tooltip : undefined}
      >
        {config.label}
      </span>
    </div>
  )
}
