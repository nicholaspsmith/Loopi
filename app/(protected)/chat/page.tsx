import { redirect } from 'next/navigation'

/**
 * Chat Page (Deprecated)
 *
 * The chat-based interface has been replaced by goal-based learning.
 * Redirects to the goals page.
 */

export const metadata = {
  title: 'Redirecting... - MemoryLoop',
}

export default function ChatPage() {
  redirect('/goals')
}
