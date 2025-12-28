'use client'

import { useState } from 'react'
import type { GeneratedCardData } from './CardPreview'

/**
 * CardEditor Component (T043)
 *
 * Inline editor for generated cards.
 * Allows editing question, answer, and distractors.
 */

interface CardEditorProps {
  card: GeneratedCardData
  onSave: (updates: Partial<GeneratedCardData>) => void
  onCancel: () => void
}

export default function CardEditor({ card, onSave, onCancel }: CardEditorProps) {
  const [question, setQuestion] = useState(card.question)
  const [answer, setAnswer] = useState(card.answer)
  const [distractors, setDistractors] = useState<string[]>(card.distractors || ['', '', ''])

  const handleDistractorChange = (index: number, value: string) => {
    const newDistractors = [...distractors]
    newDistractors[index] = value
    setDistractors(newDistractors)
  }

  const handleSave = () => {
    const updates: Partial<GeneratedCardData> = {
      question: question.trim(),
      answer: answer.trim(),
    }

    if (card.cardType === 'multiple_choice') {
      updates.distractors = distractors.map((d) => d.trim()).filter((d) => d.length > 0)
    }

    onSave(updates)
  }

  const isValid =
    question.trim().length > 0 &&
    answer.trim().length > 0 &&
    (card.cardType !== 'multiple_choice' ||
      distractors.filter((d) => d.trim().length > 0).length >= 2)

  return (
    <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Editing Card</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            card.cardType === 'multiple_choice'
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}
        >
          {card.cardType === 'multiple_choice' ? 'Multiple Choice' : 'Flashcard'}
        </span>
      </div>

      {/* Question */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Question
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Enter the question..."
        />
      </div>

      {/* Answer */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Answer
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Enter the answer..."
        />
      </div>

      {/* Distractors for MC */}
      {card.cardType === 'multiple_choice' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Wrong Answers (Distractors)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            At least 2 distractors required for multiple choice questions.
          </p>
          <div className="space-y-2">
            {distractors.map((distractor, index) => (
              <input
                key={index}
                type="text"
                value={distractor}
                onChange={(e) => handleDistractorChange(index, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Wrong answer ${index + 1}...`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}
