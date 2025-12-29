'use client'

import { useState } from 'react'
import Link from 'next/link'
import AIGenerationDialog from './AIGenerationDialog'

/**
 * DeckActions Component
 *
 * Client component for deck page actions (Create Deck, Auto Generation).
 * Wrapped as client component to handle generation dialog state.
 *
 * Maps to T070 in Phase 6
 */

interface DeckActionsProps {
  totalDecks: number
  maxDecks: number
}

export default function DeckActions({ totalDecks, maxDecks }: DeckActionsProps) {
  const [showAIDialog, setShowAIDialog] = useState(false)
  const isAtLimit = totalDecks >= maxDecks

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowAIDialog(true)}
          className="px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isAtLimit}
          data-testid="ai-generate-button"
          aria-label="Generate deck automatically"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>Auto Generate</span>
          </div>
        </button>
        <Link
          href="/decks/new"
          className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
            isAtLimit ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
          aria-disabled={isAtLimit}
        >
          Create Deck
        </Link>
      </div>

      <AIGenerationDialog isOpen={showAIDialog} onClose={() => setShowAIDialog(false)} />
    </>
  )
}
