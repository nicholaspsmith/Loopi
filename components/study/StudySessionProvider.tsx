'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * StudySessionProvider Component (T058)
 *
 * React Context for managing study session state.
 * Per research.md: session state is client-side, not persisted server-side.
 */

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  nodeId: string
  nodeTitle: string
  fsrsState: {
    state: string
    due: string
    stability: number
    difficulty: number
  }
}

interface CardResponse {
  cardId: string
  rating: number
  timeMs: number
  correct?: boolean
}

interface StudySession {
  sessionId: string
  goalId: string
  mode: 'flashcard' | 'multiple_choice' | 'timed' | 'mixed'
  cards: StudyCard[]
  currentIndex: number
  responses: CardResponse[]
  startedAt: Date
  // Timed mode
  timeRemaining?: number
  score?: number
  timedSettings?: {
    durationSeconds: number
    pointsPerCard: number
  }
}

interface SessionSummary {
  cardsStudied: number
  averageRating: number
  timeSpent: number
  retentionRate: number
}

interface StudySessionContextType {
  session: StudySession | null
  isLoading: boolean
  error: string | null
  startSession: (
    goalId: string,
    mode: 'flashcard' | 'multiple_choice' | 'timed' | 'mixed',
    nodeId?: string
  ) => Promise<void>
  rateCard: (rating: 1 | 2 | 3 | 4, responseTimeMs: number, correct?: boolean) => Promise<void>
  nextCard: () => void
  completeSession: () => Promise<SessionSummary | null>
  getCurrentCard: () => StudyCard | null
  getProgress: () => { current: number; total: number; percentage: number }
}

const StudySessionContext = createContext<StudySessionContextType | null>(null)

export function useStudySession() {
  const context = useContext(StudySessionContext)
  if (!context) {
    throw new Error('useStudySession must be used within a StudySessionProvider')
  }
  return context
}

interface StudySessionProviderProps {
  children: ReactNode
}

export default function StudySessionProvider({ children }: StudySessionProviderProps) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSession = useCallback(
    async (
      goalId: string,
      mode: 'flashcard' | 'multiple_choice' | 'timed' | 'mixed',
      nodeId?: string
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/study/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goalId, mode, nodeId }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to start session')
        }

        const data = await response.json()

        setSession({
          sessionId: data.sessionId,
          goalId,
          mode,
          cards: data.cards,
          currentIndex: 0,
          responses: [],
          startedAt: new Date(),
          timedSettings: data.timedSettings,
          timeRemaining: data.timedSettings?.durationSeconds,
          score: mode === 'timed' ? 0 : undefined,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const rateCard = useCallback(
    async (rating: 1 | 2 | 3 | 4, responseTimeMs: number, correct?: boolean) => {
      if (!session) return

      const currentCard = session.cards[session.currentIndex]
      if (!currentCard) return

      try {
        // Send rating to server
        await fetch('/api/study/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: currentCard.id,
            rating,
            responseTimeMs,
            mode: session.mode,
          }),
        })

        // Update local state
        setSession((prev) => {
          if (!prev) return null
          return {
            ...prev,
            responses: [
              ...prev.responses,
              {
                cardId: currentCard.id,
                rating,
                timeMs: responseTimeMs,
                correct,
              },
            ],
          }
        })
      } catch (err) {
        console.error('Failed to rate card:', err)
      }
    },
    [session]
  )

  const nextCard = useCallback(() => {
    setSession((prev) => {
      if (!prev) return null
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      }
    })
  }, [])

  const completeSession = useCallback(async () => {
    if (!session) return null

    setIsLoading(true)

    try {
      const durationSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000)

      const response = await fetch('/api/study/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          goalId: session.goalId,
          mode: session.mode,
          durationSeconds,
          ratings: session.responses.map((r) => ({
            cardId: r.cardId,
            rating: r.rating,
          })),
          timedScore:
            session.mode === 'timed'
              ? {
                  correct: session.responses.filter((r) => r.correct).length,
                  total: session.responses.length,
                  bonusPoints: session.score || 0,
                }
              : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete session')
      }

      const data = await response.json()

      // Clear session
      setSession(null)

      return data.summary as SessionSummary
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [session])

  const getCurrentCard = useCallback(() => {
    if (!session) return null
    return session.cards[session.currentIndex] || null
  }, [session])

  const getProgress = useCallback(() => {
    if (!session) return { current: 0, total: 0, percentage: 0 }
    const current = session.currentIndex + 1
    const total = session.cards.length
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    return { current, total, percentage }
  }, [session])

  return (
    <StudySessionContext.Provider
      value={{
        session,
        isLoading,
        error,
        startSession,
        rateCard,
        nextCard,
        completeSession,
        getCurrentCard,
        getProgress,
      }}
    >
      {children}
    </StudySessionContext.Provider>
  )
}
