import { redirect } from 'next/navigation'

/**
 * Quiz Page (Deprecated)
 *
 * The standalone quiz interface has been replaced by goal-based study modes.
 * Redirects to the goals page where users can start study sessions.
 */

export const metadata = {
  title: 'Redirecting... - MemoryLoop',
}

export default function QuizPage() {
  redirect('/goals')
}
