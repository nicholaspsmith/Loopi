import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MemoryLoop',
  description: 'Claude-powered flashcard learning platform with spaced repetition',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
