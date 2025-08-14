// payload.config.ts
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { buildConfig, type PayloadRequest, type PayloadHandler } from 'payload'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'

// Collections (typed imports)
import type { CollectionConfig } from 'payload'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Tenants } from './collections/Tenants'
import { Events } from './collections/Events'
import { Bookings } from './collections/Bookings'
import { Notifications } from './collections/Notifications'
import { BookingLogs } from './collections/BookingLogs'

// <-- ADD THESE TWO LINES (Pages and Posts collections) -->
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'

/* Plugins & Utilities */
import { plugins } from './plugins'
import { defaultLexical } from './fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

// Endpoints (your existing endpoint functions — left unchanged)
import dashboard from './endpoints/dashboard'
import markNotificationRead from './endpoints/markNotificationRead'
import myNotifications from './endpoints/myNotifications'
import bookEvent from './endpoints/bookEvent'
import cancelBooking from './endpoints/cancelBooking'
import myBookings from './endpoints/myBookings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeLogin: [path.resolve(dirname, 'components/BeforeLogin')],
      beforeDashboard: [path.resolve(dirname, 'components/BeforeDashboard')],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },

  editor: defaultLexical,

  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
    },
  }),

  collections: [
    Tenants,
    Users,
    Events,
    Bookings,
    Notifications,
    BookingLogs,
    Categories,
    // <- include Posts and Pages so 'pages' relationship is valid for richtext link feature
    Posts,
    Pages,
    Media,
  ] as CollectionConfig[],

  cors: [getServerSideURL()].filter(Boolean),

  plugins: [
    ...plugins,
    vercelBlobStorage({
      collections: {
        [Media.slug]: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || '',
    }),
  ],

  secret: process.env.PAYLOAD_SECRET,
  sharp,

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // cast handlers if your endpoint functions don't match PayloadHandler exactly
  endpoints: [
    { path: '/book-event', method: 'post', handler: bookEvent as unknown as PayloadHandler },
    { path: '/cancel-booking', method: 'post', handler: cancelBooking as unknown as PayloadHandler },
    { path: '/my-bookings', method: 'get', handler: myBookings as unknown as PayloadHandler },
    { path: '/my-notifications', method: 'get', handler: myNotifications as unknown as PayloadHandler },
    { path: '/notifications/:id/read', method: 'post', handler: markNotificationRead as unknown as PayloadHandler },
    { path: '/dashboard', method: 'get', handler: dashboard as unknown as PayloadHandler },
  ],

  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (req.user) return true
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
