// collections/Events.ts
import type { CollectionConfig } from 'payload';

export const Events: CollectionConfig = {
  slug: 'events',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'richText' },
    { name: 'date', type: 'date', required: true },
    { name: 'capacity', type: 'number', required: true, defaultValue: 1 },
    {
      name: 'organizer',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
  ],
  timestamps: true,
};
