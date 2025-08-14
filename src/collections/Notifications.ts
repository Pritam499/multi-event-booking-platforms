// src/collections/Notifications.ts
import type { CollectionConfig, AccessArgs } from 'payload'
import type { User } from '@/payload-types'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    // Read:
    // - attendee: only notifications where user == req.user.id
    // - organizer/admin: all notifications in their tenant
    read: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false

      const role = (req.user as any).role
      const tenantId = (req.user as any).tenant
      const userId = (req.user as any).id

      if (role === 'attendee') {
        // attendee -> only their own notifications
        return {
          and: [
            {
              user: {
                equals: userId,
              },
            },
          ],
        }
      }

      // organizer/admin -> all notifications for their tenant
      return {
        and: [
          {
            tenant: {
              equals: tenantId,
            },
          },
        ],
      }
    },

    // Created by backend hooks (system). For API create/update/delete, restrict to tenant admins/organizers
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'booking',
      type: 'relationship',
      relationTo: 'bookings',
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Booking Confirmed', value: 'booking_confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Waitlist Promoted', value: 'waitlist_promoted' },
        { label: 'Booking Canceled', value: 'booking_canceled' },
      ],
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
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
