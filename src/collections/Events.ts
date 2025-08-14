import type { CollectionConfig } from 'payload';
import { authenticatedOrPublished, tenantOrganizer, tenantAdmin } from '@/access';

export const Events: CollectionConfig = {
  slug: 'events',
  access: {
    read: authenticatedOrPublished,
    create: tenantOrganizer,
    update: tenantOrganizer,
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
    {
      name: 'description',
      type: 'richText',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'capacity',
      type: 'number',
      required: true,
    },
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users', // must match Users.slug
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants', // must match Tenants.slug
      required: true,
    },
  ],
  timestamps: true,
};
