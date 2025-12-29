import type { NextConfig } from 'next'

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

export default nextConfig
