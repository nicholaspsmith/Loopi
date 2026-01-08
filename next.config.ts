import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Validate required environment variables at build time
import './lib/env'

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Performance optimizations
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Exclude packages with native dependencies from bundling (Next.js 15+)
  serverExternalPackages: ['@lancedb/lancedb'],
}

// Wrap with Sentry configuration
export default withSentryConfig(nextConfig, {
  // Sentry organization and project (required for source maps)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps for readable stack traces
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress Sentry CLI output in CI
  silent: !process.env.CI,

  // Disable telemetry
  telemetry: false,

  // Tree-shake Sentry debug logging in production
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
  },
})
