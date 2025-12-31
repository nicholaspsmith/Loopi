'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * TimedChallengeMode Component (T056)
 *
 * 5-minute speed challenge with scoring.
 * Mix of flashcards and multiple choice.
 */

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  distractorsJobId?: string
}

interface TimedChallengeModeProps {
  cards: StudyCard[]
  durationSeconds: number
  pointsPerCard: number
  onRate: (cardId: string, rating: 1 | 2 | 3 | 4, responseTimeMs: number) => void
  onComplete: (score: number, correct: number, total: number) => void
}

// Fisher-Yates shuffle (called outside render)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Create shuffled options
function createShuffledOptions(answer: string, distractors?: string[]): string[] {
  const allOptions = [answer, ...(distractors || []).slice(0, 3)]
  return shuffleArray(allOptions)
}

export default function TimedChallengeMode({
  cards,
  durationSeconds,
  pointsPerCard,
  onRate,
  onComplete,
}: TimedChallengeModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)

  // Use refs for time tracking and options (avoid state-based re-renders)
  // Accessing refs during render is safe for reading/writing cached values
  // This is a common memoization pattern - Date.now() only runs once on mount
  const cardStartTimeRef = useRef<number>(Date.now())
  const prevCardIdRef = useRef<string>('')
  const optionsRef = useRef<string[]>([])

  const currentCard = cards[currentIndex]
  const isComplete = currentIndex >= cards.length || timeRemaining <= 0

  // Check if MC card has valid distractors (fallback to flashcard if not ready)
  const hasValidDistractors =
    currentCard?.distractors && currentCard.distractors.length >= 3 && !currentCard.distractorsJobId
  const effectiveCardType =
    currentCard?.cardType === 'multiple_choice' && hasValidDistractors
      ? 'multiple_choice'
      : 'flashcard'

  // Compute options: only reshuffle when card changes
  if (
    currentCard &&
    effectiveCardType === 'multiple_choice' &&
    prevCardIdRef.current !== currentCard.id
  ) {
    prevCardIdRef.current = currentCard.id
    optionsRef.current = createShuffledOptions(currentCard.answer, currentCard.distractors)
  }
  const options = effectiveCardType === 'multiple_choice' ? optionsRef.current : []

  // Timer countdown
  useEffect(() => {
    if (isComplete) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isComplete])

  // Complete when time runs out or all cards done
  useEffect(() => {
    if (isComplete) {
      onComplete(score, correct, currentIndex)
    }
  }, [isComplete, score, correct, currentIndex, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const calculatePoints = (responseTimeMs: number, isCorrect: boolean) => {
    if (!isCorrect) return 0
    // Base points + speed bonus (faster = more bonus, max 50% bonus for < 2s)
    const speedBonus = Math.max(0, 1 - responseTimeMs / 10000) * pointsPerCard * 0.5
    return Math.round(pointsPerCard + speedBonus)
  }

  const handleAnswer = (isCorrect: boolean) => {
    const responseTimeMs = Date.now() - cardStartTimeRef.current
    const earnedPoints = calculatePoints(responseTimeMs, isCorrect)

    setScore((prev) => prev + earnedPoints)
    if (isCorrect) setCorrect((prev) => prev + 1)

    onRate(currentCard.id, isCorrect ? 3 : 1, responseTimeMs)

    setShowResult(true)
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1)
      cardStartTimeRef.current = Date.now()
      setSelectedOption(null)
      setShowResult(false)
      setIsFlipped(false)
    }, 800)
  }

  const handleMCSelect = (option: string) => {
    if (showResult) return
    setSelectedOption(option)
    handleAnswer(option === currentCard.answer)
  }

  const handleFlashcardRate = (rating: 1 | 2 | 3 | 4) => {
    handleAnswer(rating >= 3)
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Time&apos;s Up!
        </h2>
        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-4">{score} pts</div>
        <div className="text-gray-600 dark:text-gray-400 space-y-1 text-center">
          <p>
            {correct} of {currentIndex} correct (
            {currentIndex > 0 ? Math.round((correct / currentIndex) * 100) : 0}%)
          </p>
          <p>Time: {formatTime(durationSeconds - timeRemaining)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Timer and Score Header */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <div
          className={`text-2xl font-mono font-bold ${
            timeRemaining <= 30
              ? 'text-red-600 dark:text-red-400 animate-pulse'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {formatTime(timeRemaining)}
        </div>
        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{score} pts</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-2xl h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-1000"
          style={{ width: `${(timeRemaining / durationSeconds) * 100}%` }}
        />
      </div>

      {/* Card Content */}
      {effectiveCardType === 'multiple_choice' ? (
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 mb-4">
            <p className="text-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {currentCard.question}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleMCSelect(option)}
                disabled={showResult}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  showResult
                    ? option === currentCard.answer
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-500'
                      : option === selectedOption
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
                        : 'border-gray-200 dark:border-gray-700 opacity-50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 bg-white dark:bg-gray-800'
                }`}
              >
                <span className="text-gray-900 dark:text-gray-100">{option}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <div
            onClick={() => !isFlipped && setIsFlipped(true)}
            className={`min-h-[200px] rounded-xl border-2 p-6 cursor-pointer transition-all ${
              isFlipped
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            {!isFlipped ? (
              <div className="text-center">
                <p className="text-lg text-gray-900 dark:text-gray-100 mb-4">
                  {currentCard.question}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Tap to flip</p>
              </div>
            ) : (
              <p className="text-lg text-gray-900 dark:text-gray-100">{currentCard.answer}</p>
            )}
          </div>
          {isFlipped && !showResult && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleFlashcardRate(1)}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Wrong
              </button>
              <button
                onClick={() => handleFlashcardRate(3)}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Correct
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
