import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { HeroSection, BenefitsSection, HowItWorksSection, CTASection } from '@/components/landing'

export const metadata: Metadata = {
  title: 'Loopi - AI-Powered Skill Trees for Learning Anything',
  description:
    'Set any learning goal, and Loopi builds your personalized path. Master skills faster with AI-generated content and science-backed spaced repetition.',
  openGraph: {
    title: 'Loopi - AI-Powered Skill Trees for Learning Anything',
    description:
      'Set any learning goal, and Loopi builds your personalized path. Master skills faster with AI-generated content and science-backed spaced repetition.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loopi - AI-Powered Skill Trees for Learning Anything',
    description:
      'Master skills faster with AI-generated content and science-backed spaced repetition.',
  },
}

export default async function Home() {
  const session = await auth()

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/goals')
  }

  // Show landing page for unauthenticated users
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      <main id="main-content" className="landing-page min-h-screen bg-gray-50 dark:bg-gray-900">
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
        <CTASection />
      </main>
    </>
  )
}
