'use client'

import { useState } from 'react'

/**
 * ActivitySquare Component
 *
 * Individual activity day square with hover tooltip for unified Activity calendar.
 * Supports both past activity (green) and future reviews (orange).
 */

interface ActivityDay {
  date: string
  cardsStudied: number
  minutesSpent: number
  cardsDue?: number // For future days
}

interface ActivitySquareProps {
  day: ActivityDay
  isLoading?: boolean
}

export default function ActivitySquare({ day, isLoading = false }: ActivitySquareProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Determine if this is a past, present, or future day
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dayDate = new Date(day.date)
  dayDate.setHours(0, 0, 0, 0)

  const isFuture = dayDate > today
  const isToday = dayDate.getTime() === today.getTime()

  // Calculate intensity and colors based on whether it's past or future
  let intensity: number
  let bgColors: string[]
  let hoverRingColor: string

  if (isFuture) {
    // Future days: orange palette for upcoming reviews
    const cardsDue = day.cardsDue || 0
    intensity = cardsDue === 0 ? 0 : Math.min(4, Math.ceil(cardsDue / 5))
    bgColors = [
      'bg-gray-100 dark:bg-gray-700',
      'bg-orange-200 dark:bg-orange-900/40',
      'bg-orange-300 dark:bg-orange-800/50',
      'bg-orange-400 dark:bg-orange-700/60',
      'bg-orange-500 dark:bg-orange-600/70',
    ]
    hoverRingColor = 'hover:ring-orange-500'
  } else {
    // Past/today: green palette for completed activity
    intensity = day.cardsStudied === 0 ? 0 : Math.min(4, Math.ceil(day.cardsStudied / 5))
    bgColors = [
      'bg-gray-100 dark:bg-gray-700',
      'bg-green-200 dark:bg-green-900/40',
      'bg-green-300 dark:bg-green-800/50',
      'bg-green-400 dark:bg-green-700/60',
      'bg-green-500 dark:bg-green-600/70',
    ]
    hoverRingColor = 'hover:ring-green-500'
  }

  // Loading state: show neutral gray with subtle pulse
  const loadingClass = isLoading
    ? 'animate-pulse bg-gray-200 dark:bg-gray-600'
    : bgColors[intensity]

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTooltipContent = () => {
    if (isFuture) {
      // Future day: show upcoming reviews
      const cardsDue = day.cardsDue || 0
      if (cardsDue === 0) {
        return 'No reviews scheduled'
      }
      const cardText = cardsDue === 1 ? 'card' : 'cards'
      return `${cardsDue} ${cardText} due for review`
    } else {
      // Past/today: show completed activity
      if (day.cardsStudied === 0 && (!isToday || !day.cardsDue)) {
        return 'No activity'
      }

      const parts: string[] = []

      if (day.cardsStudied > 0) {
        const cardText = day.cardsStudied === 1 ? 'card' : 'cards'
        const minText = day.minutesSpent === 1 ? 'minute' : 'minutes'
        parts.push(`${day.cardsStudied} ${cardText} reviewed`)
        parts.push(`${day.minutesSpent} ${minText}`)
      }

      // For today, also show cards due if available
      if (isToday && day.cardsDue && day.cardsDue > 0) {
        const cardText = day.cardsDue === 1 ? 'card' : 'cards'
        parts.push(`${day.cardsDue} ${cardText} due`)
      }

      return parts.join(' • ') || 'No activity'
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      role="group"
      aria-label={`${formatTooltipDate(day.date)}: ${getTooltipContent()}`}
      tabIndex={0}
    >
      <div
        className={`aspect-square rounded text-center flex items-center justify-center cursor-pointer transition-all ${loadingClass} ${isToday && !isLoading && 'ring-2 ring-blue-500'} ${!isLoading && `hover:ring-2 ${hoverRingColor} hover:ring-offset-1`}`}
      >
        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
          {new Date(day.date).getDate()}
        </span>
      </div>

      {/* Tooltip - only show when not loading */}
      {isHovered && !isLoading && (
        <div
          className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-gray-100 bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          role="tooltip"
        >
          {/* Arrow pointing down */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 dark:bg-gray-900 rotate-45"></div>

          {/* Tooltip content */}
          <div className="relative">
            <div className="font-medium text-gray-100">{formatTooltipDate(day.date)}</div>
            <div className="text-gray-300 mt-0.5">{getTooltipContent()}</div>
          </div>
        </div>
      )}
    </div>
  )
}
