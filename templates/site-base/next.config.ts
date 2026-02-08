import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack configuration
  experimental: {
    reactCompiler: false,
  },
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // TypeScript checking handled by separate command
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
}

export default withPayload(nextConfig)
