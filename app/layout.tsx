import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProvider from '@/components/auth/SessionProvider'

export const metadata: Metadata = {
  title: {
    default: 'MemoryLoop',
    template: '%s | MemoryLoop',
  },
  description: 'Flashcard learning platform with spaced repetition',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased bg-gray-50 dark:bg-gray-900 h-full">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
