import type { CollectionConfig } from 'payload'
import { anyone } from '../access/anyone'
import { tenantAdmin, tenantOrganizer } from '@/access'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    // anyone can read categories (change to tenant-only if you want)
    read: anyone,
    // only admins/organizers can create/update/delete categories
    create: ({ req }) => {
      if (!req.user) return false
      const role = (req.user as any).role
      return role === 'admin' || role === 'organizer'
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = (req.user as any).role
      return role === 'admin' || role === 'organizer'
    },
    delete: tenantAdmin,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    // uses your slug field helper which returns an array of fields
    ...slugField(),
  ],
  timestamps: true,
}
