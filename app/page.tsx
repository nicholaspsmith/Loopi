import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function Home() {
  const session = await auth()

  // Redirect authenticated users to goals, unauthenticated to login
  if (session) {
    redirect('/goals')
  } else {
    redirect('/login')
  }
}
