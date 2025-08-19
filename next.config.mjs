import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    // ✅ Add SCSS support
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1,
            modules: false,
          },
        },
        {
          loader: 'sass-loader',
          options: {
            sassOptions: {
              quietDeps: true, // hide warnings from Payload’s node_modules
            },
          },
        },
      ],
    })

    return config
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
