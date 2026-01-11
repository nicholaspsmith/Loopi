import type { ReactNode } from 'react'

/**
 * BenefitsSection Component
 *
 * Landing page section showcasing Loopi's key benefits.
 * Server component with responsive grid layout.
 */

interface Benefit {
  id: string
  title: string
  description: string
  icon: ReactNode
}

const benefits: Benefit[] = [
  {
    id: 'skill-trees',
    title: 'AI-Powered Skill Trees',
    description:
      'Tell Loopi what you want to learn, and it creates a structured skill tree breaking down complex topics into manageable steps.',
    icon: (
      <svg
        className="landing-benefit-icon w-12 h-12 text-blue-600 dark:text-blue-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M24 8v32m0-32l8 8m-8-8l-8 8m8 16l8 8m-8-8l-8 8M8 24h32M8 24l8-8m-8 8l8 8m16-16l8 8m-8-8l8-8"
        />
      </svg>
    ),
  },
  {
    id: 'spaced-repetition',
    title: 'Spaced Repetition',
    description:
      'Using the FSRS algorithm, Loopi schedules reviews at optimal intervals so you remember what you learn forever.',
    icon: (
      <svg
        className="landing-benefit-icon w-12 h-12 text-green-600 dark:text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="16" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M24 12v12l8 4" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'learn-anything',
    title: 'Learn Anything',
    description:
      'From programming to languages, cooking to music theory—Loopi adapts to any subject you want to master.',
    icon: (
      <svg
        className="landing-benefit-icon w-12 h-12 text-purple-600 dark:text-purple-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <rect x="8" y="12" width="32" height="24" rx="2" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 20h16M16 28h10" />
        <circle cx="34" cy="28" r="2" fill="currentColor" />
      </svg>
    ),
  },
]

export default function BenefitsSection() {
  return (
    <section className="landing-benefits py-16 sm:py-24 bg-white dark:bg-gray-800">
      <div className="landing-benefits-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="landing-benefits-heading text-3xl sm:text-4xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12 sm:mb-16">
          Why Loopi?
        </h2>

        <div className="landing-benefits-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className={`landing-benefit landing-benefit-${benefit.id} flex flex-col items-center text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700`}
            >
              <div className="landing-benefit-icon-wrapper mb-4">{benefit.icon}</div>
              <h3 className="landing-benefit-title text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {benefit.title}
              </h3>
              <p className="landing-benefit-description text-gray-600 dark:text-gray-400 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
