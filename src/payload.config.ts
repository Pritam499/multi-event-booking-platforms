// src/payload.config.ts
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Tenants } from '@/app/(payload)/collections/Tenants';
import { Users } from '@/app/(payload)/collections/Users';
import { Events } from '@/app/(payload)/collections/Events';
import { Bookings } from '@/app/(payload)/collections/Bookings';
import { Notifications } from '@/app/(payload)/collections/Notifications';
import { BookingLogs } from '@/app/(payload)/collections/BookingLogs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
  },
  collections: [
    // --- Core ---
    {
      ...Tenants,
      admin: { ...Tenants.admin, group: 'Core' },
    },
    {
      ...Users,
      admin: { ...Users.admin, group: 'Core' },
    },

    // --- Event Management ---
    {
      ...Events,
      admin: { ...Events.admin, group: 'Event Management' },
    },
    {
      ...Bookings,
      admin: { ...Bookings.admin, group: 'Event Management' },
    },

    // --- System Logs ---
    {
      ...Notifications,
      admin: { ...Notifications.admin, group: 'System Logs' },
    },
    {
      ...BookingLogs,
      admin: { ...BookingLogs.admin, group: 'System Logs' },
    },
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // Add SSL for production
      ...(process.env.NODE_ENV === 'production' ? { ssl: { rejectUnauthorized: false } } : {}),
    },
  }),
  sharp,
});