/**
 * StudyNowButton Component (T024)
 *
 * Green action button to start guided study flow
 * Displays play icon and loading state
 */

interface StudyNowButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
}

export default function StudyNowButton({
  onClick,
  loading = false,
  disabled = false,
  className = '',
}: StudyNowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={`px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {/* Play icon */}
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </>
      )}
    </button>
  )
}
