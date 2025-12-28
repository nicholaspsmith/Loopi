'use client'

import { useState } from 'react'
import CardEditor from './CardEditor'

/**
 * CardPreview Component (T042)
 *
 * Displays a generated card with options to:
 * - Toggle approval (checkbox)
 * - Edit inline
 * - View answer
 */

export interface GeneratedCardData {
  tempId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  approved: boolean
  edited: boolean
}

interface CardPreviewProps {
  card: GeneratedCardData
  index: number
  onUpdate: (tempId: string, updates: Partial<GeneratedCardData>) => void
  onRemove: (tempId: string) => void
}

export default function CardPreview({ card, index, onUpdate, onRemove }: CardPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  const handleToggleApproval = () => {
    onUpdate(card.tempId, { approved: !card.approved })
  }

  const handleSaveEdit = (updates: Partial<GeneratedCardData>) => {
    onUpdate(card.tempId, { ...updates, edited: true })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  if (isEditing) {
    return <CardEditor card={card} onSave={handleSaveEdit} onCancel={handleCancelEdit} />
  }

  return (
    <div
      className={`border rounded-lg p-4 ${
        card.approved
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      } transition-colors`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={card.approved}
              onChange={handleToggleApproval}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Card {index + 1}
            </span>
          </label>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              card.cardType === 'multiple_choice'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            {card.cardType === 'multiple_choice' ? 'Multiple Choice' : 'Flashcard'}
          </span>
          {card.edited && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
              Edited
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onRemove(card.tempId)}
            className="text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Question</p>
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{card.question}</p>
      </div>

      {/* Answer (collapsible) */}
      <div>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAnswer ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>

        {showAnswer && (
          <div className="mt-2 pl-5 border-l-2 border-gray-300 dark:border-gray-600">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{card.answer}</p>

            {/* Distractors for MC */}
            {card.cardType === 'multiple_choice' && card.distractors && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wrong Answers (Distractors)
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  {card.distractors.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
