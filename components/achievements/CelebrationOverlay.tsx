'use client'

import { useEffect, useCallback, useState } from 'react'
import confetti from 'canvas-confetti'

/**
 * CelebrationOverlay Component (T076)
 *
 * Shows celebration animation when achievements are unlocked.
 * Uses canvas-confetti for particle effects.
 */

interface UnlockedAchievement {
  key: string
  title: string
  description: string
  icon: string
}

interface TitleChange {
  oldTitle: string
  newTitle: string
}

interface CelebrationOverlayProps {
  achievements: UnlockedAchievement[]
  titleChange: TitleChange | null
  onDismiss: () => void
}

export default function CelebrationOverlay({
  achievements,
  titleChange,
  onDismiss,
}: CelebrationOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const showConfetti = useCallback(() => {
    // Left side burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.25, y: 0.6 },
      colors: ['#9333ea', '#3b82f6', '#22c55e', '#f59e0b'],
    })

    // Right side burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.75, y: 0.6 },
      colors: ['#9333ea', '#3b82f6', '#22c55e', '#f59e0b'],
    })
  }, [])

  useEffect(() => {
    if (isVisible) {
      showConfetti()
    }
  }, [isVisible, currentIndex, showConfetti])

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (titleChange && currentIndex === achievements.length - 1) {
      setCurrentIndex(achievements.length) // Show title change
    } else {
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300)
  }

  if (!isVisible) return null

  const showingTitleChange = currentIndex >= achievements.length && titleChange
  const currentAchievement = !showingTitleChange ? achievements[currentIndex] : null

  const totalItems = achievements.length + (titleChange ? 1 : 0)
  const showNextButton = currentIndex < totalItems - 1

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleDismiss}
    >
      <div
        className={`
          bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4
          shadow-2xl transform transition-all duration-300
          ${isVisible ? 'scale-100' : 'scale-95'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {currentAchievement ? (
          // Achievement unlocked view
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">{currentAchievement.icon}</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Achievement Unlocked!
              </h2>
              <h3 className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                {currentAchievement.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {currentAchievement.description}
              </p>
            </div>

            {/* Progress indicator */}
            {totalItems > 1 && (
              <div className="flex justify-center gap-2 mb-6">
                {Array.from({ length: totalItems }).map((_, i) => (
                  <div
                    key={i}
                    className={`
                      w-2 h-2 rounded-full transition-colors
                      ${i === currentIndex ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}
                    `}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              {showNextButton ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Continue
                </button>
              )}
            </div>
          </>
        ) : showingTitleChange ? (
          // Title upgrade view
          <>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Title Upgraded!
              </h2>
              <div className="flex items-center justify-center gap-3 my-4">
                <span className="text-gray-500 dark:text-gray-400 line-through">
                  {titleChange.oldTitle}
                </span>
                <span className="text-2xl">→</span>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  {titleChange.newTitle}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Your dedication has been recognized!
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleDismiss}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
