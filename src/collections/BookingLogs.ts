import type { CollectionConfig, AccessArgs } from 'payload'
import type { User } from '@/payload-types'

// Booking logs are internal audit. Attendees generally should not read logs; managers/admins can.
export const BookingLogs: CollectionConfig = {
  slug: 'booking-logs',
  admin: {
    useAsTitle: 'action',
  },
  access: {
    // Read: only organizer/admins for the tenant
    read: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role
      if (role === 'admin' || role === 'organizer') {
        return {
          tenant: {
            equals: (req.user as any).tenant,
          },
        }
      }
      // attendees cannot read booking logs
      return false
    },

    // Create: only organizer/admin (backend hooks may write logs — hooks run with system privileges)
    create: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role
      return role === 'admin' || role === 'organizer'
    },

    update: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role
      return role === 'admin' || role === 'organizer'
    },

    delete: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role
      return role === 'admin' || role === 'organizer'
    },
  },
  fields: [
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Create Request', value: 'create_request' },
        { label: 'Auto Waitlist', value: 'auto_waitlist' },
        { label: 'Auto Confirm', value: 'auto_confirm' },
        { label: 'Promote from Waitlist', value: 'promote_from_waitlist' },
        { label: 'Cancel Confirmed', value: 'cancel_confirmed' },
      ],
      required: true,
    },
    {
      name: 'note',
      type: 'text',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  timestamps: true,
}
