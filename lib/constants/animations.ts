/**
 * Shared animation duration constants
 * Used to synchronize TypeScript timeouts with CSS animations
 */
export const ANIMATION_DURATIONS = {
  /** Card flip animation duration in ms */
  CARD_FLIP: 600,
  /** Page fade-in transition duration in ms */
  PAGE_TRANSITION: 300,
  /** Card slide navigation animation duration in ms */
  CARD_SLIDE: 300,
} as const

/** CSS custom properties for animations (in CSS time format) */
export const CSS_ANIMATION_VARS = {
  '--animation-card-flip': '600ms',
  '--animation-page-transition': '300ms',
  '--animation-card-slide': '300ms',
} as const
