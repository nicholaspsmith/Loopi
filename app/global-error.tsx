'use client'

/**
 * Global Error Boundary
 *
 * Catches unhandled errors in the App Router and reports them to Sentry.
 * This component is rendered when an error occurs in a layout or template.
 */

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
