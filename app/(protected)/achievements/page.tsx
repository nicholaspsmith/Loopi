'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AchievementCard from '@/components/achievements/AchievementCard'
import TitleBadge from '@/components/achievements/TitleBadge'

/**
 * Achievements Page (T077)
 *
 * Shows all achievements (locked and unlocked) and title progression.
 */

interface AchievementDefinition {
  key: string
  title: string
  description: string
  icon: string
  category: 'mastery' | 'progress' | 'performance' | 'consistency'
  requirement: string
}

interface UserAchievement {
  key: string
  title: string
  description: string
  icon: string
  unlockedAt: string
  metadata: Record<string, unknown> | null
}

interface TitleDefinition {
  title: string
  rank: number
  requirement: string
}

interface AchievementsData {
  achievements: UserAchievement[]
  totalUnlocked: number
  totalAvailable: number
  currentTitle: {
    title: string
    earnedAt: string
  }
  nextTitle: {
    title: string
    requirement: string
    progress: number
  } | null
}

interface DefinitionsData {
  achievements: AchievementDefinition[]
  titles: TitleDefinition[]
}

const categoryOrder: ('mastery' | 'progress' | 'performance' | 'consistency')[] = [
  'mastery',
  'progress',
  'performance',
  'consistency',
]

const categoryLabels = {
  mastery: 'Card Mastery',
  progress: 'Goal Progress',
  performance: 'Performance',
  consistency: 'Consistency',
}

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null)
  const [definitions, setDefinitions] = useState<DefinitionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [achievementsRes, definitionsRes] = await Promise.all([
          fetch('/api/achievements'),
          fetch('/api/achievements/definitions'),
        ])

        if (!achievementsRes.ok || !definitionsRes.ok) {
          throw new Error('Failed to load achievements')
        }

        const achievementsData = await achievementsRes.json()
        const definitionsData = await definitionsRes.json()

        setData(achievementsData)
        setDefinitions(definitionsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load achievements')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error || !data || !definitions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{error || 'Failed to load'}</h1>
        <Link href="/goals" className="text-blue-600 hover:underline">
          Back to Goals
        </Link>
      </div>
    )
  }

  // Build combined list with unlock status
  const allAchievements = definitions.achievements.map((def) => {
    const unlocked = data.achievements.find((a) => a.key === def.key)
    return {
      ...def,
      isUnlocked: !!unlocked,
      unlockedAt: unlocked?.unlockedAt,
    }
  })

  // Filter by category
  const filteredAchievements =
    activeCategory === 'all'
      ? allAchievements
      : allAchievements.filter((a) => a.category === activeCategory)

  // Sort: unlocked first, then by category order
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) {
      return a.isUnlocked ? -1 : 1
    }
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  })

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Achievements</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your learning milestones and earn titles
        </p>
      </div>

      {/* Title Section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your Title</p>
            <TitleBadge
              title={data.currentTitle.title}
              size="lg"
              showProgress
              nextTitle={data.nextTitle}
            />
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Achievements</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.totalUnlocked}{' '}
              <span className="text-lg text-gray-400">/ {data.totalAvailable}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Title Ladder */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Title Ladder
        </h2>
        <div className="flex flex-wrap gap-3">
          {definitions.titles.map((titleDef) => {
            const isCurrentOrPast =
              definitions.titles.findIndex((t) => t.title === data.currentTitle.title) >=
              definitions.titles.findIndex((t) => t.title === titleDef.title)

            return (
              <div
                key={titleDef.title}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border
                  ${
                    titleDef.title === data.currentTitle.title
                      ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                      : isCurrentOrPast
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                  }
                `}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {titleDef.title}
                </span>
                {titleDef.title === data.currentTitle.title && (
                  <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                activeCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            All ({allAchievements.length})
          </button>
          {categoryOrder.map((cat) => {
            const count = allAchievements.filter((a) => a.category === cat).length
            const unlockedCount = allAchievements.filter(
              (a) => a.category === cat && a.isUnlocked
            ).length

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    activeCategory === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {categoryLabels[cat]} ({unlockedCount}/{count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.key}
            achievementKey={achievement.key}
            title={achievement.title}
            description={achievement.description}
            icon={achievement.icon}
            category={achievement.category}
            requirement={achievement.requirement}
            isUnlocked={achievement.isUnlocked}
            unlockedAt={achievement.unlockedAt}
          />
        ))}
      </div>

      {/* Empty state */}
      {sortedAchievements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No achievements in this category.</p>
        </div>
      )}
    </div>
  )
}
