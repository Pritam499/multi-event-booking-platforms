import type { CollectionConfig, AccessArgs } from 'payload'
import type { User } from '@/payload-types'
import { tenantAdmin, tenantOrganizer } from '@/access'

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'id',
  },
  access: {
    // Read:
    // - organizer/admin => all bookings for their tenant
    // - attendee => only their own bookings
    read: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role
      const tenantId = (req.user as any).tenant

      if (role === 'admin' || role === 'organizer') {
        return {
          and: [
            {
              tenant: {
                equals: tenantId,
              },
            },
          ],
        }
      }

      // attendee: only their own bookings
      return {
        and: [
          {
            user: {
              equals: (req.user as any).id,
            },
          },
        ],
      }
    },

    // Create booking:
    // - Attendee can create only for themselves (data.user must equal req.user.id)
    // - Admin/Organizer can create bookings for tenant (rare) — allowing here
    create: ({ req, data }: AccessArgs<User>) => {
      if (!req.user) return false
      const role = (req.user as any).role

      // Attendee must create only for themselves
      if (role === 'attendee') {
        // data.user may be a relation id or object; check string equality
        const requestedUserId = (data as any).user
        return requestedUserId === (req.user as any).id
      }

      // Organizer/Admin can create (assumed within tenant)
      return role === 'organizer' || role === 'admin'
    },

    // Update / Delete: only organizer or admin of the tenant
    update: tenantOrganizer,
    delete: tenantAdmin,
  },
  fields: [
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
      name: 'status',
      type: 'select',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlisted', value: 'waitlisted' },
        { label: 'Canceled', value: 'canceled' },
      ],
      defaultValue: 'waitlisted',
      required: true,
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
