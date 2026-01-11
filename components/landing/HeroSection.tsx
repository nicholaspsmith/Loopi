import Image from 'next/image'
import Link from 'next/link'

/**
 * HeroSection Component
 *
 * Landing page hero section with logo, headline, value proposition,
 * and primary/secondary CTAs. Server component.
 */

export default function HeroSection() {
  return (
    <section className="landing-hero bg-gray-50 dark:bg-gray-900 py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="landing-hero-container max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="landing-hero-logo flex justify-center mb-8">
          <Image
            src="/favicon.svg"
            alt="Loopi - AI-powered skill tree learning platform"
            width={80}
            height={80}
            priority
            className="w-16 h-16 sm:w-20 sm:h-20"
          />
        </div>

        {/* Headline */}
        <h1 className="landing-hero-headline text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Your AI-powered skill tree for learning anything
        </h1>

        {/* Subheadline */}
        <p className="landing-hero-subheadline text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-10">
          Set any learning goal, and Loopi builds your personalized path. Master skills faster with
          AI-generated content and science-backed spaced repetition.
        </p>

        {/* CTA Buttons */}
        <div className="landing-hero-ctas flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/signup"
            aria-label="Create a free Loopi account"
            className="landing-hero-cta-primary w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            aria-label="Sign in to your existing Loopi account"
            className="landing-hero-cta-secondary w-full sm:w-auto px-8 py-3 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-semibold transition-colors duration-200 text-center"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}
