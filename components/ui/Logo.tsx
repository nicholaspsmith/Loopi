import Image from 'next/image'
import Link from 'next/link'

/**
 * Loopi Logo Component
 *
 * Displays the brand logo with optional text.
 * Links to the home/goals page.
 */

interface LogoProps {
  /** Show text next to the logo */
  showText?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
}

const sizeMap = {
  sm: { logo: 24, text: 'text-lg' },
  md: { logo: 32, text: 'text-xl sm:text-2xl' },
  lg: { logo: 48, text: 'text-2xl sm:text-3xl' },
}

export default function Logo({ showText = true, size = 'md', className = '' }: LogoProps) {
  const { logo, text } = sizeMap[size]

  return (
    <Link href="/goals" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/favicon.svg"
        alt="Loopi logo"
        width={logo}
        height={logo}
        className="flex-shrink-0"
        priority
      />
      {showText && (
        <span className={`font-bold text-gray-900 dark:text-gray-100 ${text}`}>Loopi</span>
      )}
    </Link>
  )
}
