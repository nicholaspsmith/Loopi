'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navigation Component
 *
 * Tab-based navigation between Chat and Quiz sections.
 * Highlights active tab based on current route.
 */

interface NavLink {
  href: string
  label: string
}

const navLinks: NavLink[] = [
  { href: '/chat', label: 'Chat' },
  { href: '/quiz', label: 'Quiz' },
  { href: '/settings', label: 'Settings' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex space-x-1 -mb-px" role="navigation" aria-label="Main navigation">
      {navLinks.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors 
              ${
                isActive
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
