import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()

  // Redirect authenticated users to chat, unauthenticated to login
  if (session) {
    redirect('/chat')
  } else {
    redirect('/login')
  }
}
