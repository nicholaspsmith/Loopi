'use client'

/**
 * StudyModeSelector Component (T053)
 *
 * Allows users to select study mode before starting a session.
 */

export type StudyMode = 'flashcard' | 'multiple_choice' | 'timed' | 'mixed'

interface StudyModeSelectorProps {
  selectedMode: StudyMode
  onModeChange: (mode: StudyMode) => void
  disabled?: boolean
}

const modes: { id: StudyMode; name: string; description: string; icon: string }[] = [
  {
    id: 'flashcard',
    name: 'Flashcards',
    description: 'Classic flip-to-reveal cards. Rate your recall 1-4.',
    icon: '📝',
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    description: 'Test with 4 options. Great for recognition practice.',
    icon: '📋',
  },
  {
    id: 'timed',
    name: 'Speed Challenge',
    description: '5-minute race! Earn points for quick, correct answers.',
    icon: '⏱️',
  },
  {
    id: 'mixed',
    name: 'Mixed Mode',
    description: 'Random mix of all formats for variety.',
    icon: '🎲',
  },
]

export default function StudyModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: StudyModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          disabled={disabled}
          className={`p-4 rounded-lg border-2 text-left transition-all ${
            selectedMode === mode.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{mode.icon}</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{mode.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{mode.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
