import { Flashcard } from '@/types/db'
import { getCardStateDescription } from '@/lib/fsrs/scheduler'

/**
 * FlashcardPreview Component
 *
 * Displays a single flashcard's question and answer
 */

interface FlashcardPreviewProps {
  flashcard: Flashcard
  showFSRSState?: boolean
}

export default function FlashcardPreview({
  flashcard,
  showFSRSState = false,
}: FlashcardPreviewProps) {
  const stateLabel = getCardStateDescription(flashcard.fsrsState)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Question
          </h4>
          <p className="text-base font-medium text-gray-900">{flashcard.question}</p>
        </div>

        {showFSRSState && (
          <span
            className={`ml-2 px-2 py-1 text-xs font-medium rounded ${
              flashcard.fsrsState.state === 0
                ? 'bg-blue-100 text-blue-700'
                : flashcard.fsrsState.state === 2
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            {stateLabel}
          </span>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Answer</h4>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{flashcard.answer}</p>
      </div>

      {showFSRSState && flashcard.fsrsState.reps > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {flashcard.fsrsState.reps} review{flashcard.fsrsState.reps === 1 ? '' : 's'}
            {flashcard.fsrsState.lapses > 0 &&
              ` • ${flashcard.fsrsState.lapses} lapse${flashcard.fsrsState.lapses === 1 ? '' : 's'}`}
          </p>
        </div>
      )}
    </div>
  )
}
