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
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex space-x-1 border-b border-gray-200 -mb-px" role="navigation" aria-label="Main navigation">
      {navLinks.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
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
