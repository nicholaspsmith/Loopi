import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Note: env validation moved to runtime (instrumentation.ts)
// Build-time validation caused issues in CI where env vars aren't available

const nextConfig: NextConfig = {
  // Enable standalone output only for Docker (not needed on Vercel)
  ...(process.env.VERCEL !== '1' && { output: 'standalone' }),

  // Performance optimizations
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // Skip TypeScript errors during Vercel build to reduce memory
  // (typecheck runs separately in CI)
  typescript: {
    ignoreBuildErrors: process.env.VERCEL === '1',
  },
}

// Wrap with Sentry configuration
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'nicksmithsoftware',

  project: 'loopi-next',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Disable widened source maps to reduce memory usage
  widenClientFileUpload: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
