'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navigation Component
 *
 * Tab-based navigation for goal-based learning platform.
 * Highlights active tab based on current route.
 */

interface NavLink {
  href: string
  label: string
  icon?: string
}

const navLinks: NavLink[] = [
  { href: '/goals', label: 'Goals', icon: '🎯' },
  { href: '/progress', label: 'Progress', icon: '📊' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav
      className="flex space-x-1 -mb-px overflow-x-auto"
      role="navigation"
      aria-label="Main navigation"
    >
      {navLinks.map((link) => {
        const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`
              px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[44px]
              ${
                isActive
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {link.icon && <span className="hidden sm:inline">{link.icon}</span>}
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
