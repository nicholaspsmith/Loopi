'use client'

import { useEffect, useState } from 'react'
import AchievementCard from './AchievementCard'
import type { AchievementDefinition } from '@/lib/db/operations/achievements'
import type { TitleDefinition } from '@/lib/db/operations/user-titles'

/**
 * AchievementsModal Component
 *
 * Displays the full achievements view with title progression and achievement grid.
 * Follows the modal pattern from DuplicateWarningModal.tsx
 *
 * Features:
 * - Title ladder showing progression from Novice to Grandmaster
 * - Grid of achievement cards (locked/unlocked states)
 * - Close button and backdrop click to close
 * - Escape key to close
 * - Responsive: full screen on mobile, centered dialog on desktop
 */

interface UserAchievement {
  achievementKey: string
  unlockedAt: string
}

interface AchievementsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AchievementsModal({ isOpen, onClose }: AchievementsModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [achievementDefs, setAchievementDefs] = useState<AchievementDefinition[]>([])
  const [titles, setTitles] = useState<TitleDefinition[]>([])
  const [currentTitle, setCurrentTitle] = useState<string>('Novice')

  // Fetch data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [achievementsResponse, definitionsResponse] = await Promise.all([
          fetch('/api/achievements'),
          fetch('/api/achievements/definitions'),
        ])

        if (!achievementsResponse.ok || !definitionsResponse.ok) {
          throw new Error('Failed to load achievements')
        }

        const achievementsData = await achievementsResponse.json()
        const definitionsData = await definitionsResponse.json()

        setUserAchievements(achievementsData.achievements)
        setAchievementDefs(definitionsData.achievements)
        setTitles(definitionsData.titles)
        setCurrentTitle(achievementsData.currentTitle.title)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load achievements')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen])

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      data-testid="achievements-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8"
        data-testid="achievements-modal"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2
            id="achievements-modal-title"
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
          >
            Achievements & Titles
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close modal"
            data-testid="achievements-modal-close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Title Ladder */}
              <section className="mb-8">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Title Progression
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {titles.map((title) => {
                    const isCurrentTitle = title.title === currentTitle
                    const currentRank = titles.find((t) => t.title === currentTitle)?.rank || 1
                    const isUnlocked = title.rank <= currentRank

                    return (
                      <div
                        key={title.title}
                        className={`
                          relative rounded-lg border-2 p-4 transition-all duration-200
                          ${isCurrentTitle ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}
                          ${isUnlocked ? 'opacity-100' : 'opacity-50'}
                        `}
                      >
                        {isCurrentTitle && (
                          <div className="absolute top-2 right-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white font-medium">
                              Current
                            </span>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-3xl mb-2">
                            {isUnlocked ? getTitleIcon(title.title) : '🔒'}
                          </div>
                          <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">
                            {title.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {title.requirement}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Achievements Grid */}
              <section>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Achievements ({userAchievements.length}/{achievementDefs.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementDefs.map((def) => {
                    const userAchievement = userAchievements.find(
                      (a) => a.achievementKey === def.key
                    )
                    const isUnlocked = !!userAchievement

                    return (
                      <AchievementCard
                        key={def.key}
                        achievementKey={def.key}
                        title={def.title}
                        description={def.description}
                        icon={def.icon}
                        category={def.category}
                        requirement={def.requirement}
                        isUnlocked={isUnlocked}
                        unlockedAt={userAchievement?.unlockedAt}
                      />
                    )
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get title icon
function getTitleIcon(title: string): string {
  const icons: Record<string, string> = {
    Novice: '🌱',
    Apprentice: '📗',
    Practitioner: '📘',
    Specialist: '📕',
    Expert: '⭐',
    Master: '👑',
    Grandmaster: '💎',
  }
  return icons[title] || '🏅'
}
