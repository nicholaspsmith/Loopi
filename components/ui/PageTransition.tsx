'use client'

import { usePathname } from 'next/navigation'

/**
 * PageTransition Component
 *
 * Provides smooth 300ms fade transitions between pages.
 *
 * Features:
 * - 300ms fade transition with ease-out timing
 * - Interruptible transitions
 * - Respects prefers-reduced-motion
 *
 * Usage: Wrap children in protected layout
 */

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="animate-fadeIn">
      {children}
    </div>
  )
}
