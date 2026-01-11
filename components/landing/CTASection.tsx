import Link from 'next/link'

/**
 * CTASection Component
 *
 * Final call-to-action section for the landing page.
 * Uses accent background to stand out from other sections.
 * Server component.
 */

export default function CTASection() {
  return (
    <section className="landing-cta bg-blue-600 dark:bg-blue-700 py-16 sm:py-24">
      <div className="landing-cta-container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2 className="landing-cta-headline text-3xl sm:text-4xl font-bold text-white mb-8">
          Ready to start learning?
        </h2>

        {/* CTA Button */}
        <Link
          href="/signup"
          aria-label="Create a free Loopi account"
          className="landing-cta-button inline-block px-8 py-3 bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-lg transition-colors duration-200"
        >
          Create Free Account
        </Link>
      </div>
    </section>
  )
}
