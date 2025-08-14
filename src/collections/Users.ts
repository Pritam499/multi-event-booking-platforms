import type { CollectionConfig, AccessArgs } from 'payload'
import type { User } from '@/payload-types'
import { tenantAdmin } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    // Users can only read users from their own tenant
    read: ({ req }: AccessArgs<User>) => {
      if (!req.user) return false
      // returns a filter limiting read results to the user's tenant
      return {
        tenant: {
          equals: (req.user as any).tenant,
        },
      }
    },
    // Only tenant admins can create/update/delete users for their tenant
    create: tenantAdmin,
    update: tenantAdmin,
    delete: tenantAdmin,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Organizer', value: 'organizer' },
        { label: 'Attendee', value: 'attendee' },
      ],
      defaultValue: 'attendee',
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
