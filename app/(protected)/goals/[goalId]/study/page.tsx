'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import StudyModeSelector, { type StudyMode } from '@/components/study/StudyModeSelector'
import FlashcardMode from '@/components/study/FlashcardMode'
import MultipleChoiceModeWrapper from '@/components/study/MultipleChoiceModeWrapper'
import TimedChallengeMode from '@/components/study/TimedChallengeMode'
import MixedMode from '@/components/study/MixedMode'
import GuidedStudyFlow from '@/components/study/GuidedStudyFlow'
import StudySummary from '@/components/study/StudySummary'

/**
 * Study Session Page (T059)
 *
 * Main study interface for a goal.
 * Supports flashcard, multiple choice, timed, and mixed modes.
 */

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  distractorsJobId?: string
  nodeId: string
  nodeTitle: string
  fsrsState: {
    state: string
    due: string
    stability: number
    difficulty: number
  }
}

interface SessionData {
  sessionId: string
  mode: string
  isGuided?: boolean
  isTreeComplete?: boolean
  cards: StudyCard[]
  timedSettings?: {
    durationSeconds: number
    pointsPerCard: number
  }
  // Guided mode fields (T027)
  currentNode?: {
    id: string
    title: string
    path: string
  }
  nodeProgress?: {
    completedInNode: number
    totalInNode: number
  }
}

interface SessionSummary {
  cardsStudied: number
  averageRating: number
  timeSpent: number
  retentionRate: number
}

