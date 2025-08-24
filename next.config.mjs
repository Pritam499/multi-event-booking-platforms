// import { withPayload } from '@payloadcms/next/withPayload'

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   // Your Next.js config here
//   webpack: (webpackConfig) => {
//     webpackConfig.resolve.extensionAlias = {
//       '.cjs': ['.cts', '.cjs'],
//       '.js': ['.ts', '.tsx', '.js', '.jsx'],
//       '.mjs': ['.mts', '.mjs'],
//     }

//     return webpackConfig
//   },
// }

// export default withPayload(nextConfig, { devBundleServerPackages: false })

import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better performance on Vercel
  output: 'standalone',
  
  // Image optimization settings
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'production', // Disable optimization if using external storage
  },
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Webpack configuration
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // Externalize certain packages for better bundle size
    webpackConfig.externals = [
      ...(webpackConfig.externals || []),
      { 
        sharp: 'commonjs sharp',
        'node:fs': 'commonjs node:fs',
        'node:path': 'commonjs node:path'
      }
    ]

    return webpackConfig
  },
  
  // Experimental features (optional)
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: ['sharp', 'pg', 'pg-hstore']
  }
}

export default withPayload(nextConfig, { 
  // For Vercel, you might want to keep this false for better performance
  devBundleServerPackages: false 
})