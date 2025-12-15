import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProvider from '@/components/auth/SessionProvider'

export const metadata: Metadata = {
  title: {
    default: 'MemoryLoop',
    template: '%s | MemoryLoop',
  },
  description: 'Claude-powered flashcard learning platform with spaced repetition',
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
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