export default function StudyPage({ params }: { params: Promise<{ goalId: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [goalId, setGoalId] = useState<string | null>(null)
  const [goalTitle, setGoalTitle] = useState<string>('')

  // Session state
  const [selectedMode, setSelectedMode] = useState<StudyMode>('flashcard')
  const [session, setSession] = useState<SessionData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<{ cardId: string; rating: number }[]>([])
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  // Guided mode state (T027)
  const [isGuidedMode, setIsGuidedMode] = useState(false)
  const [isTreeComplete, setIsTreeComplete] = useState(false)

  // Node study state (T040-T041)
  const [correctCount, setCorrectCount] = useState(0)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<'select' | 'study' | 'complete'>('select')

  // Extract URL params for node study (T040-T041)
  const nodeId = searchParams.get('nodeId')
  const cardLimit = searchParams.get('cardLimit')
  const isNodeStudy = !!nodeId

  // Check for guided mode from URL (T027)
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'guided') {
      setIsGuidedMode(true)
      setSelectedMode('flashcard') // Guided mode uses flashcard presentation
    }
  }, [searchParams])

  // Unwrap params
  useEffect(() => {
    params.then((p) => setGoalId(p.goalId))
  }, [params])

  // Fetch goal info
  useEffect(() => {
    if (!goalId) return

    const fetchGoal = async () => {
      try {
        const response = await fetch(`/api/goals/${goalId}`)
        if (response.ok) {
          const data = await response.json()
          setGoalTitle(data.title)
        }
      } catch {
        // Ignore errors - title is optional
      }
    }

    fetchGoal()
  }, [goalId])

  // Start study session
  const handleStartSession = useCallback(async () => {
    if (!goalId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/study/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          mode: selectedMode,
          isGuided: isGuidedMode, // Pass guided flag separately
          nodeId: nodeId || undefined,
          includeChildren: nodeId ? true : undefined,
          cardLimit: cardLimit ? parseInt(cardLimit, 10) : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start session')
      }

      const data: SessionData = await response.json()

      // Handle guided mode response (T027)
      if (data.isGuided && !data.sessionId) {
        // No more nodes or cards being generated
        setIsTreeComplete(data.isTreeComplete ?? false)
        setPhase('complete')
        return
      }

      if (data.cards.length === 0) {
        throw new Error('No cards available. Generate some cards first.')
      }

      setSession(data)
      setCurrentIndex(0)
      setResponses([])
      setCorrectCount(0)
      setStartTime(new Date())
      setPhase('study')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }, [goalId, isGuidedMode, selectedMode, nodeId, cardLimit])

  // Note: Guided mode no longer auto-starts - users choose their study mode first
  // The isGuidedMode flag controls node selection, not presentation mode

  // Handle continue to next node (T027)
  const handleContinueToNextNode = useCallback(async () => {
    setPhase('select')
    setSession(null)
    setSummary(null)
    setIsTreeComplete(false)
    // The auto-start effect will trigger the next session
  }, [])

  // Handle return to goal (T027)
  const handleReturnToGoal = useCallback(() => {
    router.push(`/goals/${goalId}`)
  }, [router, goalId])

  // Complete session (moved before handleRate to fix dependency issue)
  const handleCompleteSession = useCallback(() => {
    if (!session || !goalId || !startTime) return

    // Show completion screen immediately for instant feedback
    setPhase('complete')

    // Send completion to server in background (fire-and-forget)
    const durationSeconds = Math.round((Date.now() - startTime.getTime()) / 1000)

    fetch('/api/study/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        goalId,
        mode: session.mode,
        durationSeconds,
        ratings: responses,
      }),
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        throw new Error('Failed to complete session')
      })
      .then((data) => {
        setSummary(data.summary)
      })
      .catch((err) => {
        console.error('Failed to complete session:', err)
      })
  }, [session, goalId, startTime, responses])

  // Rate card and move to next
  const handleRate = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      if (!session) return

      const currentCard = session.cards[currentIndex]
      if (!currentCard) return

      // Track correct/incorrect for node study (T040)
      if (isNodeStudy) {
        // For flashcard mode: rating >= 3 is correct
        // For MC mode: rating of 3 is correct
        if (session.mode === 'multiple_choice') {
          if (rating === 3) {
            setCorrectCount((prev) => prev + 1)
          }
        } else {
          // Flashcard mode or other modes
          if (rating >= 3) {
            setCorrectCount((prev) => prev + 1)
          }
        }
      }

      // Send rating to server (fire-and-forget for instant UI feedback)
      fetch('/api/study/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          rating,
          responseTimeMs: Date.now() - (startTime?.getTime() || Date.now()),
          mode: session.mode,
        }),
      }).catch((err) => console.error('Failed to rate card:', err))

      // Update local state immediately
      setResponses((prev) => [...prev, { cardId: currentCard.id, rating }])

      // Move to next card or complete
      if (currentIndex + 1 >= session.cards.length) {
        handleCompleteSession()
      } else {
        setCurrentIndex((prev) => prev + 1)
      }
    },
    [session, currentIndex, startTime, handleCompleteSession, isNodeStudy]
  )

  // Handle timed mode completion
  const handleTimedComplete = async (score: number, correct: number, total: number) => {
    if (!session || !goalId || !startTime) return

    setLoading(true)

    try {
      const durationSeconds = Math.round((Date.now() - startTime.getTime()) / 1000)

      const response = await fetch('/api/study/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          goalId,
          mode: session.mode,
          durationSeconds,
          ratings: responses,
          timedScore: { correct, total, bonusPoints: score },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSummary({
          ...data.summary,
          timedScore: score,
        } as SessionSummary & { timedScore: number })
      }

      setPhase('complete')
    } catch (err) {
      console.error('Failed to complete timed session:', err)
      setPhase('complete')
    } finally {
      setLoading(false)
    }
  }

  // Handle timed mode rating
  const handleTimedRate = async (cardId: string, rating: 1 | 2 | 3 | 4, responseTimeMs: number) => {
    try {
      await fetch('/api/study/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          rating,
          responseTimeMs,
          mode: 'timed',
        }),
      })
      setResponses((prev) => [...prev, { cardId, rating }])
    } catch (err) {
      console.error('Failed to rate card:', err)
    }
  }

  // Render mode selection
  if (phase === 'select') {
    return (
      <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {goalId && (
            <Link
              href={`/goals/${goalId}`}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 mb-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Goal
            </Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Study Session</h1>
          {goalTitle && <p className="text-gray-600 dark:text-gray-400 mt-1">{goalTitle}</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Mode Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Choose Study Mode
          </h2>
          <StudyModeSelector
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            disabled={loading}
          />
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartSession}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Starting...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Studying
            </>
          )}
        </button>
      </div>
    )
  }

  // Render study session
  if (phase === 'study' && session) {
    const currentCard = session.cards[currentIndex]

    // Timed mode uses its own component
    if (session.mode === 'timed' && session.timedSettings) {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <TimedChallengeMode
            cards={session.cards}
            durationSeconds={session.timedSettings.durationSeconds}
            pointsPerCard={session.timedSettings.pointsPerCard}
            onRate={handleTimedRate}
            onComplete={handleTimedComplete}
          />
        </div>
      )
    }

    // Mixed mode
    if (session.mode === 'mixed') {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <MixedMode cards={session.cards} currentIndex={currentIndex} onRate={handleRate} />
        </div>
      )
    }

    // Flashcard mode
    if (session.mode === 'flashcard' && currentCard) {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <FlashcardMode
            question={currentCard.question}
            answer={currentCard.answer}
            onRate={handleRate}
            cardNumber={currentIndex + 1}
            totalCards={session.cards.length}
          />
        </div>
      )
    }

    // Multiple choice mode
    if (session.mode === 'multiple_choice' && currentCard) {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <MultipleChoiceModeWrapper
            question={currentCard.question}
            answer={currentCard.answer}
            distractors={currentCard.distractors}
            distractorsJobId={currentCard.distractorsJobId}
            onRate={(rating, _responseTimeMs) => handleRate(rating)}
            cardNumber={currentIndex + 1}
            totalCards={session.cards.length}
          />
        </div>
      )
    }
  }

  // Render completion summary
  if (phase === 'complete') {
    // Show GuidedStudyFlow for guided mode (T027)
    if (isGuidedMode) {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <GuidedStudyFlow
            currentNode={session?.currentNode || null}
            nodeProgress={session?.nodeProgress || { completedInNode: 0, totalInNode: 0 }}
            isTreeComplete={isTreeComplete}
            onContinue={handleContinueToNextNode}
            onReturn={handleReturnToGoal}
          />
        </div>
      )
    }

    // Show StudySummary for node study (T041)
    if (isNodeStudy) {
      return (
        <div className="flex flex-col min-h-screen p-6 max-w-4xl mx-auto">
          <StudySummary
            cardsCompleted={responses.length}
            totalSelected={session?.cards.length || 0}
            correctCount={correctCount}
            goalId={goalId!}
            onDone={() => router.push(`/goals/${goalId}`)}
          />
        </div>
      )
    }

    // Regular completion summary
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-2xl mx-auto">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Session Complete!
        </h1>

        {summary && (
          <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.cardsStudied}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cards Studied</p>
              </div>
              <div className="text-center p-4">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {summary.retentionRate}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</p>
              </div>
              <div className="text-center p-4">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.floor(summary.timeSpent / 60)}m {summary.timeSpent % 60}s
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Time Spent</p>
              </div>
              <div className="text-center p-4">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {summary.averageRating.toFixed(1)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => {
              setPhase('select')
              setSession(null)
              setSummary(null)
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Study Again
          </button>
          <Link
            href={`/goals/${goalId}`}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Goal
          </Link>
        </div>
      </div>
    )
  }

  // Loading fallback
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
