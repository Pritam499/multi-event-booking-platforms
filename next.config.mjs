import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVE this line - it causes symlink issues on Windows
  // output: 'standalone',
  
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    webpackConfig.externals = [
      ...(webpackConfig.externals || []),
      { 
        sharp: 'commonjs sharp',
        'node:fs': 'commonjs node:fs'
      }
    ]

    return webpackConfig
  },
}

export default withPayload(nextConfig, { 
  devBundleServerPackages: false 
})