import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
